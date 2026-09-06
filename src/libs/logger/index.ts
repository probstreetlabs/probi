import pino from 'pino';
import { ENV } from '@/config/env';

export const logger = pino({
	level: ENV.NODE_ENV === 'development' ? 'debug' : 'info',
	transport:
		ENV.NODE_ENV === 'development'
			? {
					target: 'pino-pretty',
					options: {
						colorize: true,
						translateTime: 'SYS:standard',
					},
				}
			: undefined,
});
