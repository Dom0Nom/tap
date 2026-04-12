# tap — stock paper-trading bot design

**Status:** draft for review
**Date:** 2026-04-12
**Scope:** v1 of the `tap` stock paper-trading bot. The sibling prediction-market bot is explicitly out of scope and will be designed separately when v1 lands.

## 1. Summary

`tap` is a local, single-process Python application that runs a daily S&P 500 paper-trading loop and exposes everything through a Textual TUI styled as mission control. The bot uses a multi-signal scoring approach: deterministic price/volume indicators carry the trading decision, while an LLM contributes headline-sentiment signals as a tiebreaker. The LLM never pulls the trigger.

Three operating modes share one decision code path:

- **Backtest** — runs the strategy against historical daily bars and writes results to the ledger
- **Paper-live** — once per day after close, pulls fresh bars from Alpaca, computes signals, submits orders to Alpaca's paper endpoint
- **TUI** — mission-control interface reading from the ledger; can trigger runs via keybindings

The critical invariant is that backtest and paper-live call the exact same signal, scoring, sizing, and order-generation code. Only the data source and the broker adapter differ.

## 2. Goals and non-goals

### Goals

- Trade the S&P 500 universe on daily bars, once per day, via Alpaca paper
- Combine deterministic price signals with LLM headline sentiment in a scoring framework
- Produce trustworthy backtests with explicit lookahead guards
- Terminal-first mission-control UI that feels like `k9s`/`htop`, not a web dashboard
- Persist every run, signal, order, and fill to a local ledger for audit and metrics
- Structure the codebase so the eventual prediction-market bot can share `tap/core/` primitives

### Non-goals (explicit)

- Real-money trading
- Intraday bars or tick data
- Shorting, options, futures
- Portfolio optimization (mean-variance, Black-Litterman, etc.)
- Multi-account or multi-broker
- Cloud deployment, web server, authentication
- Alerting infrastructure beyond local logs and exit codes

## 3. Architecture

### 3.1 Package layout

```
tap/
  core/          shared primitives (clock, llm client, logging)
  data/          bars, universe, news fetchers and storage
  signals/       pure signal functions
  strategy/      scoring and entry/exit rules
  risk/          volatility sizing, stops, portfolio caps
  broker/        Alpaca paper adapter + simulated broker for backtests
  backtest/      historical runner and metrics
  ledger/        SQLite models and repository
  tui/           Textual mission-control app
  cli.py         typer entrypoint
```

Import graph flows inward: `tui → strategy → signals → data`. Nothing flows outward. The core subpackage is shared-by-design with the future prediction-market sibling; the other subpackages are stock-specific.

### 3.2 Operating modes

| Mode | Command | Data source | Broker | Output |
|---|---|---|---|---|
| Backtest | `tap backtest --from 2015-01-01 --to 2024-12-31 --strategy momentum_rsi` | Parquet + cached news | `broker.simulated` | Ledger Run, metrics summary |
| Paper-live | `tap run` | Alpaca live + Alpaca news | `broker.alpaca_paper` | Ledger Run, submitted orders |
| TUI | `tap` or `tap tui` | Ledger only | None | Mission-control UI |

## 4. Components

### 4.1 `tap/core/`

- **`clock.py`** — single source of "now." Returns a `datetime` and an `as_of_date`. Real clock in live mode, injected fake clock in backtests. Every downstream module takes the clock as a parameter; nothing reads wall-clock time directly.
- **`llm.py`** — thin wrapper over the Anthropic/OpenAI client with structured output parsing, retries (3×, exponential backoff), and a local response cache keyed on `(prompt_hash, model)`. The cache lives on disk so reruns of a backtest never re-call the LLM.
- **`logging.py`** — structured JSON logs to `~/.tap/logs/tap.jsonl` (rotated daily) plus an in-process ring buffer the TUI subscribes to for the live log pane.

### 4.2 `tap/data/`

