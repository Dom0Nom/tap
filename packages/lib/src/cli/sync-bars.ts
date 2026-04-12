#!/usr/bin/env tsx
import { fetchAlpacaBars } from '../data/alpaca-fetcher.js';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const TICKERS = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOG', 'META', 'TSLA', 'JPM', 'V', 'UNH', 'SPY'];

async function main(): Promise<void> {
  const dbPath = resolve('data', 'bars.sqlite');
  mkdirSync(dirname(dbPath), { recursive: true });

  console.log(`[sync-bars] Fetching bars for ${TICKERS.length} tickers...`);

  const end = new Date();
  end.setDate(end.getDate() - 1);
  const endStr = end.toISOString().slice(0, 10);
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 3);
  const startStr = start.toISOString().slice(0, 10);

  const bars = await fetchAlpacaBars(TICKERS, startStr, endStr);
  console.log(`[sync-bars] Fetched ${bars.length} bars`);

  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS bars (
      ticker TEXT NOT NULL,
      date TEXT NOT NULL,
      open REAL NOT NULL,
      high REAL NOT NULL,
      low REAL NOT NULL,
      close REAL NOT NULL,
      volume INTEGER NOT NULL,
      PRIMARY KEY (ticker, date)
    )
  `);

  const insert = db.prepare(
    'INSERT OR REPLACE INTO bars (ticker, date, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  const tx = db.transaction(() => {
    for (const bar of bars) {
      insert.run(bar.ticker, bar.date, bar.open, bar.high, bar.low, bar.close, bar.volume);
    }
  });
  tx();

  const count = db.prepare('SELECT COUNT(*) as c FROM bars').get() as { c: number };
  console.log(`[sync-bars] Total bars in DB: ${count.c}`);

  for (const t of TICKERS) {
    const row = db.prepare(
      'SELECT MIN(date) as minD, MAX(date) as maxD, COUNT(*) as c FROM bars WHERE ticker = ?',
    ).get(t) as { minD: string; maxD: string; c: number };
    console.log(`  ${t}: ${row.c} bars (${row.minD} → ${row.maxD})`);
  }

  db.close();
  console.log('[sync-bars] Done.');
}

main().catch(e => {
  console.error('[sync-bars] FAILED:', e);
  process.exit(1);
});
