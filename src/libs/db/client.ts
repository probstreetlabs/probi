import { Pool } from 'pg';
import { ENV } from '@/config/env';
import { logger } from '@/libs/logger';

export const dbPool = new Pool({
	connectionString: ENV.DATABASE_URL,
	max: 10,
});

dbPool.on('connect', () => {
	logger.info('database connected successfully');
});

dbPool.on('error', (err) => {
	logger.error({ err }, 'database connection failed');
	process.exit(1);
});

export const query = async (text: string, params: any[]) => {
	const start = Date.now();
	try {
		const res = await dbPool.query(text, params);
		const duration = Date.now() - start;
		logger.info(
			{
				query: text,
				duration,
				rows: res.rowCount,
			},
			'Executed query'
		);
		return res;
	} catch (err) {
		logger.error({ err, query: text, params }, 'Query failed');
		throw err;
	}
};
