import { ENV } from '@/config/env';
import { logger } from '@/libs/logger';
import { query } from '@/libs/db/client';
import { MarketSnapshot, PriceQuantity } from '@/types';

export class RiskManager {
	static async validateOrders(
		snapshot: MarketSnapshot,
		yesBids: PriceQuantity[],
		noBids: PriceQuantity[]
	): Promise<{ approvedYes: PriceQuantity[]; approvedNo: PriceQuantity[] }> {
		
		const res = await query('SELECT amount FROM wallets WHERE user_id = $1', [ENV.BOT_USER_ID]);
		const balance = res.rows.length ? Number(res.rows[0].amount) : 0;

		let cost = 0;
		for (const bid of yesBids) cost += bid.price * bid.quantity;
		for (const bid of noBids) cost += bid.price * bid.quantity;

		if (cost > balance) {
			logger.warn({ cost, balance }, 'Risk: Insufficient balance to place all orders');
			return this.reduceOrdersToFitBalance(yesBids, noBids, balance);
		}

		let totalYesExposure = snapshot.botPositions.yes;
		for (const bid of yesBids) totalYesExposure += bid.quantity;

		let totalNoExposure = snapshot.botPositions.no;
		for (const bid of noBids) totalNoExposure += bid.quantity;

		if (totalYesExposure > ENV.MAX_POSITION_PER_MARKET || totalNoExposure > ENV.MAX_POSITION_PER_MARKET) {
			logger.warn({ totalYesExposure, totalNoExposure }, 'Risk: Position limit would be exceeded. Scaling down.');
			return { approvedYes: [], approvedNo: [] };
		}

		return { approvedYes: yesBids, approvedNo: noBids };
	}

	private static reduceOrdersToFitBalance(
		yesBids: PriceQuantity[],
		noBids: PriceQuantity[],
		balance: number
	): { approvedYes: PriceQuantity[]; approvedNo: PriceQuantity[] } {
		let currentCost = 0;
		const approvedYes: PriceQuantity[] = [];
		const approvedNo: PriceQuantity[] = [];

		for (let i = 0; i < Math.max(yesBids.length, noBids.length); i++) {
			if (i < yesBids.length) {
				const bid = yesBids[i];
				if (bid) {
					const cost = bid.price * bid.quantity;
					if (currentCost + cost <= balance / 2) {
						approvedYes.push(bid);
						currentCost += cost;
					}
				}
			}
			if (i < noBids.length) {
				const bid = noBids[i];
				if (bid) {
					const cost = bid.price * bid.quantity;
					if (currentCost + cost <= balance / 2) {
						approvedNo.push(bid);
						currentCost += cost;
					}
				}
			}
		}

		return { approvedYes, approvedNo };
	}
}
