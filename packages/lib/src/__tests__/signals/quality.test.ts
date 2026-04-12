import { describe, it, expect } from 'vitest';
import { qualityGP, PROFITABILITY } from '../../signals/quality.js';

describe('qualityGP', () => {
  it('returns profitability scores for known tickers', () => {
    const barsWide = { AAPL: [100], MSFT: [200], TSLA: [300] };
    const sig = qualityGP(barsWide, ['2024-01-01'], '2024-01-01');
    expect(sig['MSFT']).toBeGreaterThan(sig['AAPL']);
    expect(sig['AAPL']).toBeGreaterThan(sig['TSLA']);
  });

  it('returns 0 for unknown tickers', () => {
    const sig = qualityGP({ XYZ: [100] }, ['2024-01-01'], '2024-01-01');
    expect(sig['XYZ']).toBe(0);
  });

  it('has entries for all standard universe tickers', () => {
    const expected = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOG', 'META', 'TSLA', 'JPM', 'V', 'UNH'];
    for (const t of expected) {
      expect(PROFITABILITY[t]).toBeDefined();
      expect(PROFITABILITY[t]).toBeGreaterThan(0);
    }
  });
});
