import { MarketSnapshot, Decision } from '@/types';

export const ruleBasedDecision = (snapshot: MarketSnapshot): Decision => {
	// For MVP, if we use rules, we almost always just want to REBALANCE
	// the orderbook to ensure our standard depth exists.
	
	const totalPos = snapshot.botPositions.yes + snapshot.botPositions.no;
	let biasDirection: 'YES' | 'NO' | undefined = undefined;

	if (totalPos > 500) {
		const yesPct = snapshot.botPositions.yes / totalPos;
		if (yesPct > 0.6) biasDirection = 'NO'; // We have too much YES, bias towards NO
		if (yesPct < 0.4) biasDirection = 'YES';
	}

	return {
		action: 'REBALANCE',
		reason: 'Standard liquidity maintenance',
		source: 'rules',
		adjustments: {
			biasDirection,
		}
	};
};
