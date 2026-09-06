export type PriceQuantity = {
	price: number;
	quantity: number;
};

export type OrderBook = {
	yes: PriceQuantity[];
	no: PriceQuantity[];
};

export type BotOrder = {
	id: string;
	market_id: string;
	order_id: string;
	price: number;
	quantity: number;
	filled: number;
	side: 'YES' | 'NO';
	action: 'BUY' | 'SELL';
};

export type MarketSnapshot = {
	marketId: string;
	symbol: string;
	title: string;
	yesPrice: number;
	noPrice: number;
	volume: number;
	numberOfTraders: number;
	orderbook: OrderBook;
	botActiveOrders: BotOrder[];
	botPositions: { yes: number; no: number };
};

export type Decision = {
	action: 'ADD' | 'REMOVE' | 'HOLD' | 'REBALANCE';
	reason: string;
	source: 'rules' | 'ai';
	adjustments?: {
		biasDirection?: 'YES' | 'NO';
		urgency?: 'low' | 'medium' | 'high';
	};
};
