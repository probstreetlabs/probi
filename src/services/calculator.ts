import { MarketSnapshot, Decision, PriceQuantity } from '@/types';
import { BASE_SPREAD, QUANTITY_CURVE, BASE_QUANTITY, MAX_SKEW, SKEW_START_THRESHOLD } from '@/config/levels';

type TargetBook = {
	yesBids: PriceQuantity[];
	noBids: PriceQuantity[];
};

export const calculateTargetBook = (snapshot: MarketSnapshot, decision: Decision): TargetBook => {
	if (decision.action === 'HOLD' || decision.action === 'REMOVE') {
		return { yesBids: [], noBids: [] };
	}

	const yesBook = snapshot.orderbook.yes;
	const noBook = snapshot.orderbook.no;

	let microPrice = 5;

	if (yesBook.length > 0 && noBook.length > 0) {
		const bestBid = yesBook[0];
		const bestNoBid = noBook[0];
		
		if (bestBid && bestNoBid) {
			const bestAskPrice = 10 - bestNoBid.price;
			const bestBidPrice = bestBid.price;

			const bidQty = bestBid.quantity;
			const askQty = bestNoBid.quantity;

			if (bidQty + askQty > 0 && bestBidPrice < bestAskPrice) {
				microPrice = (bestBidPrice * askQty + bestAskPrice * bidQty) / (bidQty + askQty);
			} else {
				microPrice = (bestBidPrice + bestAskPrice) / 2;
			}
		}
	} else if (yesBook.length > 0 && yesBook[0]) {
		microPrice = yesBook[0].price + 0.5;
	} else if (noBook.length > 0 && noBook[0]) {
		microPrice = (10 - noBook[0].price) - 0.5;
	} else {
		microPrice = (snapshot.yesPrice + (10 - snapshot.noPrice)) / 2;
	}

	if (isNaN(microPrice) || microPrice <= 0 || microPrice >= 10) {
		microPrice = 5;
	}

	const totalPos = snapshot.botPositions.yes + snapshot.botPositions.no;
	let inventoryDeltaPct = 0;
	if (totalPos > SKEW_START_THRESHOLD) {
		inventoryDeltaPct = (snapshot.botPositions.yes - snapshot.botPositions.no) / totalPos;
	}

	let reservationPrice = microPrice - (inventoryDeltaPct * MAX_SKEW);
	reservationPrice = clampPrice(reservationPrice);

	const spread = BASE_SPREAD;
	const numLevels = QUANTITY_CURVE.length;

	const yesBids: PriceQuantity[] = [];
	const noBids: PriceQuantity[] = [];

	for (let i = 0; i < numLevels; i++) {
		let distance = (i + 1) * spread;
		let yesPrice = reservationPrice - distance;
		let noPrice = (10 - reservationPrice) - distance;

		yesPrice = clampPrice(yesPrice);
		noPrice = clampPrice(noPrice);

		const curveValue = QUANTITY_CURVE[i] || 0;
		let yesQty = Math.floor(BASE_QUANTITY * curveValue);
		let noQty = Math.floor(BASE_QUANTITY * curveValue);

		if (yesQty > 0 && yesPrice < reservationPrice) yesBids.push({ price: Number(yesPrice.toFixed(1)), quantity: yesQty });
		if (noQty > 0 && noPrice < (10 - reservationPrice)) noBids.push({ price: Number(noPrice.toFixed(1)), quantity: noQty });
	}

	return { yesBids, noBids };
};

const clampPrice = (price: number): number => {
	if (price < 0.5) return 0.5;
	if (price > 9.5) return 9.5;
	return price;
};
