import { describe, it, expect } from 'vitest';
import { SimulatedBroker } from '../../broker/simulated.js';
import { createOrder } from '../../types.js';

describe('SimulatedBroker', () => {
  it('fills at next-day open with slippage', () => {
    const dates = ['2024-01-02', '2024-01-03', '2024-01-04'];
    const opens = { AAPL: [99, 100.5, 101.5] };
    const closes = { AAPL: [100, 101, 102] };
    const broker = new SimulatedBroker(100_000, 5);
    broker.loadBars(dates, opens, closes);

    broker.submitOrder(createOrder({ clientOrderId: 'r1:AAPL:buy:0', ticker: 'AAPL', side: 'buy', qty: 10, kind: 'market' }), '2024-01-02');
    broker.advanceTo('2024-01-03');
    const pos = broker.getPositions();
    expect(pos['AAPL']).toBeDefined();
    const expected = 100.5 * (1 + 5 / 10_000);
    expect(Math.abs(pos['AAPL'].avgPrice - expected)).toBeLessThan(0.001);
  });

  it('deduplicates by client order id', () => {
    const dates = ['2024-01-02', '2024-01-03'];
    const opens = { AAPL: [100, 100] };
    const closes = { AAPL: [100, 100] };
    const broker = new SimulatedBroker(100_000, 0);
    broker.loadBars(dates, opens, closes);

    const o = createOrder({ clientOrderId: 'r1:AAPL:buy:0', ticker: 'AAPL', side: 'buy', qty: 1, kind: 'market' });
    broker.submitOrder(o, '2024-01-02');
    broker.submitOrder(o, '2024-01-02');
    broker.advanceTo('2024-01-03');
    expect(broker.getPositions()['AAPL'].qty).toBe(1);
  });

  it('marks to market at current date', () => {
    const dates = ['2024-01-02', '2024-01-03', '2024-01-04'];
    const opens = { AAPL: [100, 100, 100] };
    const closes = { AAPL: [100, 150, 200] };
    const broker = new SimulatedBroker(100_000, 0);
    broker.loadBars(dates, opens, closes);
    broker.submitOrder(createOrder({ clientOrderId: 'x', ticker: 'AAPL', side: 'buy', qty: 10, kind: 'market' }), '2024-01-02');
    broker.advanceTo('2024-01-03');
    const mid = broker.getPortfolio();
    expect(mid.equity).toBeCloseTo(100_000 - 1000 + 10 * 150);
    broker.advanceTo('2024-01-04');
    const end = broker.getPortfolio();
    expect(end.equity).toBeCloseTo(100_000 - 1000 + 10 * 200);
  });
});
