# tap

Algorithmic paper-trading bot for US equities. TypeScript monorepo: a strategy library with backtesting engine, and a real-time trading dashboard.

## Strategy

Monthly-rebalanced cross-sectional momentum (blended 6-1/9-1/12-1) with an RSI(2) mean-reversion overlay gated by the SPY 200-day regime filter, and optional LLM-based news sentiment. Risk layer: volatility-targeted position sizing, gross-profitability quality filter, sector concentration caps, correlation-adjusted sizing, and portfolio-level volatility scaling (Barroso & Santa-Clara 2015).

## Packages

- `packages/lib` — signals, risk, strategy, backtest engine, SQLite bar store, Alpaca market data + paper trading, CLI
- `packages/web` — Next.js dashboard: candlestick chart, equity curve, signal heatmap, positions, order blotter

## Usage

```sh
pnpm install
pnpm test           # run the test suite (vitest)
pnpm dev            # start the dashboard
./scripts/run-backtest.sh
./scripts/paper-trade.sh
```

Live data requires Alpaca paper-trading keys in `~/.tap/secrets.env` (`ALPACA_KEY_ID`, `ALPACA_SECRET_KEY`); the backtest runs against cached bars.
