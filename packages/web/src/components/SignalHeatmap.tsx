import type { SignalRow } from '@/lib/demo-data';

interface SignalHeatmapProps {
  signals: SignalRow[];
}

function signalColor(value: number): string {
  if (value > 0.3) return '#00ff41';
  if (value > 0.1) return '#007722';
  if (value > 0.01) return '#003311';
  if (value < -0.3) return '#ff3333';
  if (value < -0.1) return '#772200';
  if (value < -0.01) return '#331100';
  return '#1a1a2e';
}

function textColor(value: number): string {
  if (Math.abs(value) > 0.1) return '#e0e0e0';
  return '#555';
}

const COLUMNS: { key: keyof Omit<SignalRow, 'ticker'>; label: string }[] = [
  { key: 'momentum', label: 'MOM' },
  { key: 'meanReversion', label: 'MR' },
  { key: 'composite', label: 'COMP' },
];

export function SignalHeatmap({ signals }: SignalHeatmapProps) {
  if (signals.length === 0) return <div className="text-[#555]">No signals</div>;

  return (
    <table className="w-full text-[11px]">
      <thead>
        <tr className="text-[#888]">
          <th className="pb-1 font-normal text-left">TICKER</th>
          {COLUMNS.map((col) => (
            <th key={col.key} className="pb-1 font-normal text-center">{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {signals.map((row) => (
          <tr key={row.ticker} className="h-6">
            <td className="font-mono text-[#e0e0e0] pr-2">{row.ticker}</td>
            {COLUMNS.map((col) => {
              const val = row[col.key];
              return (
                <td
                  key={col.key}
                  className="text-center font-mono tabular-nums px-1"
                  style={{ backgroundColor: signalColor(val), color: textColor(val) }}
                >
                  {val.toFixed(3)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
