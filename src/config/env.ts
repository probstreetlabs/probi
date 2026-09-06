import { z } from 'zod';

const envSchema = z.object({
	NODE_ENV: z.enum(['development', 'production', 'staging']).default('development'),

	DATABASE_URL: z.string().min(1),

	REDIS_HOST: z.string().min(1),
	REDIS_PORT: z.string().min(1),

	REDIS_PUBSUB_HOST: z.string().min(1),
	REDIS_PUBSUB_PORT: z.string().min(1),

	BOT_USER_ID: z.string().uuid(),
	BOT_INITIAL_BALANCE: z.optional(z.string()).transform((val) => Number(val)).default(1000000),

	GEMINI_API_KEY: z.string().min(1),

	TICK_INTERVAL_MS: z.string().transform((val) => Number(val)).default(30000),
	AI_ANOMALY_THRESHOLD: z.string().transform((val) => Number(val)).default(3),
	MAX_POSITION_PER_MARKET: z.string().transform((val) => Number(val)).default(20000),
	MAX_TOTAL_EXPOSURE: z.string().transform((val) => Number(val)).default(500000),
});

const parsed = envSchema.safeParse(Bun.env);

if (!parsed.success) {
	const issues = parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
	console.error(`\nInvalid environment variables:\n${issues}\n`);
	process.exit(1);
}

export const ENV = parsed.data;
