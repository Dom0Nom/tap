export interface BacktestMetrics {
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  totalReturn: number;
}

export function summarize(equityCurve: { date: string; equity: number }[]): BacktestMetrics {
  if (equityCurve.length < 2) return { sharpe: 0, sortino: 0, maxDrawdown: 0, totalReturn: 0 };

  const equities = equityCurve.map(e => e.equity);
  const returns: number[] = [];
  for (let i = 1; i < equities.length; i++) {
    returns.push(equities[i] / equities[i - 1] - 1);
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const std = Math.sqrt(returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1));
  const sharpe = std > 0 ? Math.sqrt(252) * mean / std : 0;

  const downside = returns.filter(r => r < 0);
  const downStd = downside.length > 0
    ? Math.sqrt(downside.reduce((s, r) => s + r ** 2, 0) / downside.length)
    : 0;
  const sortino = downStd > 0 ? Math.sqrt(252) * mean / downStd : 0;

  let peak = equities[0];
  let maxDd = 0;
  for (const e of equities) {
    if (e > peak) peak = e;
    const dd = (e - peak) / peak;
    if (dd < maxDd) maxDd = dd;
  }

  const totalReturn = equities[equities.length - 1] / equities[0] - 1;

  return { sharpe, sortino, maxDrawdown: maxDd, totalReturn };
}
