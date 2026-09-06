import { ENV } from '@/config/env';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/libs/logger';
import { query } from '@/libs/db/client';
import { RiskManager } from '@/services/risk';
import { pushToQueue } from '@/libs/redis/queue';
import { EVENTS, ROLE } from '@/config/constants';
import { calculateTargetBook } from '@/services/calculator';
import { MarketSnapshot, Decision, PriceQuantity } from '@/types';

export class Doer {
	/**
	 * Cancels stale orders and executes new orders based on decision
	 */
	static async execute(snapshot: MarketSnapshot, decision: Decision) {
		logger.debug({ symbol: snapshot.symbol, action: decision.action }, 'Executing decision');

		// 1. Calculate the ideal target orderbook
		const targetBook = calculateTargetBook(snapshot, decision);

		// 2. Validate against risk limits
		const { approvedYes, approvedNo } = await RiskManager.validateOrders(snapshot, targetBook.yesBids, targetBook.noBids);

		// 3. Cancel existing active bot orders
		await this.cancelExistingOrders(snapshot);

		// 4. Place new orders
		if (approvedYes.length > 0 || approvedNo.length > 0) {
			await this.placeOrders(snapshot, approvedYes, approvedNo);
		}

		// 5. Wash trading simulation (if requested by decision or small random chance)
		if (Math.random() < 0.1) {
			await this.simulateTrade(snapshot);
		}
	}

	private static async cancelExistingOrders(snapshot: MarketSnapshot) {
		for (const order of snapshot.botActiveOrders) {
			const res = await pushToQueue(EVENTS.CANCEL_ORDER, {
				UserId: ENV.BOT_USER_ID,
				OrderId: order.order_id,
				MarketId: snapshot.marketId,
				Symbol: snapshot.symbol,
			});

			if (res.success) {
				// Mark as cancelled in DB
				await query('UPDATE orders SET status = $1 WHERE id = $2', ['CANCELLED', order.id]);
			}
		}
	}

	private static async placeOrders(snapshot: MarketSnapshot, yesBids: PriceQuantity[], noBids: PriceQuantity[]) {
		const placeOrder = async (side: 'YES' | 'NO', bid: PriceQuantity) => {
			const orderId = uuidv4();
			
			const res = await pushToQueue(EVENTS.PLACE_ORDER, {
				OrderId: orderId,
				UserId: ENV.BOT_USER_ID,
				MarketId: snapshot.marketId,
				Symbol: snapshot.symbol,
				Role: ROLE,
				Price: bid.price,
				Quantity: bid.quantity,
				Side: side,
				Action: 'BUY',
				OrderType: 'LIMIT',
			});

			if (res.success) {
				// Insert into DB to track
				await query(
					`INSERT INTO orders (id, user_id, market_id, order_id, price, quantity, filled, side, action, status) 
					 VALUES ($1, $2, $3, $4, $5, $6, 0, $7, 'BUY', 'PENDING')`,
					[uuidv4(), ENV.BOT_USER_ID, snapshot.marketId, orderId, bid.price, bid.quantity, side]
				);
			} else {
				logger.warn({ symbol: snapshot.symbol, side, res }, 'Failed to place limit order');
			}
		};

		for (const bid of yesBids) {
			await placeOrder('YES', bid);
		}

		for (const bid of noBids) {
			await placeOrder('NO', bid);
		}
	}

	private static async simulateTrade(snapshot: MarketSnapshot) {
		// Randomly place a market order against the bot's own resting limit orders
		const side = Math.random() > 0.5 ? 'YES' : 'NO';
		const quantity = Math.floor(Math.random() * 3) + 1; // 1 to 3 shares

		const orderId = uuidv4();
		logger.debug({ symbol: snapshot.symbol, side, quantity }, 'Simulating wash trade to show activity');
		
		await pushToQueue(EVENTS.PLACE_ORDER, {
			OrderId: orderId,
			UserId: ENV.BOT_USER_ID,
			MarketId: snapshot.marketId,
			Symbol: snapshot.symbol,
			Role: ROLE,
			Price: side === 'YES' ? 10 : 10, // Market order
			Quantity: quantity,
			Side: side,
			Action: 'BUY',
			OrderType: 'MARKET',
		});
		// No need to track market orders closely in DB as they execute immediately and won't be "PENDING"
	}
}
