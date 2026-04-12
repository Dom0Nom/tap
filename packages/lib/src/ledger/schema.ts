import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function createLedgerDB(dbPath: string): Database.Database {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY,
      mode TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      status TEXT NOT NULL,
      config_hash TEXT NOT NULL,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS signal_snapshots (
      id INTEGER PRIMARY KEY,
      run_id INTEGER REFERENCES runs(id),
      as_of TEXT NOT NULL,
      ticker TEXT NOT NULL,
      signal_name TEXT NOT NULL,
      value REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY,
      run_id INTEGER REFERENCES runs(id),
      client_order_id TEXT UNIQUE NOT NULL,
      ticker TEXT NOT NULL,
      side TEXT NOT NULL,
      qty INTEGER NOT NULL,
      kind TEXT NOT NULL,
      status TEXT NOT NULL,
      submitted_at TEXT,
      rejection_reason TEXT
    );
    CREATE TABLE IF NOT EXISTS fills (
      id INTEGER PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id),
      filled_at TEXT NOT NULL,
      qty INTEGER NOT NULL,
      price REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS equity_snapshots (
      id INTEGER PRIMARY KEY,
      run_id INTEGER REFERENCES runs(id),
      as_of TEXT NOT NULL,
      cash REAL NOT NULL,
      equity REAL NOT NULL,
      positions_value REAL NOT NULL
    );
  `);
  return db;
}
