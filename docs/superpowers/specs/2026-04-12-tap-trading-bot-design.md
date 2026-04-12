# tap — stock paper-trading bot design

**Status:** draft for review
**Date:** 2026-04-12
**Scope:** v1 of the `tap` stock paper-trading bot. The sibling prediction-market bot is explicitly out of scope and will be designed separately when v1 lands.
**Python:** 3.11+

## 1. Summary

`tap` is a local, single-process Python application that runs a daily S&P 500 paper-trading loop and exposes everything through a Textual TUI styled as mission control. The bot uses a multi-signal scoring approach: deterministic price/volume indicators carry the trading decision, while an LLM contributes headline-sentiment signals as an optional tiebreaker. The LLM never pulls the trigger.

Three operating modes share one decision code path:

- **Backtest** — runs the strategy against historical data and writes results to the ledger. Two sub-modes: **deterministic-only** (price signals only; any date range) and **full-pipeline** (includes LLM sentiment; limited by news data availability to roughly the last 2–3 years).
- **Paper-live** — once per day after close, pulls fresh bars from Alpaca, computes signals, submits orders to Alpaca's paper endpoint.
- **TUI** — mission-control interface reading from the ledger; can trigger runs via keybindings.

**Critical invariant:** backtest and paper-live call the exact same signal, scoring, sizing, and order-generation code. Only the data source and the broker adapter differ. A `if backtest:` branch inside `strategy/` or `risk/` is a bug.

## 2. Goals and non-goals

### Goals

