import { std, tail, dropNaN } from '../utils/math.js';

export function volScaleFactor(
  strategyReturns: number[],
  targetVol: number = 0.12,
  lookback: number = 126,
): number {
  if (strategyReturns.length < lookback) return 1.0;
  const recent = tail(strategyReturns, lookback);
  const clean = dropNaN(recent);
  if (clean.length < 20) return 1.0;
  const realizedVol = std(clean) * Math.sqrt(252);
  if (realizedVol <= 0 || isNaN(realizedVol)) return 1.0;
  const factor = targetVol / realizedVol;
  return Math.max(0.5, Math.min(2.0, factor));
}
