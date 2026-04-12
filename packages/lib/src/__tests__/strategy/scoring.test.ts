import { describe, it, expect } from 'vitest';
import { combine } from '../../strategy/scoring.js';

describe('combine', () => {
  it('computes weighted sum', () => {
    const m = { A: 1.0, B: 0.5, C: 0.0 };
    const r = { A: 0, B: 1, C: 1 };
    const s = { A: 1, B: 0, C: -1 };
    const scored = combine({ momentum: m, mean_reversion: r, sentiment: s }, { momentum: 0.5, mean_reversion: 0.3, sentiment: 0.2 });
    expect(scored['A']).toBeCloseTo(0.7);
    expect(scored['B']).toBeCloseTo(0.55);
    expect(scored['C']).toBeCloseTo(0.1);
  });
});
