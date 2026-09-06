import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

const dbPool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

const BOT_USER_ID = 'b0000000-0000-4000-8000-000000000001';
const EMAIL_ADDRESS = "probi@probstreet.com";

async function seedBot() {
	console.log('Seeding Bot User in database...');

	const client = await dbPool.connect();

	try {
		await client.query('BEGIN');
		
		const res = await client.query('SELECT id FROM users WHERE id = $1', [BOT_USER_ID]);
		
		if (res.rows.length === 0) {
			await client.query(
				`INSERT INTO users (id, name, username, email, role, created_at, updated_at) 
				 VALUES ($1, $2, $3, $4, 'USER', NOW(), NOW())`,
				[BOT_USER_ID, 'Probi (Liquidity Bot)', 'probi', EMAIL_ADDRESS]
			);

			await client.query(
				`INSERT INTO wallets (id, user_id, amount, locked, created_at, updated_at) 
				 VALUES ($1, $2, 1000000, 0, NOW(), NOW())`,
				[uuidv4(), BOT_USER_ID]
			);
			console.log('✅ Bot user and wallet created.');
		} else {
			console.log('Bot user already exists. Skipping creation.');
		}

		await client.query('COMMIT');
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
		await dbPool.end();
	}
}

seedBot().catch((err) => {
	console.error('Failed to seed bot:', err);
	process.exit(1);
});
