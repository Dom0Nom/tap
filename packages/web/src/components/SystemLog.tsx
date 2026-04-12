const LOG_ENTRIES = [
  { ts: '09:30:01', level: 'INFO', msg: 'BacktestEngine initialized | capital=100000 slippage=5bps' },
  { ts: '09:30:01', level: 'INFO', msg: 'Strategy loaded: MomentumRSI | weights={mom:0.4, mr:0.4}' },
  { ts: '09:30:02', level: 'INFO', msg: 'Loaded 500 bars x 10 tickers' },
  { ts: '09:30:02', level: 'INFO', msg: 'Backtest window: 2022-10-20 -> 2023-12-29' },
  { ts: '09:30:03', level: 'INFO', msg: 'Run complete | 240 trading days processed' },
  { ts: '09:30:03', level: 'WARN', msg: 'SPY regime gate active for 38 sessions' },
  { ts: '09:30:03', level: 'INFO', msg: 'Signals computed at last date for heatmap' },
  { ts: '09:30:03', level: 'INFO', msg: 'Dashboard data cached | next refresh on reconnect' },
];

function levelColor(level: string): string {
  if (level === 'WARN') return 'text-[#ffaa00]';
  if (level === 'ERROR') return 'text-[#ff3333]';
  return 'text-[#555]';
}

export function SystemLog() {
  return (
    <div className="font-mono text-[11px] space-y-0.5">
      {LOG_ENTRIES.map((entry, i) => (
        <div key={i} className="flex gap-2">
          <span className="text-[#333] shrink-0">{entry.ts}</span>
          <span className={`shrink-0 w-10 ${levelColor(entry.level)}`}>{entry.level}</span>
          <span className="text-[#888] truncate">{entry.msg}</span>
        </div>
      ))}
    </div>
  );
}
