import type { Position } from '@tap/lib';

interface PositionsGridProps {
  positions: Record<string, Position>;
  currentPrices: Record<string, number>;
}

export function PositionsGrid({ positions, currentPrices }: PositionsGridProps) {
  const entries = Object.entries(positions);

  if (entries.length === 0) {
    return <div style={{ color: 'var(--text-muted)' }}>No open positions</div>;
  }

  const pnls = entries.map(([ticker, pos]) => {
    const current = currentPrices[ticker] ?? pos.avgPrice;
    return ((current - pos.avgPrice) / pos.avgPrice) * 100;
  });
  const maxAbsPnl = Math.max(...pnls.map(Math.abs), 0.01);

  return (
    <table className="w-full text-[11px] border-collapse">
      <thead>
        <tr>
          {['TICKER', 'QTY', 'AVG', 'LAST', 'P&L %', ''].map((h, i) => (
            <th
              key={h || i}
              className={`pb-1.5 font-[family-name:var(--font-barlow-condensed)] font-semibold text-[10px] tracking-wider uppercase ${i === 0 ? 'text-left' : 'text-right'}`}
              style={{ color: 'var(--text-muted)' }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {entries.map(([ticker, pos], idx) => {
          const current = currentPrices[ticker] ?? pos.avgPrice;
          const pnlPct = pnls[idx];
          const isPositive = pnlPct >= 0;
          const barWidth = Math.abs(pnlPct) / maxAbsPnl;
          const pnlColor = isPositive ? 'var(--accent-green)' : 'var(--accent-red)';
          const rowBg = idx % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent';

          return (
            <tr key={ticker} className="h-7" style={{ background: rowBg }}>
              <td className="font-[family-name:var(--font-mono)] font-medium" style={{ color: 'var(--text-primary)' }}>
                {ticker}
              </td>
              <td className="font-[family-name:var(--font-mono)] tabular-nums text-right" style={{ color: 'var(--text-secondary)' }}>
                {pos.qty}
              </td>
              <td className="font-[family-name:var(--font-mono)] tabular-nums text-right" style={{ color: 'var(--text-secondary)' }}>
                {pos.avgPrice.toFixed(2)}
              </td>
              <td className="font-[family-name:var(--font-mono)] tabular-nums text-right" style={{ color: 'var(--text-primary)' }}>
                {current.toFixed(2)}
              </td>
              <td className="font-[family-name:var(--font-mono)] tabular-nums text-right font-medium" style={{ color: pnlColor }}>
                {isPositive ? '+' : ''}{pnlPct.toFixed(1)}%
              </td>
              <td className="pl-2 w-16">
                <div className="h-2 rounded-sm overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
                  <div
                    className="h-full rounded-sm transition-all"
                    style={{
                      width: `${barWidth * 100}%`,
                      background: pnlColor,
                      opacity: 0.6,
                      marginLeft: isPositive ? '50%' : undefined,
                      marginRight: !isPositive ? '50%' : undefined,
                      float: !isPositive ? 'right' : undefined,
                    }}
                  />
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