- **`bars.py`** — fetches daily OHLCV from Alpaca, stores to `data/bars/{ticker}.parquet`, handles incremental updates. Reads back as a wide pandas frame (rows = dates, columns = tickers).
- **`universe.py`** — S&P 500 membership with point-in-time accuracy so backtests are free of survivorship bias.
- **`news.py`** — pulls headlines from Alpaca's news endpoint (Benzinga-sourced), stores to SQLite keyed on `(ticker, created_at, headline_hash)`. `created_at` is the publication timestamp, never the crawl timestamp.

### 4.3 `tap/signals/`

All signal functions are pure: `(bars_frame, as_of) → signal_series`. No I/O, no hidden state.

- **`momentum.py`** — 12-1 cross-sectional momentum: return from t-252 to t-21, ranked across the universe
- **`mean_reversion.py`** — RSI(2), gated by `SPY close > SPY 200-SMA`; emits −1/0/+1 rather than raw RSI
- **`sentiment.py`** — takes a list of headlines and an `as_of` cutoff, calls `core.llm` for 3-class classification (bullish/neutral/bearish), aggregates sum-clipped to [−1, +1] per ticker
- **`registry.py`** — signals register themselves so the strategy layer iterates without hardcoding

### 4.4 `tap/strategy/`

- **`base.py`** — `Strategy` protocol: `generate_orders(as_of, portfolio, bars) → list[Order]`
- **`scoring.py`** — weighted-sum scorer with config-driven weights (default: momentum 40%, mean-reversion 40%, sentiment 20%)
- **`momentum_rsi.py`** — the v1 strategy. Pre-filters the S&P 500 with momentum + RSI to ~20 candidates, runs LLM sentiment on survivors only, ranks, returns target portfolio

### 4.5 `tap/risk/`

- **`sizing.py`** — volatility-targeted position sizes: `dollar_size = target_risk × capital / stdev_20d`, where `target_risk = 1% of capital`
- **`stops.py`** — hard stops at 2×ATR below entry; signal-flip exits computed in the strategy layer
- **`portfolio.py`** — enforces max 10 concurrent positions and aggregate risk caps

### 4.6 `tap/broker/`

- **`base.py`** — `Broker` protocol: `submit_order`, `cancel_order`, `get_positions`, `get_account`
- **`alpaca_paper.py`** — adapter for Alpaca's paper endpoint. Generates deterministic client order IDs from `(run_id, ticker)` so retries never double-submit.
- **`simulated.py`** — in-memory broker for backtests. Fills at next-day open with configurable slippage (default 5 bps).

### 4.7 `tap/backtest/`

- **`engine.py`** — walks the date range day-by-day, advances the fake clock, calls the strategy with point-in-time bars, routes orders to the simulated broker, records to the ledger
- **`metrics.py`** — Sharpe, Sortino, max drawdown, hit rate, turnover, average holding period

### 4.8 `tap/ledger/`

SQLite + SQLAlchemy. The only module that touches the database.

Tables:
- **`Run`** — `id, mode, started_at, ended_at, status, config_hash, notes`
- **`SignalSnapshot`** — `run_id, as_of, ticker, signal_name, value`
- **`Order`** — `run_id, client_order_id, ticker, side, qty, kind, status, submitted_at, rejection_reason`
- **`Fill`** — `order_id, filled_at, qty, price`
- **`Position`** — `run_id, ticker, qty, avg_price, opened_at, closed_at`
- **`EquitySnapshot`** — `run_id, as_of, cash, equity, positions_value`

### 4.9 `tap/tui/`

Textual application. Layout:

- **Header** — mode indicator, clock, current run status pill
- **Watchlist panel** — top-N tickers by current combined score
- **Positions panel** — current holdings with unrealized P&L and stop levels
- **Orders panel** — today's submitted orders, color-coded by status
- **Signal scoreboard** — matrix of tickers × signals with values
- **Log pane** — live tail of structured logs (ring buffer)
- **Equity sparkline** — trailing 60-day equity curve

Keybindings:
- `r` — trigger `run` in a subprocess
- `b` — open backtest screen
- `q` — quit
- `?` — help

