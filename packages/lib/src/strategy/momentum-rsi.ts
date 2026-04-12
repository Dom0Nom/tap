import type { Order, Portfolio } from '../types.js';
import { createOrder } from '../types.js';
import { momentum12_1 } from '../signals/momentum.js';
import { rsi2MeanrevGated } from '../signals/mean-reversion.js';
import { combine } from './scoring.js';
import { volTargetShares } from '../risk/sizing.js';
import { applyCaps } from '../risk/portfolio.js';
import { pctChange, std as arrayStd, tail, dropNaN } from '../utils/math.js';

export interface StrategyConfig {
  weights: Record<string, number>;
  preFilterSize: number;
  maxPositions: number;
  breakoutMargin: number;
  targetRisk: number;
  stopAtrMultiple: number;
}

export class MomentumRSIStrategy {
  private lastCutoffScore: number | null = null;
  private lastRebalanceTickers = new Set<string>();

  constructor(
    private cfg: StrategyConfig,
    private spyCloses: number[],
    private sentimentFn: ((ticker: string, asOf: string) => number) | null = null,
  ) {}

  generateOrders(
    asOf: string,
    portfolio: Portfolio,
    barsWide: Record<string, number[]>,
    dates: string[],
  ): Order[] {
    const orders: Order[] = [];
    const cutoff = dates.findIndex(d => d > asOf);
    const endIdx = cutoff === -1 ? dates.length : cutoff;

    // Exits (every day)
    for (const [ticker, pos] of Object.entries(portfolio.positions)) {
      if (!barsWide[ticker]) continue;
      const px = barsWide[ticker][endIdx - 1];
      if (pos.stopPrice !== undefined && px <= pos.stopPrice) {
        orders.push(createOrder({
          clientOrderId: `${asOf}:${ticker}:sell:0`,
          ticker, side: 'sell', qty: pos.qty, kind: 'market',
        }));
      }
    }

    // Entries gated by cadence
    const isRebalanceDay = this.isFirstTradingDayOfMonth(asOf, dates, endIdx);

    const mom = momentum12_1(barsWide, dates, asOf);
    const mr = rsi2MeanrevGated(barsWide, dates, asOf, this.spyCloses);
    const sent: Record<string, number> = {};
    if (this.sentimentFn) {
      for (const t of Object.keys(mom)) {
        sent[t] = this.sentimentFn(t, asOf);
      }
    }

    const scored = combine({ momentum: mom, mean_reversion: mr, sentiment: sent }, this.cfg.weights);
    if (Object.keys(scored).length === 0) return orders;

    const sorted = Object.entries(scored).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, this.cfg.preFilterSize);
    const cutoffScore = top[top.length - 1]?.[1] ?? 0;

    let candidates = top;

    if (!isRebalanceDay) {
      if (this.lastCutoffScore === null) return orders;
      const threshold = this.lastCutoffScore * (1 + this.cfg.breakoutMargin);
      candidates = top.filter(([t, s]) => s > threshold && !this.lastRebalanceTickers.has(t));
      if (candidates.length === 0) return orders;
    }

    this.lastCutoffScore = cutoffScore;
    this.lastRebalanceTickers = new Set(candidates.map(([t]) => t));

    // Apply caps
    const candidateMap = Object.fromEntries(candidates);
    const capped = applyCaps(candidateMap, this.cfg.maxPositions);

    for (let i = 0; i < candidates.length; i++) {
      const [ticker] = candidates[i];
      if (!(ticker in capped)) continue;
      if (ticker in portfolio.positions) continue;
      if (!barsWide[ticker]) continue;

      const price = barsWide[ticker][endIdx - 1];
      const history = barsWide[ticker].slice(0, endIdx);
      const returns = dropNaN(pctChange(history));
      const stdev20 = arrayStd(tail(returns, 20));

      const shares = volTargetShares(price, stdev20, portfolio.equity, this.cfg.targetRisk);
      if (shares <= 0) continue;

      let stopPrice: number | undefined;
      if (stdev20 > 0 && !isNaN(stdev20)) {
        stopPrice = price - this.cfg.stopAtrMultiple * stdev20 * price;
      }

      orders.push(createOrder({
        clientOrderId: `${asOf}:${ticker}:buy:${i}`,
        ticker, side: 'buy', qty: shares, kind: 'market', stopPrice,
      }));
    }

    return orders;
  }

  private isFirstTradingDayOfMonth(asOf: string, dates: string[], endIdx: number): boolean {
    const hist = dates.slice(0, endIdx);
    if (hist.length === 0 || hist[hist.length - 1] !== asOf) return false;
    const month = asOf.slice(0, 7); // YYYY-MM
    const monthDates = hist.filter(d => d.startsWith(month));
    return monthDates.length === 1;
  }
}
