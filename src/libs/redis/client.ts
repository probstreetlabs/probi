import Redis from 'ioredis';
import { ENV } from '@/config/env';
import { logger } from '@/libs/logger';

export const redisClient = new Redis({
	host: ENV.REDIS_HOST,
	port: Number(ENV.REDIS_PORT),
	db: 0,
});

redisClient.on('connect', () => {
	logger.info('Connected to Redis main client');
});

redisClient.on('error', (err) => {
	logger.error({ err }, 'Redis main client connection error');
});

export const pubsubClient = new Redis({
	host: ENV.REDIS_PUBSUB_HOST,
	port: Number(ENV.REDIS_PUBSUB_PORT),
	db: 0,
});

pubsubClient.on('connect', () => {
	logger.info('Connected to Redis Pub/Sub client');
});

pubsubClient.on('error', (err) => {
	logger.error({ err }, 'Redis Pub/Sub client connection error');
});