The TUI reads from the ledger and the log ring buffer. It never executes trading logic itself.

### 4.10 `tap/cli.py`

Typer entrypoint: `tap run`, `tap backtest`, `tap tui` (default), `tap data sync`.

## 5. Data flow — the daily run

1. **Resolve `as_of`.** `clock` returns today's market close time. In backtests, the engine supplies the fake date.
2. **Update universe.** `data.universe` returns point-in-time S&P 500 membership.
3. **Update bars.** `data.bars` fetches any missing bars through `as_of` and returns a wide frame. No-op in backtest mode.
4. **Compute deterministic signals.** `signals.momentum` and `signals.mean_reversion` return signal series for `as_of`.
5. **Pre-filter.** Strategy combines deterministic signals into a preliminary score and keeps the top ~20 candidates.
6. **LLM sentiment on survivors.** `data.news` pulls headlines with `created_at < close_time(as_of)`; `signals.sentiment` classifies and aggregates. Cache hits make reruns free.
7. **Final scoring.** Weighted combination writes one row per ticker to `SignalSnapshot`.
8. **Risk sizing.** `risk.sizing` computes volatility-targeted dollar sizes from 20-day stdev; `risk.portfolio` caps at 10 positions.
9. **Reconcile.** Fetch current broker positions, diff against target, generate buy/sell orders and stop updates.
10. **Submit.** Broker adapter receives orders. Simulated broker fills at next-day open with slippage; Alpaca paper fills on Alpaca's schedule.
11. **Record.** Ledger writes Run, SignalSnapshot, Order, Fill (when confirmed), EquitySnapshot.
12. **Exit.** Process ends. Cron or manual invocation triggers the next run.

**Lookahead guards (explicit):**
- Step 3: include only bars with date ≤ `as_of`
- Step 6: include only headlines with `created_at` strictly before `as_of` market close
- Step 8: stdev computed from bars strictly before `as_of`

These three guards are the difference between a credible backtest and fantasy. Each has dedicated property-based tests.

**Backtest/live invariant:** steps 4–9 use identical code. A `if backtest:` branch inside `strategy/` or `risk/` is a bug.

## 6. Error handling and observability

### 6.1 Failure philosophy

The daily run is idempotent and resumable. If it crashes midway, the next run must not double-submit orders and the ledger must remain consistent. Every write is transactional; `Run.status` tracks `started`/`completed`/`failed`.

### 6.2 Failure modes

| Mode | Handling |
|---|---|
| Alpaca API down or rate-limited | Exponential backoff (3× at 1s/4s/16s), then fail loudly; run marked `failed`; TUI shows red banner |
| LLM call fails | Retries 3×, then sentiment = 0 for that ticker (neutral fallback); logged WARN; deterministic signals still drive the decision |
| Partial bar data (delisted ticker) | Signal returns NaN; ticker drops from ranking silently; logged INFO |
| Order rejected by Alpaca | `Order.status = 'rejected'` with reason; run continues for remaining orders; TUI shows in red |
| Crash mid-submission | Next run reconciles against Alpaca's order history; duplicate detection via deterministic client order IDs |
| Stale bars (laptop offline for days) | `data.bars` refuses to run strategy on stale data; error + halt |
| LLM cache miss/corruption | Best-effort; cache errors recompute; never blocks |
| Backtest lookahead bug | Dedicated property-based tests feed future-dated data and assert it's excluded |

### 6.3 Observability

Three layers:

1. **Structured logs** (`~/.tap/logs/tap.jsonl`) — every signal computation, order, LLM call with tokens/cost. Grepable and replayable.
2. **Ledger tables** — the source of truth for what happened. TUI and metrics read from here.
3. **TUI live log pane** — ring-buffer tail of the structured log, updated in real time during a run.

No alerting, no metrics server, no tracing. A local paper bot doesn't need them; if we think we do, scope has drifted.

## 7. Testing strategy

### 7.1 Layers

