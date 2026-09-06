// Defines the distribution of orders on the orderbook
export const BASE_SPREAD = 0.5;

// Weighting for quantities at each price level outwards from the midpoint
export const QUANTITY_CURVE = [
	0.1, // Edge (further away)
	0.3, // Mid-distance
	1.0, // Center (closest to midpoint)
	0.3, // Mid-distance
	0.1, // Edge
];

export const BASE_QUANTITY = 50; // Base shares for center level
