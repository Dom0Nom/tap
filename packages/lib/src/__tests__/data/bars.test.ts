import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync } from 'node:fs';
import { BarStore } from '../../data/bars.js';
import type { Bar } from '../../types.js';

function fakeFetcher(tickers: string[], start: string, end: string): Bar[] {
  const bars: Bar[] = [];
  for (const t of tickers) {
    const d = new Date(start);
    const endD = new Date(end);
    while (d <= endD) {
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        bars.push({ ticker: t, date: d.toISOString().slice(0, 10), open: 100, high: 101, low: 99, close: 100.5, volume: 1_000_000 });
      }
      d.setDate(d.getDate() + 1);
    }
  }
  return bars;
}

describe('BarStore', () => {
  it('writes and reads bars', () => {
    const dir = join(tmpdir(), `tap-bars-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const store = new BarStore(join(dir, 'bars.sqlite'), fakeFetcher);
    store.ensure(['AAPL', 'MSFT'], '2024-01-02', '2024-01-05');
    const { dates, data } = store.readWide(['AAPL', 'MSFT'], 'close', '2024-01-02', '2024-01-05');
    expect(Object.keys(data)).toContain('AAPL');
    expect(Object.keys(data)).toContain('MSFT');
    expect(dates.length).toBeGreaterThanOrEqual(3);
  });

  it('incremental update only fetches tail', () => {
    const calls: [string[], string, string][] = [];
    function trackingFetcher(tickers: string[], start: string, end: string): Bar[] {
      calls.push([tickers, start, end]);
      return fakeFetcher(tickers, start, end);
    }
    const dir = join(tmpdir(), `tap-bars-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const store = new BarStore(join(dir, 'bars.sqlite'), trackingFetcher);
    store.ensure(['AAPL'], '2024-01-02', '2024-01-05');
    store.ensure(['AAPL'], '2024-01-02', '2024-01-10');
    expect(calls[1][1] > calls[0][1]).toBe(true);
  });

  it('raises on stale data', () => {
    const dir = join(tmpdir(), `tap-bars-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const store = new BarStore(join(dir, 'bars.sqlite'), fakeFetcher);
    store.ensure(['AAPL'], '2024-01-02', '2024-01-05');
    const emptyStore = new BarStore(join(dir, 'bars.sqlite'), () => []);
    expect(() => emptyStore.ensure(['AAPL'], '2024-01-02', '2030-01-01')).toThrow(/stale/);
  });
});
