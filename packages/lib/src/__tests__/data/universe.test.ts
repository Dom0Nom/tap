import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Universe } from '../../data/universe.js';

describe('Universe', () => {
  it('returns members at a given date', () => {
    const dir = join(tmpdir(), `tap-uni-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const csv = join(dir, 'sp500.csv');
    writeFileSync(csv, 'ticker,added,removed\nAAPL,1980-12-12,\nTSLA,2020-12-21,\nYHOO,2000-01-01,2017-06-13\n');
    const u = Universe.fromCSV(csv);
    expect(u.membersAt('2024-06-14').has('AAPL')).toBe(true);
    expect(u.membersAt('2024-06-14').has('TSLA')).toBe(true);
    expect(u.membersAt('2019-01-01').has('TSLA')).toBe(false);
    expect(u.membersAt('2015-01-01').has('YHOO')).toBe(true);
    expect(u.membersAt('2024-01-01').has('YHOO')).toBe(false);
  });

  it('returns all historical tickers', () => {
    const dir = join(tmpdir(), `tap-uni-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const csv = join(dir, 'sp500.csv');
    writeFileSync(csv, 'ticker,added,removed\nAAPL,1980-12-12,\nYHOO,2000-01-01,2017-06-13\n');
    const u = Universe.fromCSV(csv);
    expect(u.allHistoricalTickers()).toEqual(new Set(['AAPL', 'YHOO']));
  });
});
