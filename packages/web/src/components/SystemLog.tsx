const LOG_ENTRIES = [
  { ts: '09:30:01', level: 'INFO', msg: 'BacktestEngine initialized | capital=100000 slippage=5bps' },
  { ts: '09:30:01', level: 'INFO', msg: 'Strategy loaded: MomentumRSI | weights={mom:0.4, mr:0.4}' },
  { ts: '09:30:02', level: 'INFO', msg: 'Loaded 500 bars x 10 tickers from Alpaca' },
  { ts: '09:30:02', level: 'INFO', msg: 'Backtest window: 2022-10-20 -> 2023-12-29' },
  { ts: '09:30:03', level: 'INFO', msg: 'Run complete | 240 trading days processed' },
  { ts: '09:30:03', level: 'WARN', msg: 'SPY regime gate active for 38 sessions' },
  { ts: '09:30:03', level: 'INFO', msg: 'Signals computed at last date for heatmap' },
  { ts: '09:30:03', level: 'INFO', msg: 'Dashboard data cached | next refresh on reconnect' },
];

function levelColor(level: string): string {
  if (level === 'WARN') return 'var(--accent-amber)';
  if (level === 'ERROR') return 'var(--accent-red)';
  return 'var(--text-muted)';
}

export function SystemLog() {
  return (
    <div className="font-[family-name:var(--font-mono)] text-[11px] space-y-px">
      {LOG_ENTRIES.map((entry, i) => (
        <div key={i} className="flex gap-3 py-0.5 px-1 rounded-sm hover:bg-white/[0.02]">
          <span className="shrink-0 tabular-nums" style={{ color: 'var(--border)' }}>{entry.ts}</span>
          <span className="shrink-0 w-10 font-medium" style={{ color: levelColor(entry.level) }}>{entry.level}</span>
          <span style={{ color: 'var(--text-secondary)' }}>{entry.msg}</span>
        </div>
      ))}
    </div>
  );
}