- Trade the S&P 500 universe on daily bars, once per day, via Alpaca paper
- Combine deterministic price signals with optional LLM headline sentiment in a scoring framework
- Produce trustworthy backtests with explicit lookahead guards and survivorship-bias-free data
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
- Dividend-adjusted total returns (ignored in v1 — ~2%/yr uniform drag, doesn't change relative rankings)
- Database migrations tooling (single-user local SQLite; just drop the file if schema changes in v1)

## 3. Architecture

### 3.1 Package layout

```
tap/
  core/          shared primitives (clock, llm client, logging, types)
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

Import graph flows inward: `tui → strategy → signals → data`. Nothing flows outward. The `core/` subpackage is shared-by-design with the future prediction-market sibling; the other subpackages are stock-specific. We do **not** extract `core/` to a separate distributable package now — that happens when the sibling project actually needs it.

### 3.2 Operating modes

| Mode | Command | Data source | Broker | Sentiment |
|---|---|---|---|---|
| Backtest (deterministic) | `tap backtest --from 2010-01-01 --to 2024-12-31 --no-sentiment` | Parquet bars | `broker.simulated` | Off |
| Backtest (full) | `tap backtest --from 2023-01-01 --to 2024-12-31` | Parquet bars + news DB | `broker.simulated` | On |
| Paper-live | `tap run` | Alpaca live + Alpaca news | `broker.alpaca_paper` | On |
| TUI | `tap` or `tap tui` | Ledger only | None | N/A |

## 4. Components

### 4.1 `tap/core/`

- **`clock.py`** — single source of "now." Returns a `datetime` and an `as_of_date`. Real clock in live mode, injected fake clock in backtests. Every downstream module takes the clock as a parameter; nothing reads wall-clock time directly.
- **`llm.py`** — thin wrapper over the Anthropic/OpenAI client with structured output parsing, retries (3× exponential backoff), and a local response cache keyed on `(prompt_hash, model)`. The cache lives on disk (JSON or sqlite) so reruns of a backtest never re-call the LLM.
- **`logging.py`** — structured JSON logs to `~/.tap/logs/tap.jsonl` (rotated daily) plus an in-process ring buffer the TUI subscribes to for the live log pane.
- **`types.py`** — shared dataclasses (see §4.11).
- **`config.py`** — loads `config.toml` and secrets via `python-dotenv` from `~/.tap/secrets.env`.

### 4.2 `tap/data/`

- **`bars.py`** — fetches daily OHLCV from Alpaca, stores to `data/bars/{ticker}.parquet`, handles incremental updates. Uses Alpaca's **split-adjusted** close. Reads back as a wide pandas frame (rows = dates, columns = tickers). **Must download bars for historical S&P 500 constituents, not just current members**, or backtests are survivorship-biased.
- **`universe.py`** — point-in-time S&P 500 membership. Source: historical Wikipedia snapshots (free, reasonably accurate) committed to the repo as `data/universe/sp500_history.csv` with columns `(ticker, added, removed)`. A helper returns the membership set as of any date. This is the v1 source; a paid feed can replace it later without API changes.
- **`news.py`** — pulls headlines from Alpaca's news endpoint (Benzinga-sourced, ~2–3 year history), stores to SQLite keyed on `(ticker, created_at, headline_hash)`. `created_at` is the publication timestamp, never the crawl timestamp.

### 4.3 `tap/signals/`

All signal functions are pure: `(bars_frame, as_of) → signal_series`. No I/O, no hidden state.

Formal invariant enforced by property-based tests:

```
signal(bars, as_of) == signal(bars[date ≤ as_of], as_of)
```

Signals:

- **`momentum.py`** — 12-1 cross-sectional momentum: return from `t-252` to `t-21`, ranked across the universe. Rebalance cadence is **monthly** at the strategy layer (§4.4), not daily.
- **`mean_reversion.py`** — RSI(2) on each ticker, gated by a **market regime filter**: `SPY close > SPY 200-SMA`. The gate reads SPY's bars, not the individual ticker's. Output is −1/0/+1, not raw RSI.
- **`sentiment.py`** — takes a list of headlines and an `as_of` cutoff, calls `core.llm` for 3-class classification (bullish/neutral/bearish), aggregates sum-clipped to [−1, +1] per ticker.
- **`registry.py`** — signals register themselves so the strategy layer iterates without hardcoding.

### 4.4 `tap/strategy/`

- **`base.py`** — `Strategy` protocol: `generate_orders(as_of, portfolio, bars) → list[Order]`.
- **`scoring.py`** — weighted-sum scorer with config-driven weights (default: momentum 40%, mean-reversion 40%, sentiment 20%).
- **`momentum_rsi.py`** — the v1 strategy:
  - **Entry cadence:** momentum rankings are refreshed daily but new position entries only occur on the first trading day of each month, or when a ticker newly breaks into the top-N by a meaningful margin (configurable threshold). This avoids daily churn on a slow-moving signal.
  - **Exit cadence:** runs every day. Signal-flip and hard stops fire whenever triggered.
  - **Pre-filter:** top `pre_filter_size` candidates by deterministic score (default 20, tunable in config). LLM sentiment runs on survivors only.
  - **Output:** a target portfolio (list of desired positions with target dollar sizes) that the reconcile step diffs against current holdings.

### 4.5 `tap/risk/`

- **`sizing.py`** — volatility-targeted position sizes: `dollar_size = target_risk × capital / stdev_20d`, where `target_risk = 1% of capital`.
- **`stops.py`** — hard stops at 2×ATR below entry; signal-flip exits computed in the strategy layer.
- **`portfolio.py`** — enforces max 10 concurrent positions and aggregate risk caps.

### 4.6 `tap/broker/`

- **`base.py`** — `Broker` protocol: `submit_order`, `cancel_order`, `get_positions`, `get_account`.
- **`alpaca_paper.py`** — adapter for Alpaca's paper endpoint. Generates deterministic client order IDs from `f"{run_id}:{ticker}:{side}:{seq}"` where `seq` disambiguates if the same ticker appears multiple times in a single run (e.g., close then re-open). Retries never double-submit because the ID is deterministic.
- **`simulated.py`** — in-memory broker for backtests. **Fill model:** orders submitted on day T (after close) fill at day T+1's open price with flat 5 bps slippage. This matches the realistic run-after-close → trade-next-open pattern.

### 4.7 `tap/backtest/`

- **`engine.py`** — walks the date range day-by-day, advances the fake clock, calls the strategy with point-in-time bars, routes orders to the simulated broker, records to the ledger. Supports deterministic-only mode via `--no-sentiment`.
- **`metrics.py`** — Sharpe, Sortino, max drawdown, hit rate, turnover, average holding period.

**Cold backtest cost estimate (full pipeline):** ~20 candidates × ~5 headlines × ~250 trading days × 3 years ≈ 75k LLM classifications ≈ **$8–12 on Claude Haiku** for a first run. Subsequent runs hit the cache and cost $0. Deterministic-only backtests are free and fast regardless of date range.

### 4.8 `tap/ledger/`

SQLite + SQLAlchemy. The only module that touches the database. No migrations tool — drop and recreate in v1 if the schema changes.

Tables:
- **`Run`** — `id, mode, started_at, ended_at, status, config_hash, notes`. `config_hash` = SHA256 of the canonicalized config TOML (strategy weights, signal list, pre-filter size, LLM model, risk params) so two runs with drifted config are visibly different.
- **`SignalSnapshot`** — `run_id, as_of, ticker, signal_name, value`
- **`Order`** — `run_id, client_order_id, ticker, side, qty, kind, status, submitted_at, rejection_reason`
- **`Fill`** — `order_id, filled_at, qty, price`
- **`Position`** — `run_id, ticker, qty, avg_price, opened_at, closed_at`
- **`EquitySnapshot`** — `run_id, as_of, cash, equity, positions_value`

### 4.9 `tap/tui/`

Textual application. Launches trading runs via Textual's `run_worker` (async workers) — not raw `subprocess` — so the TUI stays responsive and can surface progress in real time.

Layout:

- **Header** — mode indicator, clock, current run status pill
- **Watchlist panel** — top-N tickers by current combined score
- **Positions panel** — current holdings with unrealized P&L and stop levels
- **Orders panel** — today's submitted orders, color-coded by status
- **Signal scoreboard** — matrix of tickers × signals with values
- **Log pane** — live tail of structured logs (ring buffer)
- **Equity sparkline** — trailing 60-day equity curve

Keybindings:
- `r` — trigger a paper-live run in a worker
- `b` — open backtest screen
- `q` — quit
- `?` — help

The TUI reads from the ledger and the log ring buffer. It never executes trading logic itself.

### 4.10 `tap/cli.py`

Typer entrypoint: `tap run`, `tap backtest [--no-sentiment]`, `tap tui` (default), `tap data sync`.

### 4.11 Shared types (`tap/core/types.py`)

Pydantic dataclasses, pinned at the spec level so every layer agrees:

```python
class Bar:
    ticker: str
    date: date
    open: float
    high: float
    low: float
    close: float        # split-adjusted
    volume: int

class Order:
    client_order_id: str
    ticker: str
    side: Literal["buy", "sell"]
    qty: int
    kind: Literal["market", "stop"]
    stop_price: float | None
    submitted_at: datetime | None
    status: Literal["pending", "submitted", "filled", "rejected", "cancelled"]

class Position:
    ticker: str
    qty: int
    avg_price: float
    opened_at: datetime
    stop_price: float | None

class Portfolio:
    cash: float
    equity: float
    positions: dict[str, Position]

class SignalValue:
    ticker: str
    signal_name: str
    value: float
    as_of: date
```

## 5. Data flow — the daily run

1. **Resolve `as_of`.** `clock` returns today's market close time. In backtests, the engine supplies the fake date.
2. **Update universe.** `data.universe` returns point-in-time S&P 500 membership for `as_of`.
3. **Update bars.** `data.bars` fetches any missing bars through `as_of` (including bars for historical members still held in positions) and returns a wide frame. No-op in backtest mode beyond reading from Parquet.
4. **Compute deterministic signals.** `signals.momentum` and `signals.mean_reversion` return signal series for `as_of`. Mean-reversion gate reads SPY bars.
5. **Pre-filter.** Strategy combines deterministic signals into a preliminary score and keeps the top `pre_filter_size` (default 20) candidates.
6. **LLM sentiment on survivors.** *Skipped entirely in `--no-sentiment` mode.* Otherwise `data.news` pulls headlines with `created_at < close_time(as_of)`; `signals.sentiment` classifies and aggregates. Cache hits make reruns free.
7. **Final scoring.** Weighted combination writes one row per ticker to `SignalSnapshot`.
8. **Entry cadence check.** If today is not a monthly rebalance day AND no ticker breaks in with a large score delta, skip new entries. Exits still run.
9. **Risk sizing.** `risk.sizing` computes volatility-targeted dollar sizes from 20-day stdev; `risk.portfolio` caps at 10 positions.
10. **Reconcile.** Fetch current broker positions, diff against target, generate buy/sell orders and stop updates.
11. **Submit.** Broker adapter receives orders. Simulated broker queues fills at T+1 open with 5 bps slippage; Alpaca paper fills on Alpaca's schedule.
12. **Record.** Ledger writes Run, SignalSnapshot, Order, Fill (when confirmed), EquitySnapshot.
13. **Exit.** Process ends.

**Lookahead guards (explicit, each with a dedicated property-based test):**
- Step 3 bars: only rows with `date ≤ as_of`
- Step 6 news: only headlines with `created_at` strictly before `as_of`'s market close
- Step 9 sizing: stdev computed from bars strictly before `as_of`

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
| Stale bars (laptop offline for days) | `data.bars` detects the gap and refuses to run the strategy on stale data; error + halt |
| LLM cache miss/corruption | Best-effort; cache errors recompute; never blocks |
| Backtest lookahead bug | Property-based tests feed future-dated data and assert it's excluded |
| News history gap in backtest | Full-pipeline mode validates news coverage for the date range at startup; refuses to run if gaps exist |

### 6.3 Observability

Three layers:

1. **Structured logs** (`~/.tap/logs/tap.jsonl`) — every signal computation, order, LLM call with tokens/cost. Grepable and replayable.
2. **Ledger tables** — the source of truth for what happened. TUI and metrics read from here.
3. **TUI live log pane** — ring-buffer tail of the structured log, updated in real time during a run.

No alerting, no metrics server, no tracing. A local paper bot doesn't need them.

## 7. Testing strategy

### 7.1 Layers

**Unit tests — signal correctness.** Hand-crafted bar fixtures with known expected outputs. RSI(2) on a specific 10-day sequence, 12-1 momentum on a synthetic trend, 200-SMA gate flipping on SPY. Fast, no I/O, no network.

**Property-based tests — lookahead guards.** Using `hypothesis`, generate random `(bars, as_of)` pairs and assert the invariant:

```
signal(bars, as_of) == signal(bars[date ≤ as_of], as_of)
```

Same property for news-based signals against `created_at`, and for sizing against stdev inputs.

**Integration tests — end-to-end daily run.** Runs the full pipeline against a frozen fixture of bars + headlines using `broker.simulated` and a pre-populated LLM cache. Asserts:
- Correct orders for known-state input
- Ledger rows written (Run, Orders, SignalSnapshots)
- Idempotency: two runs with same `as_of` produce identical output
- Reconciliation after a simulated mid-run crash produces no duplicates
- Entry-cadence logic: non-rebalance day with no new breakouts produces zero new entries

**Backtest-as-regression.** A canonical deterministic-only backtest (2015–2023 on a fixed 50-ticker subset) asserts the final equity curve matches a snapshot within tolerance. Pure price data, no LLM, fully offline. Detects silent behavior changes from refactors.

### 7.2 LLM testing

LLMs never hit the real API in tests. Three patterns:
- Unit tests for `core.llm`: mock the client, assert request shape and parsing
- Signal tests for `sentiment.py`: stub the `core.llm` wrapper with canned classifications
- Integration tests: pre-populate the cache with fixture entries so the real code path runs but the call is a cache hit

### 7.3 Not tested

- Textual TUI visuals (manual). The ledger tests cover the data the TUI displays.
- CLI argument parsing beyond smoke tests.

### 7.4 Coverage

80% minimum on `signals/`, `strategy/`, `risk/`, `backtest/`, `ledger/`. TUI and CLI excluded from the target.

### 7.5 Tooling

`pytest`, `pytest-asyncio`, `hypothesis`. Tests run locally via `pytest`; CI can be added later without changing anything. No mocking framework gymnastics — real objects with fake adapters at the edges.

## 8. Configuration

A single `config.toml` in the project root:

```toml
[universe]
index = "SP500"

[strategy]
name = "momentum_rsi"
weights = { momentum = 0.4, mean_reversion = 0.4, sentiment = 0.2 }
pre_filter_size = 20      # tunable; governs how many candidates LLM scores
max_positions = 10
rebalance_cadence = "monthly"
breakout_margin = 0.15    # new ticker must exceed current cutoff score by 15% to enter mid-cycle

[risk]
target_risk_per_position = 0.01
stop_atr_multiple = 2.0

[broker]
mode = "alpaca_paper"
slippage_bps = 5

[llm]
model = "claude-haiku-4-5"
cache_dir = "~/.tap/llm-cache"

[data]
bars_dir = "data/bars"
news_db = "data/news.sqlite"
ledger_db = "data/ledger.sqlite"
universe_csv = "data/universe/sp500_history.csv"
```

Secrets (Alpaca API keys, LLM API keys) live in `~/.tap/secrets.env`, loaded at startup via `python-dotenv`. Never in config or git.

## 9. Open questions

None blocking v1. Items deferred to v2:

- Earnings surprise / PEAD as a fourth signal (stronger evidence than LLM sentiment; needs an earnings estimate data source)
- Dividend-adjusted total returns
- Intraday bars
- Shorting
- Multi-strategy portfolio overlay
- Upgrading the universe source from Wikipedia snapshots to a paid feed
- The prediction-market sibling project (designed separately)

## 10. Signal evidence summary

For traceability, the v1 signal set was selected based on replicated academic evidence:

- **12-1 cross-sectional momentum** — Jegadeesh & Titman 1993; Asness, Moskowitz, Pedersen 2013. Known failure: momentum crashes in sharp reversals (Daniel & Moskowitz 2016). Rebalanced monthly, not daily.
- **RSI(2) mean-reversion with SPY 200-SMA regime gate** — Jegadeesh 1990, Lehmann 1990; popularized by Connors. Decayed post-2010 but still non-zero on daily S&P 500; the market-level trend gate is non-negotiable to avoid catching falling knives in bear markets.
- **LLM headline sentiment** — Lopez-Lira & Tang 2023 showed edge but mostly in small caps; Glasserman & Mamaysky 2023 and others pushed back once point-in-time timestamps were enforced. Treated as an optional tiebreaker on large caps, not primary alpha. Full-pipeline backtests are limited to the last ~2–3 years by news API coverage; deterministic-only backtests can go decades.

**Honest expectation:** published backtest edges typically lose 30–50% of Sharpe in live trading. v1 builds the framework; sizing stays small; claims stay humble.
