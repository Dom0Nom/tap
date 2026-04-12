import { describe, it, expect } from 'vitest';
import { createOrder } from '../../types.js';

describe('createOrder', () => {
  it('defaults status to pending', () => {
    const o = createOrder({ clientOrderId: 'x', ticker: 'AAPL', side: 'buy', qty: 10, kind: 'market' });
    expect(o.status).toBe('pending');
  });
});
