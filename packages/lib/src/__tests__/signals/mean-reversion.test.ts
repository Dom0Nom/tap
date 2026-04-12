import { describe, it, expect } from 'vitest';
import { rsi2MeanrevGated } from '../../signals/mean-reversion.js';

function spyAbove200sma(days: number): number[] {
  return Array.from({ length: days }, (_, i) => 100 + i * 0.1);
}

function spyBelow200sma(days: number): number[] {
  return Array.from({ length: days }, (_, i) => 100 - i * 0.1);
}

function makeDates(days: number): string[] {
  const dates: string[] = [];
  const d = new Date('2023-01-02');
  for (let i = 0; i < days; i++) {
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

describe('rsi2MeanrevGated', () => {
  it('fires oversold in bullish market', () => {
    const days = 260;
    const dates = makeDates(days);
    const spy = spyAbove200sma(days);
    const closes = Array(days - 3).fill(100).concat([95, 90, 85]);
    const sig = rsi2MeanrevGated({ A: closes }, dates, dates[dates.length - 1], spy);
    expect(sig['A']).toBe(1);
  });

  it('blocks in bearish market', () => {
    const days = 260;
    const dates = makeDates(days);
    const spy = spyBelow200sma(days);
    const closes = Array(days - 3).fill(100).concat([95, 90, 85]);
    const sig = rsi2MeanrevGated({ A: closes }, dates, dates[dates.length - 1], spy);
    expect(sig['A']).toBe(0);
  });
});
