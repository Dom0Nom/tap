import { describe, it, expect } from 'vitest';
import { momentum12_1, momentum6_1, momentum9_1, blendedMomentum } from '../../signals/momentum.js';

function synthTrend(tickers: string[], days: number, slopes: Record<string, number>) {
  const dates: string[] = [];
  const d = new Date('2023-01-02');
  for (let i = 0; i < days; i++) {
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  const barsWide: Record<string, number[]> = {};
  for (const t of tickers) {
    barsWide[t] = dates.map((_, i) => 100 * Math.pow(1 + slopes[t], i));
  }
  return { dates, barsWide };
}

describe('momentum12_1', () => {
  it('ranks higher slope higher', () => {
    const { dates, barsWide } = synthTrend(['A', 'B', 'C'], 300, { A: 0.001, B: 0, C: -0.001 });
    const sig = momentum12_1(barsWide, dates, dates[dates.length - 1]);
    expect(sig['A']).toBeGreaterThan(sig['B']);
    expect(sig['B']).toBeGreaterThan(sig['C']);
  });

  it('ignores last 21 days', () => {
    const { dates, barsWide } = synthTrend(['A'], 300, { A: 0.002 });
    // Pollute last 21 days
    for (let i = dates.length - 21; i < dates.length; i++) {
      barsWide['A'][i] = 10_000;
    }
    const sig = momentum12_1(barsWide, dates, dates[dates.length - 1]);
    expect(sig['A']).toBeGreaterThan(0);
  });

  it('returns empty if insufficient history', () => {
    const { dates, barsWide } = synthTrend(['A'], 100, { A: 0.001 });
    const sig = momentum12_1(barsWide, dates, dates[dates.length - 1]);
    expect(Object.keys(sig)).toHaveLength(0);
  });
});

describe('momentum6_1', () => {
  it('ranks higher slope higher with 200 days', () => {
    const { dates, barsWide } = synthTrend(['A', 'B', 'C'], 200, { A: 0.001, B: 0, C: -0.001 });
    const sig = momentum6_1(barsWide, dates, dates[dates.length - 1]);
    expect(sig['A']).toBeGreaterThan(sig['B']);
    expect(sig['B']).toBeGreaterThan(sig['C']);
  });
});

describe('momentum9_1', () => {
  it('ranks higher slope higher with 250 days', () => {
    const { dates, barsWide } = synthTrend(['A', 'B', 'C'], 250, { A: 0.001, B: 0, C: -0.001 });
    const sig = momentum9_1(barsWide, dates, dates[dates.length - 1]);
    expect(sig['A']).toBeGreaterThan(sig['B']);
  });
});

describe('blendedMomentum', () => {
  it('returns values when all three available', () => {
    const { dates, barsWide } = synthTrend(['A', 'B'], 300, { A: 0.001, B: -0.001 });
    const sig = blendedMomentum(barsWide, dates, dates[dates.length - 1]);
    expect(sig['A']).toBeGreaterThan(sig['B']);
  });

  it('degrades gracefully with short history (only 6-1 available)', () => {
    const { dates, barsWide } = synthTrend(['A'], 160, { A: 0.001 });
    const sig = blendedMomentum(barsWide, dates, dates[dates.length - 1]);
    expect(sig['A']).toBeGreaterThan(0);
  });

  it('returns empty with insufficient history', () => {
    const { dates, barsWide } = synthTrend(['A'], 100, { A: 0.001 });
    const sig = blendedMomentum(barsWide, dates, dates[dates.length - 1]);
    expect(Object.keys(sig)).toHaveLength(0);
  });
});
