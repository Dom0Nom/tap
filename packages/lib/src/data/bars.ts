import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Bar } from '../types.js';

export type FetcherFn = (tickers: string[], start: string, end: string) => Bar[];

export class BarStore {
  private db: Database.Database;

  constructor(dbPath: string, private fetcher: FetcherFn) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.exec(`
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
  }

  ensure(tickers: string[], start: string, end: string): void {
    const insert = this.db.prepare(
      'INSERT OR IGNORE INTO bars (ticker, date, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    // Find the earliest missing start across all tickers
    let missingStart: string | null = null;
    for (const t of tickers) {
      const row = this.db.prepare('SELECT MAX(date) as maxDate FROM bars WHERE ticker = ?').get(t) as { maxDate: string | null } | undefined;
      const haveEnd: string | null = row?.maxDate ?? null;
      const wantFrom = haveEnd === null ? start : (haveEnd >= end ? null : this._nextDay(haveEnd));
      if (wantFrom !== null && wantFrom <= end) {
        missingStart = missingStart === null ? wantFrom : (wantFrom < missingStart ? wantFrom : missingStart);
      }
    }

    if (missingStart === null) return;

    const fetched = this.fetcher(tickers, missingStart, end);
    if (fetched.length === 0) {
      // Check staleness
      for (const t of tickers) {
        const row = this.db.prepare('SELECT MAX(date) as maxDate FROM bars WHERE ticker = ?').get(t) as { maxDate: string | null } | undefined;
        if (!row?.maxDate || row.maxDate < this._daysAgo(end, 5)) {
          throw new Error(`stale bars for ${t}: last=${row?.maxDate} required_end=${end}`);
        }
      }
      return;
    }

    const tx = this.db.transaction(() => {
      for (const bar of fetched) {
        insert.run(bar.ticker, bar.date, bar.open, bar.high, bar.low, bar.close, bar.volume);
      }
    });
    tx();
  }

  readWide(tickers: string[], field: 'close' | 'open' | 'high' | 'low' | 'volume', start: string, end: string): { dates: string[]; data: Record<string, number[]> } {
    const allDates = new Set<string>();
    const raw: Record<string, Map<string, number>> = {};

    for (const t of tickers) {
      const rows = this.db.prepare(
        `SELECT date, ${field} as val FROM bars WHERE ticker = ? AND date >= ? AND date <= ? ORDER BY date`
      ).all(t, start, end) as { date: string; val: number }[];
      const map = new Map<string, number>();
      for (const r of rows) {
        map.set(r.date, r.val);
        allDates.add(r.date);
      }
      raw[t] = map;
    }

    const dates = [...allDates].sort();
    const data: Record<string, number[]> = {};
    for (const t of tickers) {
      data[t] = dates.map(d => raw[t]?.get(d) ?? NaN);
    }
    return { dates, data };
  }

  private _nextDay(dateStr: string): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  private _daysAgo(dateStr: string, n: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }
}
