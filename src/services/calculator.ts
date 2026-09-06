import { MarketSnapshot, Decision, PriceQuantity } from '@/types';
import { BASE_SPREAD, QUANTITY_CURVE, BASE_QUANTITY } from '@/config/levels';

type TargetBook = {
	yesBids: PriceQuantity[];
	noBids: PriceQuantity[];
};

export const calculateTargetBook = (snapshot: MarketSnapshot, decision: Decision): TargetBook => {
	if (decision.action === 'HOLD' || decision.action === 'REMOVE') {
		return { yesBids: [], noBids: [] };
	}

	let midpoint = (snapshot.yesPrice + (10 - snapshot.noPrice)) / 2;
	if (isNaN(midpoint) || midpoint <= 0 || midpoint >= 10) {
		midpoint = 5;
	}

	const spread = BASE_SPREAD;
	const numLevels = QUANTITY_CURVE.length;
	const halfLevels = Math.floor(numLevels / 2);

	const yesBids: PriceQuantity[] = [];
	const noBids: PriceQuantity[] = [];

	const bias = decision.adjustments?.biasDirection;

	for (let i = 0; i < numLevels; i++) {
		const offset = (i - halfLevels) * spread;
		
		let yesPrice = midpoint + offset - spread;
		let noPrice = (10 - midpoint) + offset - spread;

		yesPrice = clampPrice(yesPrice);
		noPrice = clampPrice(noPrice);

		const curveValue = QUANTITY_CURVE[i] || 0;
		let yesQty = Math.floor(BASE_QUANTITY * curveValue);
		let noQty = Math.floor(BASE_QUANTITY * curveValue);

		if (bias === 'YES') {
			yesQty = Math.floor(yesQty * 1.5);
			noQty = Math.floor(noQty * 0.5);
		} else if (bias === 'NO') {
			yesQty = Math.floor(yesQty * 0.5);
			noQty = Math.floor(noQty * 1.5);
		}

		if (yesQty > 0) yesBids.push({ price: Number(yesPrice.toFixed(1)), quantity: yesQty });
		if (noQty > 0) noBids.push({ price: Number(noPrice.toFixed(1)), quantity: noQty });
	}

	return { yesBids, noBids };
};

const clampPrice = (price: number): number => {
	if (price < 0.5) return 0.5;
	if (price > 9.5) return 9.5;
	return price;
};
