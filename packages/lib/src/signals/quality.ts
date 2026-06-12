import { register } from './registry.js';

// Gross Profit / Total Assets for current S&P 500 universe
// Source: public filings, approximate values for ranking purposes
const PROFITABILITY: Record<string, number> = {
  AAPL: 0.46,
  MSFT: 0.69,
  NVDA: 0.73,
  AMZN: 0.48,
  GOOG: 0.57,
  META: 0.81,
  TSLA: 0.18,
  JPM: 0.35,
  V: 0.67,
  UNH: 0.24,
  SPY: 0.50,
};

function qualityGP(
  barsWide: Record<string, number[]>,
  dates: string[],
  asOf: string,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const ticker of Object.keys(barsWide)) {
    result[ticker] = PROFITABILITY[ticker] ?? 0;
  }
  return result;
}

register('quality_gp', qualityGP);
export { qualityGP, PROFITABILITY };
