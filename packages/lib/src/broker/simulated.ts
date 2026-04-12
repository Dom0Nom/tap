import type { Order, Position, Portfolio } from '../types.js';

interface Pending { order: Order; submitDate: string; }

export class SimulatedBroker {
  cash: number;
  positions: Record<string, Position> = {};
  private pending: Pending[] = [];
  private submittedIds = new Set<string>();
  private slippage: number;
  private opens: Record<string, number[]> = {};
  private closes: Record<string, number[]> = {};
  private dates: string[] = [];
  private currentDateIdx = -1;

  constructor(initialCash: number, slippageBps: number) {
    this.cash = initialCash;
    this.slippage = slippageBps / 10_000;
  }

  loadBars(dates: string[], opens: Record<string, number[]>, closes: Record<string, number[]>): void {
    this.dates = dates;
    this.opens = opens;
    this.closes = closes;
  }

  submitOrder(order: Order, submittedOn: string): void {
    if (this.submittedIds.has(order.clientOrderId)) return;
    this.submittedIds.add(order.clientOrderId);
    this.pending.push({ order, submitDate: submittedOn });
  }

  advanceTo(d: string): void {
    this.currentDateIdx = this.dates.indexOf(d);
    const remaining: Pending[] = [];
    for (const p of this.pending) {
      if (d > p.submitDate && this.currentDateIdx >= 0) {
        const openPx = this.opens[p.order.ticker]?.[this.currentDateIdx];
        if (openPx === undefined || isNaN(openPx)) { remaining.push(p); continue; }
        const fillPx = p.order.side === 'buy' ? openPx * (1 + this.slippage) : openPx * (1 - this.slippage);
        this.applyFill(p.order, fillPx);
      } else {
        remaining.push(p);
      }
    }
    this.pending = remaining;
  }

  private applyFill(order: Order, price: number): void {
    if (order.side === 'buy') {
      const cost = price * order.qty;
      if (cost > this.cash) return;
      this.cash -= cost;
      const existing = this.positions[order.ticker];
      if (existing) {
        const newQty = existing.qty + order.qty;
        const newAvg = (existing.avgPrice * existing.qty + price * order.qty) / newQty;
        this.positions[order.ticker] = { ...existing, qty: newQty, avgPrice: newAvg };
      } else {
        this.positions[order.ticker] = {
          ticker: order.ticker, qty: order.qty, avgPrice: price,
          openedAt: new Date().toISOString(), stopPrice: order.stopPrice,
        };
      }
    } else {
      const existing = this.positions[order.ticker];
      if (!existing || existing.qty < order.qty) return;
      this.cash += price * order.qty;
      if (existing.qty === order.qty) {
        delete this.positions[order.ticker];
      } else {
        this.positions[order.ticker] = { ...existing, qty: existing.qty - order.qty };
      }
    }
  }

  getPositions(): Record<string, Position> { return { ...this.positions }; }

  getPortfolio(): Portfolio {
    let positionsValue = 0;
    if (this.currentDateIdx >= 0) {
      for (const pos of Object.values(this.positions)) {
        const px = this.closes[pos.ticker]?.[this.currentDateIdx];
        if (px !== undefined && !isNaN(px)) positionsValue += pos.qty * px;
      }
    }
    return { cash: this.cash, equity: this.cash + positionsValue, positions: { ...this.positions } };
  }
}
