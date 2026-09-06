import { ENV } from '@/config/env';
import { askAI } from '@/services/ai';
import { logger } from '@/libs/logger';
import { ruleBasedDecision } from '@/services/rules';
import { MarketSnapshot, Decision } from '@/types';

export class Decider {
	static async evaluate(snapshot: MarketSnapshot): Promise<Decision> {
		const score = this.calculateAnomalyScore(snapshot);
		
		logger.debug({ symbol: snapshot.symbol, score }, 'Market anomaly score');

		if (score >= ENV.AI_ANOMALY_THRESHOLD) {
			logger.warn({ symbol: snapshot.symbol, score }, 'High anomaly score, consulting AI');
			const aiDecision = await askAI(snapshot, this.getAnomalyReasons(snapshot));
			if (aiDecision) {
				return aiDecision;
			}
			logger.warn('AI fallback failed or returned null, falling back to rules');
		}

		return ruleBasedDecision(snapshot);
	}

	private static calculateAnomalyScore(snapshot: MarketSnapshot): number {
		let score = 0;
		const { yes, no } = snapshot.orderbook;

		if (yes.length === 0 || no.length === 0) {
			score += 3;
		}

		const yesTop = yes.length > 0 && yes[0] ? yes[0].price : 5;
		const noTop = no.length > 0 && no[0] ? no[0].price : 5;
		const spread = 10 - (yesTop + noTop);
		if (Math.abs(spread) > 4) {
			score += 2;
		}

		const totalPos = snapshot.botPositions.yes + snapshot.botPositions.no;
		if (totalPos > 1000) {
			const yesPct = snapshot.botPositions.yes / totalPos;
			if (yesPct > 0.8 || yesPct < 0.2) {
				score += 2;
			}
		}

		return score;
	}

	private static getAnomalyReasons(snapshot: MarketSnapshot): string {
		const reasons: string[] = [];
		const { yes, no } = snapshot.orderbook;

		if (yes.length === 0 || no.length === 0) {
			reasons.push('One or both sides of the orderbook are empty.');
		}

		const yesTop = yes.length > 0 && yes[0] ? yes[0].price : null;
		const noTop = no.length > 0 && no[0] ? no[0].price : null;
		if (yesTop !== null && noTop !== null) {
			const spread = 10 - (yesTop + noTop);
			if (Math.abs(spread) > 4) {
				reasons.push(`The spread is extremely wide or mismatched (Yes: ${yesTop}, No: ${noTop}).`);
			}
		}

		const totalPos = snapshot.botPositions.yes + snapshot.botPositions.no;
		if (totalPos > 1000) {
			const yesPct = snapshot.botPositions.yes / totalPos;
			if (yesPct > 0.8) reasons.push('Bot is heavily over-exposed on YES side (>80%).');
			if (yesPct < 0.2) reasons.push('Bot is heavily over-exposed on NO side (>80%).');
		}

		return reasons.join(' ');
	}
}