**Unit tests — signal correctness.** Hand-crafted bar fixtures with known expected outputs. RSI(2) on a specific 10-day sequence, 12-1 momentum on a synthetic trend, 200-SMA gate flipping. Fast, no I/O, no network.

**Integration tests — end-to-end daily run.** Runs the full pipeline against a frozen fixture of bars + headlines using `broker.simulated` and a pre-populated LLM cache. Asserts:
- Correct orders for known-state input
- Ledger rows written (Run, Orders, SignalSnapshots)
- Idempotency: two runs with same `as_of` produce identical output
- Lookahead guards active: injected future data is excluded
- Reconciliation after a simulated mid-run crash produces no duplicates

**Backtest-as-regression.** A canonical backtest (2020–2023 on a fixed 50-ticker subset with a checked-in LLM cache) runs in CI and asserts the final equity curve matches a snapshot within tolerance. Catches subtle behavior changes from refactors.

### 7.2 LLM testing

LLMs never hit the real API in tests. Three patterns:
- Unit tests for `core.llm`: mock the client, assert request shape and parsing
- Signal tests for `sentiment.py`: stub the `core.llm` wrapper with canned classifications
- Integration tests: pre-populate the cache with fixture entries so the real code path runs but the call is a cache hit

### 7.3 Highest-risk areas (tested hardest)

- Lookahead guards (property-based with `hypothesis`)
- Idempotency of the daily run
- Order reconciliation after simulated crashes

### 7.4 Not tested

- Textual TUI visuals (manual). The ledger tests cover the data the TUI displays.
- CLI argument parsing beyond smoke tests.

### 7.5 Coverage

80% minimum on `signals/`, `strategy/`, `risk/`, `backtest/`, `ledger/`. TUI and CLI excluded from the target.

### 7.6 Tooling

`pytest`, `pytest-asyncio`, `hypothesis`, `syrupy`. No heavy mocking frameworks; real objects with fake adapters at the edges.

## 8. Configuration

A single `config.toml` in the project root:

```toml
[universe]
index = "SP500"

[strategy]
name = "momentum_rsi"
weights = { momentum = 0.4, mean_reversion = 0.4, sentiment = 0.2 }
pre_filter_size = 20
max_positions = 10

[risk]
target_risk_per_position = 0.01
stop_atr_multiple = 2.0

[broker]
mode = "alpaca_paper"

[llm]
model = "claude-haiku-4-5"
cache_dir = "~/.tap/llm-cache"

[data]
bars_dir = "data/bars"
news_db = "data/news.sqlite"
ledger_db = "data/ledger.sqlite"
```

Secrets (Alpaca API keys, LLM API keys) live in `~/.tap/secrets.env`, loaded at startup. Never in config or git.

## 9. Open questions

None identified in v1 scope. Items deferred to v2:

- Earnings surprise / PEAD as a fourth signal (stronger evidence than LLM sentiment; needs earnings estimate data source)
- Intraday bars
- Shorting
- Multi-strategy portfolio overlay
- The prediction-market sibling project (designed separately)

## 10. Signal evidence summary

For traceability, the v1 signal set was selected based on replicated academic evidence:

- **12-1 cross-sectional momentum** — Jegadeesh & Titman 1993; Asness, Moskowitz, Pedersen 2013. Known failure: momentum crashes in sharp reversals (Daniel & Moskowitz 2016).
- **RSI(2) mean-reversion with 200-SMA gate** — Jegadeesh 1990, Lehmann 1990; popularized by Connors. Decayed post-2010 but still non-zero on daily S&P 500; the trend gate is non-negotiable to avoid catching falling knives.
- **LLM headline sentiment** — Lopez-Lira & Tang 2023 showed edge but mostly in small caps; Glasserman & Mamaysky 2023 and others pushed back once point-in-time timestamps were enforced. Treated as tiebreaker on large caps, not primary alpha.

**Honest expectation:** published backtest edges typically lose 30–50% of Sharpe in live trading. v1 builds the framework; sizing stays small; claims stay humble.
