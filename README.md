# Probi - Probstreet Liquidity Bot

Probi is an AI-powered liquidity provision bot designed for the **Probstreet** prediction market platform. 

It ensures that orderbooks always have healthy depth, tight spreads, and fair prices. It uses advanced quantitative finance models (like Avellaneda-Stoikov) to manage its inventory risk while selectively consulting AI to handle extreme market anomalies.

## Key Features

* **Micro-Price Tracking:** Probi doesn't just look at the last traded price. It calculates a volume-weighted "Micro-Price" based on the actual active resting limit orders, making it highly responsive to orderbook depth.
* **Smart Inventory Management:** Using Avellaneda-Stoikov principles, the bot automatically shifts its pricing ladder if it accumulates too much risk. (e.g., If it holds too many `YES` shares, it lowers its prices to make selling `YES` more attractive to traders, naturally dumping its excess inventory).
* **AI Anomaly Detection:** In normal markets, Probi uses pure, gas-saving mathematical formulas. However, if it detects an anomaly (like a completely empty orderbook, massive spread mismatches, or dangerous risk exposure), it flags the event and consults an LLM to make a strategic decision.
* **Auto-Rebalancing:** Constantly cancels and replaces outdated limit orders to maintain a predefined liquidity curve around the true market price.

## How it Works

1. **Observe:** The `Watcher` service scans the PostgreSQL primary database to take a snapshot of the current orderbook, traded prices, and its own portfolio balance/inventory.
2. **Decide:** The `Decider` service calculates an anomaly score. If the market is acting weirdly, it asks the AI for a decision. Otherwise, it decides to mathematically rebalance the book.
3. **Calculate:** The `Calculator` uses quantitative models to figure out the exact prices and quantities to quote to maintain the spread while keeping inventory risk low.
4. **Execute:** The `Doer` cancels old resting orders and pushes the new orders directly to the Redis matching engine queue.

## Setup & Usage

### Prerequisites
- [Bun](https://bun.sh/) installed.
- Probstreet PostgreSQL database & Redis running.

### Configuration
Environment variables should be placed in a `.env` file:
```env
# Bot Setup
BOT_USER_ID=b0000000-0000-4000-8000-000000000001
BOT_INITIAL_BALANCE=100000

# Timing
TICK_INTERVAL_MS=30000

# Database
DATABASE_URL=postgres://user:pass@localhost:5432/primary-database

# Redis Queue
REDIS_URL=redis://localhost:6379

# AI
GEMINI_API_KEY=your_api_key_here
AI_ANOMALY_THRESHOLD=5
```

You can tweak the bot's liquidity curve, spread, and risk limits inside `src/config/levels.ts`.

### Running the Bot

Install dependencies:
```bash
bun install
```

Start the bot:
```bash
bun start
```

## License

MIT
