import { describe, it, expect } from 'vitest';
import { MomentumRSIStrategy, type StrategyConfig } from '../../strategy/momentum-rsi.js';
import type { Portfolio, Position } from '../../types.js';

function makeBars(tickers: string[], days: number): { dates: string[]; barsWide: Record<string, number[]>; spy: number[] } {
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

const cfg: StrategyConfig = {
  weights: { momentum: 1.0, mean_reversion: 0.0, sentiment: 0.0 },
  preFilterSize: 2, maxPositions: 2, breakoutMargin: 0.15,
  targetRisk: 0.01, stopAtrMultiple: 2.0,
};

describe('MomentumRSIStrategy', () => {
  it('emits entries on first trading day of month', () => {
    const { dates, barsWide, spy } = makeBars(['AAPL', 'MSFT'], 500);
    const strat = new MomentumRSIStrategy(cfg, spy);
    const portfolio: Portfolio = { cash: 100_000, equity: 100_000, positions: {} };
    const orders = strat.generateOrders('2023-06-01', portfolio, barsWide, dates);
    expect(orders.some(o => o.side === 'buy')).toBe(true);
  });

  it('stop exit fires when price below stop', () => {
    const { dates, barsWide, spy } = makeBars(['AAPL'], 500);
    const pos: Position = { ticker: 'AAPL', qty: 10, avgPrice: 200, openedAt: '2023-05-01', stopPrice: 500 };
    const portfolio: Portfolio = { cash: 50_000, equity: 50_000, positions: { AAPL: pos } };
    const strat = new MomentumRSIStrategy(cfg, spy);
    const orders = strat.generateOrders('2023-06-15', portfolio, barsWide, dates);
    expect(orders.some(o => o.ticker === 'AAPL' && o.side === 'sell')).toBe(true);
  });

  it('buy orders carry stop_price', () => {
    const { dates, barsWide, spy } = makeBars(['AAPL', 'MSFT'], 500);
    const strat = new MomentumRSIStrategy(cfg, spy);
    const portfolio: Portfolio = { cash: 100_000, equity: 100_000, positions: {} };
    const orders = strat.generateOrders('2023-06-01', portfolio, barsWide, dates);
    const buys = orders.filter(o => o.side === 'buy');
    expect(buys.length).toBeGreaterThan(0);
    for (const o of buys) expect(o.stopPrice).toBeDefined();
  });

  it('respects maxPositions cap', () => {
    const tickers = Array.from({ length: 10 }, (_, i) => `T${i}`);
    const { dates, barsWide, spy } = makeBars(tickers, 500);
    const maxCfg = { ...cfg, preFilterSize: 10, maxPositions: 3 };
    const strat = new MomentumRSIStrategy(maxCfg, spy);
    const portfolio: Portfolio = { cash: 1_000_000, equity: 1_000_000, positions: {} };
    const orders = strat.generateOrders('2023-06-01', portfolio, barsWide, dates);
    const buys = orders.filter(o => o.side === 'buy');
    expect(buys.length).toBeLessThanOrEqual(3);
  });
});
