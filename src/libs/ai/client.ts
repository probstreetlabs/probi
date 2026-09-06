import { ENV } from '@/config/env';
import { logger } from '@/libs/logger';
import { GoogleGenerativeAI } from '@google/generative-ai';

if (!ENV.GEMINI_API_KEY) {
	logger.warn('GEMINI_API_KEY is not set. AI fallback will fail if anomaly threshold is reached.');
}

export const aiClient = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);

export const model = aiClient.getGenerativeModel({ model: 'gemini-2.5-flash' });
