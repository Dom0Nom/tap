import { register } from './registry.js';

function momentum12_1(barsWide: Record<string, number[]>, dates: string[], asOf: string): Record<string, number> {
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

function momentum6_1(barsWide: Record<string, number[]>, dates: string[], asOf: string): Record<string, number> {
  const cutoff = dates.findIndex(d => d > asOf);
  const endIdx = cutoff === -1 ? dates.length : cutoff;

  if (endIdx < 148) return {};

  const result: Record<string, number> = {};
  for (const [ticker, closes] of Object.entries(barsWide)) {
    const startVal = closes[endIdx - 126];
    const endVal = closes[endIdx - 21];
    if (startVal !== undefined && endVal !== undefined && startVal > 0 && !isNaN(startVal) && !isNaN(endVal)) {
      result[ticker] = endVal / startVal - 1;
    }
  }
  return result;
}

function momentum9_1(barsWide: Record<string, number[]>, dates: string[], asOf: string): Record<string, number> {
  const cutoff = dates.findIndex(d => d > asOf);
  const endIdx = cutoff === -1 ? dates.length : cutoff;

  if (endIdx < 211) return {};

  const result: Record<string, number> = {};
  for (const [ticker, closes] of Object.entries(barsWide)) {
    const startVal = closes[endIdx - 189];
    const endVal = closes[endIdx - 21];
    if (startVal !== undefined && endVal !== undefined && startVal > 0 && !isNaN(startVal) && !isNaN(endVal)) {
      result[ticker] = endVal / startVal - 1;
    }
  }
  return result;
}

function blendedMomentum(barsWide: Record<string, number[]>, dates: string[], asOf: string): Record<string, number> {
  const sig6 = momentum6_1(barsWide, dates, asOf);
  const sig9 = momentum9_1(barsWide, dates, asOf);
  const sig12 = momentum12_1(barsWide, dates, asOf);

  const tickers = new Set([...Object.keys(sig6), ...Object.keys(sig9), ...Object.keys(sig12)]);
  if (tickers.size === 0) return {};

  const result: Record<string, number> = {};
  for (const ticker of tickers) {
    const values: number[] = [];
    if (sig6[ticker] !== undefined) values.push(sig6[ticker]);
    if (sig9[ticker] !== undefined) values.push(sig9[ticker]);
    if (sig12[ticker] !== undefined) values.push(sig12[ticker]);
    if (values.length > 0) {
      result[ticker] = values.reduce((sum, v) => sum + v, 0) / values.length;
    }
  }
  return result;
}

register('momentum_12_1', momentum12_1);
register('momentum_6_1', momentum6_1);
register('momentum_9_1', momentum9_1);
register('momentum_blended', blendedMomentum);

export { momentum12_1, momentum6_1, momentum9_1, blendedMomentum };
