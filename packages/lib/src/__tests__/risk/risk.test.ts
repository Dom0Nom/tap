import { describe, it, expect } from 'vitest';
import { volTargetShares } from '../../risk/sizing.js';
import { volStopPrice } from '../../risk/stops.js';
import { applyCaps } from '../../risk/portfolio.js';

describe('volTargetShares', () => {
  it('returns more shares for lower vol', () => {
    const low = volTargetShares(100, 0.005, 100_000, 0.01);
    const high = volTargetShares(100, 0.05, 100_000, 0.01);
    expect(low).toBeGreaterThan(high);
    expect(high).toBeGreaterThan(0);
  });
});

describe('volStopPrice', () => {
  it('is below entry', () => {
    const stop = volStopPrice(100, 0.02, 2.0);
    expect(stop).toBeLessThan(100);
    expect(stop).toBeCloseTo(96);
  });
});

describe('applyCaps', () => {
  it('limits to maxPositions', () => {
    const desired: Record<string, number> = {};
    for (let i = 0; i < 20; i++) desired[`T${i}`] = 10_000;
    const kept = applyCaps(desired, 5);
    expect(Object.keys(kept)).toHaveLength(5);
  });
});

import { applySectorCaps } from '../../risk/portfolio.js';

describe('applySectorCaps', () => {
  it('limits tickers per sector', () => {
    const desired = { AAPL: 0.9, MSFT: 0.8, NVDA: 0.7, JPM: 0.6, V: 0.5 };
    const result = applySectorCaps(desired, 2, (t) => {
      const map: Record<string, string> = { AAPL: 'IT', MSFT: 'IT', NVDA: 'IT', JPM: 'Fin', V: 'Fin' };
      return map[t] ?? 'Unknown';
    });
    // IT has 3 tickers, cap at 2 → NVDA dropped (lowest score)
    expect(Object.keys(result)).toHaveLength(4);
    expect(result['NVDA']).toBeUndefined();
    expect(result['AAPL']).toBeDefined();
    expect(result['MSFT']).toBeDefined();
  });

  it('passes through when no sector exceeds limit', () => {
    const desired = { AAPL: 0.9, JPM: 0.6 };
    const result = applySectorCaps(desired, 2, () => 'Same');
    expect(Object.keys(result)).toHaveLength(2);
  });

  it('passes through when maxPerSector is Infinity', () => {
    const desired = { A: 1, B: 2, C: 3 };
    const result = applySectorCaps(desired, Infinity, () => 'Same');
    expect(Object.keys(result)).toHaveLength(3);
  });
});
