interface EquityCurveProps {
  data: { date: string; equity: number }[];
}

export function EquityCurve({ data }: EquityCurveProps) {
  if (data.length === 0) return <div className="text-[#555]">No data</div>;

  const startEquity = data[0].equity;
  const endEquity = data[data.length - 1].equity;
  const totalReturn = (endEquity / startEquity - 1) * 100;
  const isPositive = totalReturn >= 0;

  const equities = data.map((d) => d.equity);
  const minE = Math.min(...equities);
  const maxE = Math.max(...equities);
  const range = maxE - minE || 1;

  const W = 600;
  const H = 140;
  const PADDING_TOP = 10;
  const PADDING_BOTTOM = 4;
  const chartH = H - PADDING_TOP - PADDING_BOTTOM;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = PADDING_TOP + chartH - ((d.equity - minE) / range) * chartH;
    return `${x},${y}`;
  });

  const polyline = points.join(' ');
  const areaPath = `M0,${H} L${points.map((p) => `L${p}`).join(' ')} L${W},${H} Z`;

  const strokeColor = isPositive ? '#00ff41' : '#ff3333';
  const fillColor = isPositive ? 'rgba(0,255,65,0.08)' : 'rgba(255,51,51,0.08)';

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-[#e0e0e0] text-sm font-mono tabular-nums">
          ${endEquity.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
        <span className={`text-sm font-mono tabular-nums ${isPositive ? 'text-[#00ff41]' : 'text-[#ff3333]'}`}>
          {isPositive ? '+' : ''}{totalReturn.toFixed(2)}%
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
        <path d={areaPath} fill={fillColor} />
        <polyline points={polyline} fill="none" stroke={strokeColor} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between text-[10px] text-[#555] mt-0.5">
        <span>{data[0].date}</span>
        <span>{data[data.length - 1].date}</span>
      </div>
    </div>
  );
}
