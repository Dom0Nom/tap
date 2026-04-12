import { describe, it, expect } from 'vitest';
import { BacktestEngine } from '../../backtest/engine.js';
import { SimulatedBroker } from '../../broker/simulated.js';
import { MomentumRSIStrategy } from '../../strategy/momentum-rsi.js';
import { summarize } from '../../backtest/metrics.js';

function makeBars(days: number) {
  const dates: string[] = [];
  const d = new Date('2022-01-03');
  for (let i = 0; i < days; i++) {
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  const barsWide: Record<string, number[]> = {
    AAPL: dates.map((_, i) => 100 + i * 0.5),
    MSFT: dates.map((_, i) => 100 + i * 0.3),
  };
  const spy = dates.map((_, i) => 100 + i * 0.2);
  return { dates, barsWide, spy };
}

describe('BacktestEngine', () => {
  it('produces equity curve', () => {
    const { dates, barsWide, spy } = makeBars(500);
    const broker = new SimulatedBroker(100_000, 5);
    broker.loadBars(dates, barsWide, barsWide);

    const strat = new MomentumRSIStrategy(
      { weights: { momentum: 1, mean_reversion: 0, sentiment: 0 }, preFilterSize: 2, maxPositions: 2, breakoutMargin: 0.15, targetRisk: 0.01, stopAtrMultiple: 2 },
      spy,
    );
    const engine = new BacktestEngine(strat, broker, barsWide, dates);
    const result = engine.run(dates[260], dates[dates.length - 1]);

    expect(result.equityCurve.length).toBeGreaterThan(0);
    expect(result.equityCurve[result.equityCurve.length - 1].equity).toBeGreaterThan(0);
  });
});

describe('summarize', () => {
  it('reports sharpe and drawdown', () => {
    const curve = Array.from({ length: 252 }, (_, i) => ({
      date: `2023-${String(Math.floor(i / 22) + 1).padStart(2, '0')}-${String((i % 22) + 1).padStart(2, '0')}`,
      equity: 100_000 * (1 + 0.0008) ** i,
    }));
    const m = summarize(curve);
    expect(m.sharpe).toBeDefined();
    expect(m.maxDrawdown).toBeLessThanOrEqual(0);
  });
});
