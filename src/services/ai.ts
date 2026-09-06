import { logger } from '@/libs/logger';
import { model } from '@/libs/ai/client';
import { MarketSnapshot, Decision } from '@/types';

export const askAI = async (snapshot: MarketSnapshot, anomalyContext: string): Promise<Decision | null> => {
	if (!model) return null;

	const prompt = `
You are a market maker bot for a prediction market. Your goal is to maintain liquidity while managing risk.

Market: "${snapshot.title}"
Current Engine Prices - YES: ₹${snapshot.yesPrice}, NO: ₹${snapshot.noPrice}
Bot exposure: ${snapshot.botPositions.yes} YES shares, ${snapshot.botPositions.no} NO shares

Issues detected:
${anomalyContext}

Based on this, what should the bot do?
Respond ONLY with a valid JSON object matching this schema:
{
  "action": "ADD" | "REMOVE" | "HOLD" | "REBALANCE",
  "reason": "one short sentence explaining why"
}
`;

	try {
		const result = await model.generateContent(prompt);
		const text = result.response.text();
		
		const jsonMatch = text.match(/\{[\s\S]*\}/);
		
		if (!jsonMatch) {
			logger.warn({ text }, 'AI response did not contain JSON');
			return null;
		}

		const parsed = JSON.parse(jsonMatch[0]);
		
		if (['ADD', 'REMOVE', 'HOLD', 'REBALANCE'].includes(parsed.action)) {
			return {
				action: parsed.action,
				reason: parsed.reason || 'AI decided',
				source: 'ai',
			};
		}
		return null;
	} catch (err) {
		logger.error({ err }, 'Failed to get decision from Gemini AI');
		return null;
	}
};
