#!/usr/bin/env tsx
import Database from 'better-sqlite3';
import { blendedMomentum } from '../signals/momentum.js';
import { rsi2MeanrevGated } from '../signals/mean-reversion.js';
import { combine } from '../strategy/scoring.js';

function main(): void {
  const db = new Database('data/bars.sqlite');

  const tickers = (db.prepare('SELECT DISTINCT ticker FROM bars ORDER BY ticker').all() as { ticker: string }[]).map(r => r.ticker);
  const dates = (db.prepare('SELECT DISTINCT date FROM bars ORDER BY date').all() as { date: string }[]).map(r => r.date);

  if (tickers.length === 0 || dates.length === 0) {
    console.error('[signals] No data in bars.sqlite — run sync-bars first');
    process.exit(1);
  }

  const barsWide: Record<string, number[]> = {};
  for (const t of tickers) {
    const rows = db.prepare('SELECT date, close FROM bars WHERE ticker = ? ORDER BY date').all(t) as { date: string; close: number }[];
    const closeMap = new Map(rows.map(r => [r.date, r.close]));
    barsWide[t] = dates.map(d => closeMap.get(d) ?? NaN);
  }

  const asOf = dates[dates.length - 1];
  const spyCloses = barsWide['SPY'] ?? [];

  console.log(`[signals] Computing signals as of ${asOf} for ${tickers.length} tickers\n`);

  const mom = blendedMomentum(barsWide, dates, asOf);
  const nonSpyWide = Object.fromEntries(Object.entries(barsWide).filter(([k]) => k !== 'SPY'));
  const mr = rsi2MeanrevGated(nonSpyWide, dates, asOf, spyCloses);
  const scored = combine(
    { momentum: mom, mean_reversion: mr, sentiment: {} },
    { momentum: 0.4, mean_reversion: 0.4, sentiment: 0.2 },
  );

  const sorted = Object.entries(scored).sort((a, b) => b[1] - a[1]);

  console.log('TICKER    MOM      MR    COMPOSITE');
  console.log('\u2500'.repeat(40));
  for (const [ticker, composite] of sorted) {
    const m = mom[ticker] ?? 0;
    const r = mr[ticker] ?? 0;
    const mStr = m >= 0 ? `+${m.toFixed(3)}` : m.toFixed(3);
    const rStr = r >= 0 ? `+${r.toFixed(0)}` : r.toFixed(0);
    const cStr = composite >= 0 ? `+${composite.toFixed(3)}` : composite.toFixed(3);
    console.log(`${ticker.padEnd(10)}${mStr.padStart(7)}  ${rStr.padStart(4)}    ${cStr.padStart(7)}`);
  }

  const top5 = sorted.slice(0, 5);
  console.log(`\nTOP 5 PICKS: ${top5.map(([t]) => t).join(', ')}`);

  if (spyCloses.length >= 200) {
    const sma200 = spyCloses.slice(-200).reduce((a, b) => a + b, 0) / 200;
    const current = spyCloses[spyCloses.length - 1];
    const regime = current > sma200 ? 'BULLISH' : 'BEARISH';
    console.log(`\nSPY REGIME: ${regime} (SPY ${current.toFixed(2)} vs 200-SMA ${sma200.toFixed(2)})`);
  }

  db.close();
  console.log('\n[signals] Done.');
}

main();
