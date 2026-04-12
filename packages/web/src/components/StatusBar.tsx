'use client';

import { useEffect, useState } from 'react';

interface StatusBarProps {
  dataSource: 'alpaca' | 'synthetic' | null;
  isConnected: boolean;
}

export function StatusBar({ dataSource, isConnected }: StatusBarProps) {
  const [time, setTime] = useState('');

  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime(now.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).toUpperCase());
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const sourceBadge = dataSource === 'alpaca' ? 'ALPACA PAPER' : dataSource === 'synthetic' ? 'SYNTHETIC' : '---';

  return (
    <div
      className="flex items-center justify-between px-3 py-1.5 border-b"
      style={{ background: 'var(--bg-panel-header)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span
            className="animate-blink inline-block w-2 h-2 rounded-full"
            style={{ background: isConnected ? 'var(--accent-cyan)' : 'var(--accent-red)' }}
          />
          <span
            className="font-[family-name:var(--font-barlow-condensed)] text-[11px] font-semibold tracking-wider uppercase"
            style={{ color: isConnected ? 'var(--accent-cyan)' : 'var(--accent-red)' }}
          >
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
        <span className="font-[family-name:var(--font-barlow-condensed)] text-sm font-semibold tracking-wide" style={{ color: 'var(--text-primary)' }}>
          tap <span style={{ color: 'var(--text-muted)' }}>&middot;</span> mission control
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span
          className="font-[family-name:var(--font-barlow-condensed)] text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-sm"
          style={{ background: 'var(--bg-primary)', color: dataSource === 'alpaca' ? 'var(--accent-green)' : 'var(--accent-amber)', border: '1px solid var(--border)' }}
        >
          {sourceBadge}
        </span>
        <span className="font-[family-name:var(--font-mono)] text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
          {time}
        </span>
      </div>
    </div>
  );
}
