import { ENV } from '@/config/env';
import { logger } from '@/libs/logger';
import { query } from '@/libs/db/client';
import { EVENTS } from '@/config/constants';
import { pushToQueue } from '@/libs/redis/queue';
import { MarketSnapshot, BotOrder, OrderBook } from '@/types';

export class Watcher {
	static async scanAllMarkets(): Promise<MarketSnapshot[]> {
		logger.debug('Scanning for active markets...');

		const res = await pushToQueue(EVENTS.GET_ACTIVE_MARKETS, {});

		if (!res.success || !res.data) {
			logger.warn('Failed to fetch active markets from engine');
			return [];
		}

		const activeMarkets: any[] = res.data;

		if (activeMarkets.length === 0) {
			logger.debug('No active markets found');
			return [];
		}

		logger.debug(`Found ${activeMarkets.length} active markets. Fetching orderbooks and positions...`);

		const balanceRes = await query('SELECT amount, locked FROM wallets WHERE user_id = $1', [ENV.BOT_USER_ID]);

		const wallet = balanceRes.rows[0];

		if (!wallet) {
			logger.warn('Bot wallet not found in DB'); 
			return [];
		}

		const snapshots: MarketSnapshot[] = [];

		for (const m of activeMarkets) {
			try {
				const obRes = await pushToQueue(EVENTS.GET_MARKET_WITH_SYMBOL, { symbol: m.symbol });

				if (!obRes.success || !obRes.data) {
					logger.warn({ symbol: m.symbol }, 'Failed to fetch orderbook');
					continue;
				}

				const orderbook: OrderBook = {
					yes: obRes.data.Yes || [],
					no: obRes.data.No || [],
				};

				const ordersRes = await query(
					`SELECT id, market_id, order_id, price, quantity, filled, side, action 
					 FROM orders 
					 WHERE user_id = $1 AND market_id = $2 AND status = 'PENDING'`,
					[ENV.BOT_USER_ID, m.marketId]
				);

				const botActiveOrders: BotOrder[] = ordersRes.rows.map((row) => ({
					id: row.id,
					market_id: row.market_id,
					order_id: row.order_id,
					price: Number(row.price),
					quantity: row.quantity,
					filled: row.filled,
					side: row.side,
					action: row.action,
				}));

				const posRes = await query(
					`SELECT yes_locked, no_locked FROM stock_balances WHERE user_id = $1 AND market_id = $2`,
					[ENV.BOT_USER_ID, m.marketId]
				);
				
				const botPositions = {
					yes: posRes.rows.length ? posRes.rows[0].yes_locked : 0,
					no: posRes.rows.length ? posRes.rows[0].no_locked : 0,
				};

				snapshots.push({
					marketId: m.marketId,
					symbol: m.symbol,
					title: m.title,
					yesPrice: m.yesPrice,
					noPrice: m.noPrice,
					volume: m.volume,
					numberOfTraders: m.numberOfTraders,
					orderbook,
					botActiveOrders,
					botPositions,
				});
			} catch (err) {
				logger.error({ err, symbol: m.symbol }, 'Failed to build snapshot for market');
			}
		}

		return snapshots;
	}
}
