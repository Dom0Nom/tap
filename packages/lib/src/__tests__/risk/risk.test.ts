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
