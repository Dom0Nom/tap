#!/usr/bin/env tsx
import Database from 'better-sqlite3';
import { BacktestEngine } from '../backtest/engine.js';
import { SimulatedBroker } from '../broker/simulated.js';
import { MomentumRSIStrategy } from '../strategy/momentum-rsi.js';
import { summarize } from '../backtest/metrics.js';

function main(): void {
  const db = new Database('data/bars.sqlite');

  const tickers = (db.prepare("SELECT DISTINCT ticker FROM bars WHERE ticker != 'SPY' ORDER BY ticker").all() as { ticker: string }[]).map(r => r.ticker);
  const dates = (db.prepare('SELECT DISTINCT date FROM bars ORDER BY date').all() as { date: string }[]).map(r => r.date);

  if (dates.length < 260) {
    console.error(`[backtest] Need 260+ trading days, have ${dates.length}. Run sync-bars first.`);
    process.exit(1);
  }

  const barsWide: Record<string, number[]> = {};
  for (const t of [...tickers, 'SPY']) {
    const rows = db.prepare('SELECT date, close FROM bars WHERE ticker = ? ORDER BY date').all(t) as { date: string; close: number }[];
    const closeMap = new Map(rows.map(r => [r.date, r.close]));
    barsWide[t] = dates.map(d => closeMap.get(d) ?? NaN);
  }

  const spy = barsWide['SPY'] ?? [];
  delete barsWide['SPY'];

  console.log(`[backtest] ${tickers.length} tickers, ${dates.length} days (${dates[0]} → ${dates[dates.length - 1]})`);

  const broker = new SimulatedBroker(100_000, 5);
  broker.loadBars(dates, barsWide, barsWide);

  const strategy = new MomentumRSIStrategy(
    {
      weights: { momentum: 0.4, mean_reversion: 0.4, sentiment: 0.0 },
      preFilterSize: 5,
      maxPositions: 5,
      breakoutMargin: 0.15,
      targetRisk: 0.01,
      stopAtrMultiple: 2.0,
    },
    spy,
  );

  const engine = new BacktestEngine(strategy, broker, barsWide, dates);
  const start = dates[260];
  const end = dates[dates.length - 1];

  console.log(`[backtest] Running ${start} → ${end}...`);
  const t0 = Date.now();
  const result = engine.run(start, end);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  const metrics = summarize(result.equityCurve);
  const finalEq = result.equityCurve[result.equityCurve.length - 1]?.equity ?? 0;

  console.log(`\n${'='.repeat(45)}`);
  console.log(`  BACKTEST RESULTS (${elapsed}s)`);
  console.log(`${'='.repeat(45)}`);
  console.log(`  Period:       ${start} → ${end}`);
  console.log(`  Final equity: $${finalEq.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`  Total return: ${(metrics.totalReturn * 100).toFixed(2)}%`);
  console.log(`  Sharpe ratio: ${metrics.sharpe.toFixed(2)}`);
  console.log(`  Sortino:      ${metrics.sortino.toFixed(2)}`);
  console.log(`  Max drawdown: ${(metrics.maxDrawdown * 100).toFixed(2)}%`);
  console.log(`  Total trades: ${result.numTrades}`);
  console.log(`${'='.repeat(45)}`);

  const positions = broker.getPositions();
  if (Object.keys(positions).length > 0) {
    console.log('\n  OPEN POSITIONS:');
    for (const [ticker, pos] of Object.entries(positions)) {
      console.log(`    ${ticker}: ${pos.qty} shares @ $${pos.avgPrice.toFixed(2)}`);
    }
  }

  db.close();
  console.log('\n[backtest] Done.');
}

main();
