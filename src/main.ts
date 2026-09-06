import { ENV } from '@/config/env';
import { logger } from '@/libs/logger';
import { Doer } from '@/services/doer';
import { EVENTS } from '@/config/constants';
import { Decider } from '@/services/decider';
import { Watcher } from '@/services/watcher';
import { pushToQueue } from '@/libs/redis/queue';

async function startBot() {
	logger.info('Starting probi market maker bot...');

	logger.info('Registering bot in matching engine...');

	await pushToQueue(EVENTS.CREATE_USER, {
		id: ENV.BOT_USER_ID,
		name: 'Probi (Liquidity Bot)',
		username: 'probi',
		phone: '0000000000',
		kycVerificationStatus: 'VERIFIED',
		paymentVerificationStatus: 'VERIFIED',
	});

	await pushToQueue(EVENTS.INIT_BALANCE, {
		userId: ENV.BOT_USER_ID,
		amount: ENV.BOT_INITIAL_BALANCE,
		locked: 0,
	});

	logger.info('Bot registered. Starting processMarketCycle loop...');

	// Run main loop every TICK_INTERVAL_MS (e.g. 30s)
	// Using setInterval instead of node-cron for exact milliseconds control
	setInterval(async () => {
		try {
			await processMarket();
		} catch (err) {
			logger.error({ err }, 'Tick failed');
		}
	}, ENV.TICK_INTERVAL_MS);

	// Run immediately once
	processMarket().catch(err => logger.error({ err }, 'Initial processMarketCycle failed'));
}

async function processMarket() {
	logger.debug('--- TICK START ---');

	const snapshots = await Watcher.scanAllMarkets();

	for (const snapshot of snapshots) {
		const decision = await Decider.evaluate(snapshot);

		await Doer.execute(snapshot, decision);
	}

	logger.debug('--- TICK END ---');
}

startBot().catch((err) => {
	logger.error({ err }, 'Fatal error during startBot');
	process.exit(1);
});