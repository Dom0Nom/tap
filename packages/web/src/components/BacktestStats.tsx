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

  const stats: { label: string; value: string; color?: string }[] = [
    { label: 'SHARPE', value: metrics.sharpe.toFixed(2) },
    { label: 'SORTINO', value: metrics.sortino.toFixed(2) },
    {
      label: 'RETURN',
      value: `${isPositiveReturn ? '+' : ''}${returnPct.toFixed(1)}%`,
      color: isPositiveReturn ? 'var(--accent-green)' : 'var(--accent-red)',
    },
    {
      label: 'MAX DD',
      value: `${ddPct.toFixed(1)}%`,
      color: 'var(--accent-red)',
    },
    { label: 'TRADES', value: String(numTrades) },
    { label: 'DAYS', value: String(numDays) },
  ];

  return (
    <div className="space-y-3">
      {stats.map((s) => (
        <div key={s.label} className="flex items-baseline justify-between">
          <span
            className="font-[family-name:var(--font-barlow-condensed)] text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
            {s.label}
          </span>
          <span
            className="font-[family-name:var(--font-mono)] text-sm tabular-nums font-medium"
            style={{ color: s.color ?? 'var(--text-primary)' }}
          >
            {s.value}
          </span>
        </div>
      ))}
    </div>
  );
}
