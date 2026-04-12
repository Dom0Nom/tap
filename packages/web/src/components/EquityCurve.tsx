'use client';

import { useState, useCallback } from 'react';

interface EquityCurveProps {
  data: { date: string; equity: number }[];
}

export function EquityCurve({ data }: EquityCurveProps) {
  const [hover, setHover] = useState<{ x: number; y: number; idx: number } | null>(null);

  if (data.length === 0) return <div style={{ color: 'var(--text-muted)' }}>No data</div>;

  const startEquity = data[0].equity;
  const endEquity = data[data.length - 1].equity;
  const totalReturn = (endEquity / startEquity - 1) * 100;
  const isPositive = totalReturn >= 0;

  const equities = data.map((d) => d.equity);
  const minE = Math.min(...equities);
  const maxE = Math.max(...equities);
  const range = maxE - minE || 1;

  const W = 800;
  const H = 220;
  const PAD_TOP = 20;
  const PAD_BOTTOM = 24;
  const PAD_LEFT = 60;
  const PAD_RIGHT = 10;
  const chartW = W - PAD_LEFT - PAD_RIGHT;
  const chartH = H - PAD_TOP - PAD_BOTTOM;

  const xScale = (i: number) => PAD_LEFT + (i / (data.length - 1)) * chartW;
  const yScale = (eq: number) => PAD_TOP + chartH - ((eq - minE) / range) * chartH;

  const points = data.map((d, i) => `${xScale(i)},${yScale(d.equity)}`);
  const polyline = points.join(' ');
  const areaPath = `M${PAD_LEFT},${PAD_TOP + chartH} ${points.map((p) => `L${p}`).join(' ')} L${xScale(data.length - 1)},${PAD_TOP + chartH} Z`;

  const strokeColor = isPositive ? 'var(--accent-green)' : 'var(--accent-red)';
  const fillId = isPositive ? 'grad-green' : 'grad-red';

  const gridLines = 5;
  const yTicks = Array.from({ length: gridLines }, (_, i) => {
    const val = minE + (range * i) / (gridLines - 1);
    const y = yScale(val);
    return { val, y };
  });

  const monthBoundaries: { x: number; label: string }[] = [];
  let lastMonth = '';
  for (let i = 0; i < data.length; i++) {
    const m = data[i].date.slice(0, 7);
    if (m !== lastMonth) {
      lastMonth = m;
      const d = new Date(data[i].date);
      monthBoundaries.push({
        x: xScale(i),
        label: d.toLocaleString('en-US', { month: 'short', year: '2-digit' }).toUpperCase(),
      });
    }
  }
  const visibleMonths = monthBoundaries.filter((_, i) => i % Math.ceil(monthBoundaries.length / 12) === 0);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((relX - PAD_LEFT) / chartW) * (data.length - 1));
    if (idx >= 0 && idx < data.length) {
      setHover({ x: xScale(idx), y: yScale(data[idx].equity), idx });
    }
  }, [data, chartW]);

  const hoverData = hover ? data[hover.idx] : null;

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-2">
        <span className="font-[family-name:var(--font-mono)] text-xl font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
          ${endEquity.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
        <span className="font-[family-name:var(--font-mono)] text-sm tabular-nums" style={{ color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)' }}>
          {isPositive ? '+' : ''}{totalReturn.toFixed(2)}%
        </span>
        {hoverData && (
          <span className="font-[family-name:var(--font-mono)] text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {hoverData.date} &mdash; ${hoverData.equity.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
        style={{ cursor: 'crosshair' }}
      >
        <defs>
          <linearGradient id="grad-green" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3fb950" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3fb950" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="grad-red" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f85149" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f85149" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD_LEFT} y1={t.y} x2={W - PAD_RIGHT} y2={t.y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2,3" />
            <text x={PAD_LEFT - 6} y={t.y + 3} textAnchor="end" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-mono)">
              {t.val >= 1000 ? `${(t.val / 1000).toFixed(0)}k` : t.val.toFixed(0)}
            </text>
          </g>
        ))}

        {visibleMonths.map((m, i) => (
          <g key={i}>
            <line x1={m.x} y1={PAD_TOP} x2={m.x} y2={PAD_TOP + chartH} stroke="var(--border)" strokeWidth="0.5" opacity="0.4" />
            <text x={m.x} y={H - 4} textAnchor="middle" fill="var(--text-muted)" fontSize="8" fontFamily="var(--font-mono)">
              {m.label}
            </text>
          </g>
        ))}

        <path d={areaPath} fill={`url(#${fillId})`} />
        <polyline points={polyline} fill="none" stroke={strokeColor} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />

        {hover && (
          <g>
            <line x1={hover.x} y1={PAD_TOP} x2={hover.x} y2={PAD_TOP + chartH} stroke="var(--text-muted)" strokeWidth="0.5" strokeDasharray="2,2" />
            <line x1={PAD_LEFT} y1={hover.y} x2={W - PAD_RIGHT} y2={hover.y} stroke="var(--text-muted)" strokeWidth="0.5" strokeDasharray="2,2" />
            <circle cx={hover.x} cy={hover.y} r="3" fill={strokeColor} stroke="var(--bg-panel)" strokeWidth="1.5" />
          </g>
        )}
      </svg>
    </div>
  );
}
