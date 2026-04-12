import type { Position } from '@tap/lib';

interface PositionsGridProps {
  positions: Record<string, Position>;
  currentPrices: Record<string, number>;
}

export function PositionsGrid({ positions, currentPrices }: PositionsGridProps) {
  const entries = Object.entries(positions);

  if (entries.length === 0) {
    return <div className="text-[#555]">No open positions</div>;
  }

  return (
    <table className="w-full text-[11px]">
      <thead>
        <tr className="text-[#888] text-left">
          <th className="pb-1 font-normal">TICKER</th>
          <th className="pb-1 font-normal text-right">QTY</th>
          <th className="pb-1 font-normal text-right">AVG</th>
          <th className="pb-1 font-normal text-right">LAST</th>
          <th className="pb-1 font-normal text-right">P&L $</th>
          <th className="pb-1 font-normal text-right">P&L %</th>
          <th className="pb-1 font-normal text-right">STOP</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([ticker, pos]) => {
          const current = currentPrices[ticker] ?? pos.avgPrice;
          const pnlDollar = (current - pos.avgPrice) * pos.qty;
          const pnlPct = ((current - pos.avgPrice) / pos.avgPrice) * 100;
          const isPositive = pnlDollar >= 0;
          const colorClass = isPositive ? 'text-[#00ff41]' : 'text-[#ff3333]';

          return (
            <tr key={ticker} className="border-b border-[#111] h-6">
              <td className="font-mono text-[#e0e0e0]">{ticker}</td>
              <td className="font-mono tabular-nums text-right text-[#e0e0e0]">{pos.qty}</td>
              <td className="font-mono tabular-nums text-right text-[#e0e0e0]">{pos.avgPrice.toFixed(2)}</td>
              <td className="font-mono tabular-nums text-right text-[#e0e0e0]">{current.toFixed(2)}</td>
              <td className={`font-mono tabular-nums text-right ${colorClass}`}>
                {isPositive ? '+' : ''}{pnlDollar.toFixed(0)}
              </td>
              <td className={`font-mono tabular-nums text-right ${colorClass}`}>
                {isPositive ? '+' : ''}{pnlPct.toFixed(1)}%
              </td>
              <td className="font-mono tabular-nums text-right text-[#888]">
                {pos.stopPrice ? pos.stopPrice.toFixed(2) : '---'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
