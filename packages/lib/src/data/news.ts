import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';

export interface Headline {
  ticker: string;
  createdAt: string;  // ISO datetime
  headline: string;
  source: string;
}

function headlineHash(ticker: string, headline: string): string {
  return createHash('sha256').update(`${ticker}|${headline}`).digest('hex').slice(0, 16);
}

export class NewsStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS headlines (
        ticker TEXT NOT NULL,
        created_at TEXT NOT NULL,
        headline TEXT NOT NULL,
        source TEXT NOT NULL,
        headline_hash TEXT NOT NULL,
        PRIMARY KEY (ticker, created_at, headline_hash)
      )
    `);
  }

  upsert(headlines: Headline[]): void {
    const stmt = this.db.prepare(
      'INSERT OR IGNORE INTO headlines VALUES (?, ?, ?, ?, ?)'
    );
    const tx = this.db.transaction(() => {
      for (const h of headlines) {
        stmt.run(h.ticker, h.createdAt, h.headline, h.source, headlineHash(h.ticker, h.headline));
      }
    });
    tx();
  }

  fetch(ticker: string, before: string): Headline[] {
    const rows = this.db.prepare(
      'SELECT ticker, created_at, headline, source FROM headlines WHERE ticker = ? AND created_at < ? ORDER BY created_at'
    ).all(ticker, before) as { ticker: string; created_at: string; headline: string; source: string }[];
    return rows.map(r => ({ ticker: r.ticker, createdAt: r.created_at, headline: r.headline, source: r.source }));
  }
}
