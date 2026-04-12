#!/usr/bin/env tsx
import { existsSync } from 'node:fs';
import Database from 'better-sqlite3';
import { SimulatedBroker } from '../broker/simulated.js';
import { MomentumRSIStrategy } from '../strategy/momentum-rsi.js';
import { createLedgerDB } from '../ledger/schema.js';
import { LedgerRepo } from '../ledger/repo.js';

function loadRealData(): { dates: string[]; barsWide: Record<string, number[]>; spy: number[]; tickers: string[] } | null {
  const dbPath = 'data/bars.sqlite';
  if (!existsSync(dbPath)) return null;

  const db = new Database(dbPath);
  const tickers = (db.prepare("SELECT DISTINCT ticker FROM bars WHERE ticker != 'SPY' ORDER BY ticker").all() as { ticker: string }[]).map(r => r.ticker);
  const dates = (db.prepare('SELECT DISTINCT date FROM bars ORDER BY date').all() as { date: string }[]).map(r => r.date);

  if (dates.length < 260 || tickers.length === 0) {
    db.close();
    return null;
  }

  const barsWide: Record<string, number[]> = {};
  for (const t of [...tickers, 'SPY']) {
    const rows = db.prepare('SELECT date, close FROM bars WHERE ticker = ? ORDER BY date').all(t) as { date: string; close: number }[];
    const closeMap = new Map(rows.map(r => [r.date, r.close]));
    barsWide[t] = dates.map(d => closeMap.get(d) ?? NaN);
  }

  const spy = barsWide['SPY'] ?? [];
  delete barsWide['SPY'];

  db.close();
  return { dates, barsWide, spy, tickers };
}

function generateSyntheticData(): { dates: string[]; barsWide: Record<string, number[]>; spy: number[]; tickers: string[] } {
  const days = 500;
  const dates: string[] = [];
  const d = new Date('2022-01-03');
  for (let i = 0; i < days; i++) {
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }

  const tickers = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOG'];
  const barsWide: Record<string, number[]> = {};
  for (const t of tickers) {
    barsWide[t] = dates.map((_, i) => 100 * Math.exp(0.0003 * i + Math.sin(i * 0.1) * 0.02));
  }
  const spy = dates.map((_, i) => 100 + i * 0.2);

  return { dates, barsWide, spy, tickers };
}

const real = loadRealData();
const { dates, barsWide, spy, tickers } = real ?? generateSyntheticData();
const dataSource = real ? 'local-sqlite' : 'synthetic';
console.log(`[run] Data source: ${dataSource}, ${tickers.length} tickers, ${dates.length} days`);

const broker = new SimulatedBroker(100_000, 5);
broker.loadBars(dates, barsWide, barsWide);

const strategy = new MomentumRSIStrategy(
  { weights: { momentum: 0.4, mean_reversion: 0.4, sentiment: 0.0 }, preFilterSize: 5, maxPositions: 5, breakoutMargin: 0.15, targetRisk: 0.01, stopAtrMultiple: 2.0 },
  spy,
);

const db = createLedgerDB('data/ledger.sqlite');
const ledger = new LedgerRepo(db);

const asOf = dates[dates.length - 1];
const now = new Date().toISOString();
const runId = ledger.startRun('paper-live', dataSource, now);

try {
  const portfolio = broker.getPortfolio();
  const orders = strategy.generateOrders(asOf, portfolio, barsWide, dates);
  for (const o of orders) {
    broker.submitOrder(o, asOf);
    ledger.writeOrder(runId, o.clientOrderId, o.ticker, o.side, o.qty, o.kind, 'submitted', now);
  }
  const eq = broker.getPortfolio();
  ledger.writeEquity(runId, asOf, eq.cash, eq.equity, eq.equity - eq.cash);
  ledger.completeRun(runId, new Date().toISOString());
  console.log(`Run ${runId} completed: ${orders.length} orders, equity $${eq.equity.toFixed(2)}`);
} catch (e) {
  ledger.failRun(runId, new Date().toISOString(), String(e));
  console.error('Run failed:', e);
  process.exit(1);
}
