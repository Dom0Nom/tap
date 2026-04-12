'use client';

import { useState } from 'react';

interface ToolbarProps {
  isLoading: boolean;
  onRunBacktest: () => void;
  onRefresh: () => void;
}

export function Toolbar({ isLoading, onRunBacktest, onRefresh }: ToolbarProps) {
  const [weights, setWeights] = useState({ momentum: 0.4, meanReversion: 0.4, sentiment: 0.2 });

  function handleWeight(key: keyof typeof weights, value: number) {
    setWeights(prev => ({ ...prev, [key]: value }));
  }

  return (
    <div
      className="flex items-center gap-4 px-3 py-1 border-b"
      style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
    >
      <button
        onClick={onRunBacktest}
        disabled={isLoading}
        className="flex items-center gap-1.5 px-3 py-1 rounded-sm text-[11px] font-semibold uppercase tracking-wide transition-all active:scale-95 disabled:opacity-50"
        style={{ background: 'var(--accent-blue)', color: '#080b0e' }}
      >
        {isLoading ? (
          <span className="inline-block w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#080b0e', borderTopColor: 'transparent' }} />
        ) : (
          <span>&#9654;</span>
        )}
        Run Backtest
      </button>

      <button
        onClick={onRefresh}
        disabled={isLoading}
        className="flex items-center gap-1 px-2.5 py-1 rounded-sm text-[11px] font-semibold uppercase tracking-wide transition-all active:scale-95 disabled:opacity-50"
        style={{ background: 'var(--bg-panel-header)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
      >
        &#10227; Refresh
      </button>

      <div className="h-4 w-px mx-1" style={{ background: 'var(--border)' }} />

      <div className="flex items-center gap-4">
        {([
          { key: 'momentum' as const, label: 'MOM' },
          { key: 'meanReversion' as const, label: 'MR' },
          { key: 'sentiment' as const, label: 'SENT' },
        ]).map(({ key, label }) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="font-[family-name:var(--font-barlow-condensed)] text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {label}
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={weights[key]}
              onChange={(e) => handleWeight(key, parseFloat(e.target.value))}
              className="w-16"
            />
            <span className="font-[family-name:var(--font-mono)] text-[10px] tabular-nums w-6" style={{ color: 'var(--text-secondary)' }}>
              {weights[key].toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <div className="ml-auto">
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <kbd className="px-1 py-0.5 rounded-sm text-[9px]" style={{ background: 'var(--bg-panel-header)', border: '1px solid var(--border)' }}>R</kbd>
          <span className="ml-1 mr-3">run</span>
        </span>
      </div>
    </div>
  );
}
