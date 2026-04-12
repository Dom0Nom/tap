import { register } from './registry.js';

function momentum12_1(barsWide: Record<string, number[]>, dates: string[], asOf: string): Record<string, number> {
  // Filter to dates <= asOf
  const cutoff = dates.findIndex(d => d > asOf);
  const endIdx = cutoff === -1 ? dates.length : cutoff;

  if (endIdx < 253) return {};

  const result: Record<string, number> = {};
  for (const [ticker, closes] of Object.entries(barsWide)) {
    const startVal = closes[endIdx - 252];
    const endVal = closes[endIdx - 21];
    if (startVal !== undefined && endVal !== undefined && startVal > 0 && !isNaN(startVal) && !isNaN(endVal)) {
      result[ticker] = endVal / startVal - 1;
    }
  }
  return result;
}

register('momentum_12_1', momentum12_1);
export { momentum12_1 };
