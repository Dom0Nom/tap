import { register } from './registry.js';
import { rollingMean } from '../utils/math.js';

function rsi(closes: number[], period: number): number {
  if (closes.length < period + 1) return NaN;
  const recent = closes.slice(-(period + 1));
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < recent.length; i++) {
    const delta = recent[i] - recent[i - 1];
    if (delta > 0) gains += delta;
    else losses -= delta;
  }
  gains /= period;
  losses /= period;
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

export function rsi2MeanrevGated(
  barsWide: Record<string, number[]>,
  dates: string[],
  asOf: string,
  spyCloses: number[],
): Record<string, number> {
  const cutoff = dates.findIndex(d => d > asOf);
  const endIdx = cutoff === -1 ? dates.length : cutoff;

  // SPY regime gate
  if (endIdx < 200) {
    return Object.fromEntries(Object.keys(barsWide).map(t => [t, 0]));
  }
  const spyHist = spyCloses.slice(0, endIdx);
  const sma200 = rollingMean(spyHist, 200);
  const lastSma = sma200[sma200.length - 1];
  const lastSpy = spyHist[spyHist.length - 1];

  if (isNaN(lastSma) || lastSpy <= lastSma) {
    return Object.fromEntries(Object.keys(barsWide).map(t => [t, 0]));
  }

  const result: Record<string, number> = {};
  for (const [ticker, closes] of Object.entries(barsWide)) {
    if (ticker === 'SPY') continue;
    const hist = closes.slice(0, endIdx);
    const r = rsi(hist, 2);
    if (isNaN(r)) result[ticker] = 0;
    else if (r < 10) result[ticker] = 1;
    else if (r > 90) result[ticker] = -1;
    else result[ticker] = 0;
  }
  return result;
}

register('rsi2_meanrev_gated', (barsWide, dates, asOf) => {
  const spyCloses = barsWide['SPY'] ?? [];
  return rsi2MeanrevGated(barsWide, dates, asOf, spyCloses);
});
