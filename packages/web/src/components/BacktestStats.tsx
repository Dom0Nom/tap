import type { BacktestMetrics } from '@tap/lib/backtest/metrics';

interface BacktestStatsProps {
  metrics: BacktestMetrics;
  numTrades: number;
  numDays: number;
}

export function BacktestStats({ metrics, numTrades, numDays }: BacktestStatsProps) {
  const returnPct = metrics.totalReturn * 100;
  const ddPct = metrics.maxDrawdown * 100;
  const isPositiveReturn = returnPct >= 0;

  const stats: { label: string; value: string; colorClass?: string }[] = [
    { label: 'SHARPE', value: metrics.sharpe.toFixed(2) },
    { label: 'SORTINO', value: metrics.sortino.toFixed(2) },
    {
      label: 'MAX DD',
      value: `${ddPct.toFixed(1)}%`,
      colorClass: 'text-[#ff3333]',
    },
    {
      label: 'RETURN',
      value: `${isPositiveReturn ? '+' : ''}${returnPct.toFixed(1)}%`,
      colorClass: isPositiveReturn ? 'text-[#00ff41]' : 'text-[#ff3333]',
    },
    { label: 'TRADES', value: String(numTrades) },
    { label: 'DAYS', value: String(numDays) },
  ];

  return (
    <div className="grid grid-cols-3 gap-x-4 gap-y-2">
      {stats.map((s) => (
        <div key={s.label}>
          <div className="text-[#555] text-[9px] uppercase tracking-wider">{s.label}</div>
          <div className={`font-mono tabular-nums text-sm ${s.colorClass ?? 'text-[#e0e0e0]'}`}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}
