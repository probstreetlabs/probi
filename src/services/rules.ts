import { MarketSnapshot, Decision } from '@/types';

export const ruleBasedDecision = (snapshot: MarketSnapshot): Decision => {
	// For MVP, if we use rules, we almost always just want to REBALANCE
	// the orderbook to ensure our standard depth exists.
	
	return {
		action: 'REBALANCE',
		reason: 'Standard liquidity maintenance',
		source: 'rules',
	};
};
