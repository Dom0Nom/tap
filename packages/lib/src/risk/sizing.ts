import { correlation, pctChange, tail, dropNaN } from '../utils/math.js';

export function volTargetShares(price: number, stdev20: number, capital: number, targetRisk: number): number {
  if (stdev20 <= 0 || isNaN(stdev20) || price <= 0) return 0;
  const dollarRisk = targetRisk * capital;
  const dollarsPerShareRisk = stdev20 * price;
  if (dollarsPerShareRisk <= 0) return 0;
  return Math.max(0, Math.floor(dollarRisk / dollarsPerShareRisk));
}

export function correlationAdjustedSize(
  shares: number,
  candidateCloses: number[],
  portfolioCloses: number[][],
  lookback: number = 60,
  threshold: number = 0.7,
): number {
  if (shares <= 0 || portfolioCloses.length === 0) return shares;

  const candidateReturns = dropNaN(pctChange(tail(candidateCloses, lookback + 1)));
  if (candidateReturns.length < 20) return shares;

  let totalCorr = 0;
  let count = 0;
  for (const posCloses of portfolioCloses) {
    const posReturns = dropNaN(pctChange(tail(posCloses, lookback + 1)));
    if (posReturns.length < 20) continue;
    const minLen = Math.min(candidateReturns.length, posReturns.length);
    const corr = correlation(candidateReturns.slice(-minLen), posReturns.slice(-minLen));
    totalCorr += Math.abs(corr);
    count++;
  }

  if (count === 0) return shares;
  const avgCorr = totalCorr / count;

  if (avgCorr > threshold) {
    const scaleFactor = threshold / avgCorr;
    return Math.max(1, Math.floor(shares * scaleFactor));
  }
  return shares;
}
