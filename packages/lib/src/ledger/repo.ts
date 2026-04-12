import type Database from 'better-sqlite3';

export class LedgerRepo {
  constructor(private db: Database.Database) {}

  startRun(mode: string, configHash: string, now: string): number {
    const stmt = this.db.prepare('INSERT INTO runs (mode, started_at, status, config_hash) VALUES (?, ?, ?, ?)');
    return Number(stmt.run(mode, now, 'started', configHash).lastInsertRowid);
  }

  completeRun(runId: number, now: string): void {
    this.db.prepare('UPDATE runs SET ended_at = ?, status = ? WHERE id = ?').run(now, 'completed', runId);
  }

  failRun(runId: number, now: string, reason: string): void {
    this.db.prepare('UPDATE runs SET ended_at = ?, status = ?, notes = COALESCE(notes, "") || ? WHERE id = ?')
      .run(now, 'failed', `\nFAIL: ${reason}`, runId);
  }

  getRun(runId: number): { id: number; mode: string; status: string; config_hash: string } {
    return this.db.prepare('SELECT id, mode, status, config_hash FROM runs WHERE id = ?').get(runId) as any;
  }

  writeOrder(runId: number, clientOrderId: string, ticker: string, side: string, qty: number,
             kind: string, status: string, submittedAt: string | null): number {
    const existing = this.db.prepare('SELECT id FROM orders WHERE client_order_id = ?').get(clientOrderId) as any;
    if (existing) return existing.id;
    const stmt = this.db.prepare(
      'INSERT INTO orders (run_id, client_order_id, ticker, side, qty, kind, status, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    return Number(stmt.run(runId, clientOrderId, ticker, side, qty, kind, status, submittedAt).lastInsertRowid);
  }

  writeEquity(runId: number, asOf: string, cash: number, equity: number, positionsValue: number): void {
    this.db.prepare('INSERT INTO equity_snapshots (run_id, as_of, cash, equity, positions_value) VALUES (?, ?, ?, ?, ?)')
      .run(runId, asOf, cash, equity, positionsValue);
  }
}
