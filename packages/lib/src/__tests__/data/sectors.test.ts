import { describe, it, expect } from 'vitest';
import { getSector, GICS_SECTORS } from '../../data/sectors.js';

describe('getSector', () => {
  it('returns correct GICS for known tickers', () => {
    expect(getSector('AAPL')).toBe('Information Technology');
    expect(getSector('JPM')).toBe('Financials');
    expect(getSector('UNH')).toBe('Health Care');
  });

  it('returns Unknown for unmapped tickers', () => {
    expect(getSector('XYZ')).toBe('Unknown');
  });
});
