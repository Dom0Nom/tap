'use client';

import { useState } from 'react';
import type { SignalRow } from '@/lib/demo-data';

interface SignalHeatmapProps {
  signals: SignalRow[];
  onTickerSelect?: (ticker: string) => void;
  selectedTicker?: string;
}

function signalStyle(value: number): { bg: string; color: string } {
  const abs = Math.abs(value);
  if (value > 0) {
    const opacity = Math.min(abs * 2, 0.6);
    return { bg: `rgba(63,185,80,${opacity})`, color: abs > 0.1 ? 'var(--text-primary)' : 'var(--text-secondary)' };
  }
  if (value < 0) {
    const opacity = Math.min(abs * 2, 0.6);
    return { bg: `rgba(248,81,73,${opacity})`, color: abs > 0.1 ? 'var(--text-primary)' : 'var(--text-secondary)' };
  }
  return { bg: 'transparent', color: 'var(--text-muted)' };
}

const COLUMNS: { key: keyof Omit<SignalRow, 'ticker'>; label: string }[] = [
  { key: 'momentum', label: 'MOM' },
  { key: 'meanReversion', label: 'MR' },
  { key: 'composite', label: 'COMP' },
];

export function SignalHeatmap({ signals, onTickerSelect, selectedTicker }: SignalHeatmapProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  if (signals.length === 0) return <div style={{ color: 'var(--text-muted)' }}>No signals</div>;

  return (
    <table className="w-full text-[11px] border-collapse">
      <thead>
        <tr>
          <th
            className="pb-1.5 font-[family-name:var(--font-barlow-condensed)] font-semibold text-[10px] tracking-wider uppercase text-left"
            style={{ color: 'var(--text-muted)' }}
          >
            TICKER
          </th>
          {COLUMNS.map((col) => (
            <th
              key={col.key}
              className="pb-1.5 font-[family-name:var(--font-barlow-condensed)] font-semibold text-[10px] tracking-wider uppercase text-center cursor-default"
              style={{ color: 'var(--text-muted)' }}
            >
              {col.label} <span style={{ color: 'var(--border)' }}>&#9662;</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {signals.map((row) => {
          const isHovered = hoveredRow === row.ticker;
          return (
            <tr
              key={row.ticker}
              className="h-6 transition-colors"
              style={{ background: isHovered ? 'rgba(255,255,255,0.03)' : 'transparent' }}
              onMouseEnter={() => setHoveredRow(row.ticker)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <td
                className="font-[family-name:var(--font-mono)] pr-2 cursor-pointer"
                style={{ color: row.ticker === selectedTicker ? 'var(--accent-amber)' : 'var(--text-primary)' }}
                onClick={() => onTickerSelect?.(row.ticker)}
              >
                {row.ticker}
              </td>
              {COLUMNS.map((col) => {
                const val = row[col.key];
                const style = signalStyle(val);
                return (
                  <td
                    key={col.key}
                    className="text-center font-[family-name:var(--font-mono)] tabular-nums px-1.5 py-0.5"
                    style={{ background: style.bg, color: style.color, borderRadius: '1px' }}
                  >
                    {val.toFixed(3)}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
