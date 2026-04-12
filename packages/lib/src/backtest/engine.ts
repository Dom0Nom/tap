import { SimulatedBroker } from '../broker/simulated.js';
import { MomentumRSIStrategy } from '../strategy/momentum-rsi.js';

export interface BacktestResult {
  equityCurve: { date: string; equity: number }[];
  numTrades: number;
}

export class BacktestEngine {
  constructor(
    private strategy: MomentumRSIStrategy,
    private broker: SimulatedBroker,
    private barsWide: Record<string, number[]>,
    private dates: string[],
  ) {}

  run(start: string, end: string): BacktestResult {
    const equityCurve: { date: string; equity: number }[] = [];
    let tradeCount = 0;

    for (let i = 0; i < this.dates.length; i++) {
      const d = this.dates[i];
      if (d < start || d > end) continue;

      this.broker.advanceTo(d);
      const portfolio = this.broker.getPortfolio();
      const orders = this.strategy.generateOrders(d, portfolio, this.barsWide, this.dates);
      for (const o of orders) {
        this.broker.submitOrder(o, d);
        tradeCount++;
      }
      equityCurve.push({ date: d, equity: this.broker.getPortfolio().equity });
    }

    return { equityCurve, numTrades: tradeCount };
  }
}
