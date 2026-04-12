import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync } from 'node:fs';
import { createLedgerDB } from '../../ledger/schema.js';
import { LedgerRepo } from '../../ledger/repo.js';

describe('Ledger', () => {
  it('creates run and writes orders', () => {
    const dir = join(tmpdir(), `tap-ledger-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const db = createLedgerDB(join(dir, 'ledger.sqlite'));
    const repo = new LedgerRepo(db);

    const runId = repo.startRun('backtest', 'abc', '2024-06-14T20:00:00Z');
    repo.writeOrder(runId, 'r1:AAPL:buy:0', 'AAPL', 'buy', 10, 'market', 'submitted', '2024-06-14T20:00:00Z');
    repo.completeRun(runId, '2024-06-14T21:00:00Z');

    const run = repo.getRun(runId);
    expect(run.status).toBe('completed');
  });

  it('writeOrder is idempotent', () => {
    const dir = join(tmpdir(), `tap-ledger-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const db = createLedgerDB(join(dir, 'ledger.sqlite'));
    const repo = new LedgerRepo(db);

    const runId = repo.startRun('backtest', 'abc', '2024-06-14T20:00:00Z');
    const id1 = repo.writeOrder(runId, 'dup', 'AAPL', 'buy', 10, 'market', 'submitted', null);
    const id2 = repo.writeOrder(runId, 'dup', 'AAPL', 'buy', 10, 'market', 'submitted', null);
    expect(id1).toBe(id2);
  });
});
