#!/usr/bin/env tsx
import { SimulatedBroker } from '../broker/simulated.js';
import { MomentumRSIStrategy } from '../strategy/momentum-rsi.js';
import { createLedgerDB } from '../ledger/schema.js';
import { LedgerRepo } from '../ledger/repo.js';

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
const runId = ledger.startRun('paper-live', 'demo', now);

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
