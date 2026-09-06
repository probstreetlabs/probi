import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/libs/logger';
import { redisClient, pubsubClient } from '@/libs/redis/client';

type QueueResponse = {
	success: boolean;
	message: string;
	data?: any;
};

export const pushToQueue = (eventType: string, data: unknown, timeoutMs = 5000): Promise<QueueResponse> => {
	return new Promise((resolve) => {
		const responseId = uuidv4();
		const responseKey = `engine:response:${responseId}`;
		let isResolved = false;
		const timeout = setTimeout(async () => {
			if (!isResolved) {
				isResolved = true;
				await pubsubClient.unsubscribe(responseKey);
				logger.warn({ eventType, responseId }, 'Queue request timed out');
				resolve({
					success: false,
					message: 'Timeout waiting for engine response',
				});
			}
		}, timeoutMs);
		pubsubClient.subscribe(responseKey, (err) => {
			if (err) {
				clearTimeout(timeout);
				if (!isResolved) {
					isResolved = true;
					logger.error({ err, eventType, responseId }, 'Failed to subscribe to response key');
					resolve({
						success: false,
						message: 'Failed to subscribe to engine response',
					});
				}
				return;
			}
			const payload = {
				responseId,
				eventType,
				data,
			};
			redisClient.lpush('engine:queue', JSON.stringify(payload)).catch((err) => {
				clearTimeout(timeout);
				if (!isResolved) {
					isResolved = true;
					pubsubClient.unsubscribe(responseKey);
					logger.error({ err, eventType, responseId }, 'Failed to push payload to engine queue');
					resolve({
						success: false,
						message: 'Failed to push payload to engine queue',
					});
				}
			});
		});
		const messageHandler = (channel: string, message: string) => {
			if (channel === responseKey && !isResolved) {
				clearTimeout(timeout);
				isResolved = true;
				pubsubClient.unsubscribe(responseKey);
				pubsubClient.off('message', messageHandler);
				try {
					const response = JSON.parse(message);
					if (response.Status === 'success' || response.Status === 'Success') {
						resolve({
							success: true,
							message: response.Message,
							data: response.Data,
						});
					} else {
						resolve({
							success: false,
							message: response.Message,
							data: response.Data,
						});
					}
				} catch (err) {
					logger.error({ err, message, responseId }, 'Failed to parse engine response');
					resolve({
						success: false,
						message: 'Invalid response from engine',
					});
				}
			}
		};
		pubsubClient.on('message', messageHandler);
	});
};