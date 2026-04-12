import { register } from './registry.js';

// Gross Profit / Total Assets for current S&P 500 universe
// Source: public filings, approximate values for ranking purposes
const PROFITABILITY: Record<string, number> = {
  AAPL: 0.46,   // strong hardware+services margins
  MSFT: 0.69,   // highest quality — cloud+software
  NVDA: 0.73,   // GPU monopoly margins
  AMZN: 0.48,   // AWS margins offset retail
  GOOG: 0.57,   // ad monopoly
  META: 0.81,   // highest gross margins in big tech
  TSLA: 0.18,   // lowest quality — auto manufacturing
  JPM: 0.35,    // banking
  V: 0.67,      // payments — high-quality
  UNH: 0.24,    // insurance — lower gross margins
  SPY: 0.50,    // market average (not used for trading)
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
