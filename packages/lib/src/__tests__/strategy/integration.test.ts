import { describe, it, expect } from 'vitest';
import { MomentumRSIStrategy } from '../../strategy/momentum-rsi.js';
import type { Portfolio } from '../../types.js';

function makeBars(tickers: string[], days: number) {
  const dates: string[] = [];
  const d = new Date('2022-01-03');
  for (let i = 0; i < days; i++) {
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  const barsWide: Record<string, number[]> = {};
  tickers.forEach((t, idx) => {
    barsWide[t] = dates.map((_, i) => 100 + i * (0.5 - idx * 0.05));
  });
  const spy = dates.map((_, i) => 100 + i * 0.2);
  return { dates, barsWide, spy };
}

describe('MomentumRSIStrategy with research improvements', () => {
  it('uses blended momentum when configured', () => {
    const { dates, barsWide, spy } = makeBars(['AAPL', 'MSFT', 'NVDA', 'JPM', 'V'], 500);
    const strat = new MomentumRSIStrategy(
      { weights: { momentum: 0.8, mean_reversion: 0.2, sentiment: 0 },
        preFilterSize: 5, maxPositions: 3, breakoutMargin: 0.15,
        targetRisk: 0.01, stopAtrMultiple: 2.0,
        momentumMode: 'blended' },
      spy,
    );
    const portfolio: Portfolio = { cash: 100_000, equity: 100_000, positions: {} };
    const orders = strat.generateOrders('2023-06-01', portfolio, barsWide, dates);
    expect(orders.some(o => o.side === 'buy')).toBe(true);
  });

  it('respects sector caps', () => {
    const { dates, barsWide, spy } = makeBars(['AAPL', 'MSFT', 'NVDA', 'JPM', 'UNH'], 500);
    const strat = new MomentumRSIStrategy(
      { weights: { momentum: 1, mean_reversion: 0, sentiment: 0 },
        preFilterSize: 5, maxPositions: 5, breakoutMargin: 0.15,
        targetRisk: 0.01, stopAtrMultiple: 2.0,
        maxPerSector: 1 },
      spy,
    );
    const portfolio: Portfolio = { cash: 100_000, equity: 100_000, positions: {} };
    const orders = strat.generateOrders('2023-06-01', portfolio, barsWide, dates);
    const buyTickers = orders.filter(o => o.side === 'buy').map(o => o.ticker);
    const itCount = buyTickers.filter(t => ['AAPL', 'MSFT', 'NVDA'].includes(t)).length;
    expect(itCount).toBeLessThanOrEqual(1);
  });

  it('backward compatible with no new config fields', () => {
    const { dates, barsWide, spy } = makeBars(['AAPL', 'MSFT'], 500);
    const strat = new MomentumRSIStrategy(
      { weights: { momentum: 1, mean_reversion: 0, sentiment: 0 },
        preFilterSize: 2, maxPositions: 2, breakoutMargin: 0.15,
        targetRisk: 0.01, stopAtrMultiple: 2.0 },
      spy,
    );
    const portfolio: Portfolio = { cash: 100_000, equity: 100_000, positions: {} };
    const orders = strat.generateOrders('2023-06-01', portfolio, barsWide, dates);
    expect(Array.isArray(orders)).toBe(true);
  });
});
