import { describe, it, expect } from 'vitest';
import { volScaleFactor } from '../../signals/vol-scaled-momentum.js';

describe('volScaleFactor', () => {
  it('returns <1 for high-vol period', () => {
    // High vol: daily returns with 3% std → annualized ~48%
    const highVol = Array.from({ length: 130 }, (_, i) => (i % 2 === 0 ? 0.03 : -0.03));
    const factor = volScaleFactor(highVol, 0.12, 126);
    expect(factor).toBeLessThan(1.0);
    expect(factor).toBeGreaterThanOrEqual(0.5);
  });

  it('returns >1 for low-vol period', () => {
    // Low vol: daily returns with 0.2% std → annualized ~3.2%
    const lowVol = Array.from({ length: 130 }, (_, i) => (i % 2 === 0 ? 0.002 : -0.002));
    const factor = volScaleFactor(lowVol, 0.12, 126);
    expect(factor).toBeGreaterThan(1.0);
    expect(factor).toBeLessThanOrEqual(2.0);
  });

  it('returns 1.0 with insufficient history', () => {
    expect(volScaleFactor([0.01, 0.02], 0.12, 126)).toBe(1.0);
  });

  it('clamps to [0.5, 2.0]', () => {
    const extreme = Array.from({ length: 130 }, (_, i) => (i % 2 === 0 ? 0.1 : -0.1));
    expect(volScaleFactor(extreme, 0.01, 126)).toBe(0.5);
  });
});
