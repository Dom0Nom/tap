'use client';

import { useState } from 'react';

interface ScriptDef {
  id: string;
  name: string;
  description: string;
}

const SCRIPTS: ScriptDef[] = [
  { id: 'sync-bars', name: 'SYNC BARS', description: 'Fetch latest from Alpaca' },
  { id: 'run-signals', name: 'RUN SIGNALS', description: 'Compute current signals' },
  { id: 'run-backtest', name: 'RUN BACKTEST', description: 'Full backtest on local data' },
];

type ScriptStatus = 'idle' | 'running' | 'success' | 'failed';

export function ScriptsPanel() {
  const [statuses, setStatuses] = useState<Record<string, ScriptStatus>>({});
  const [output, setOutput] = useState<string>('');
  const [activeScript, setActiveScript] = useState<string | null>(null);

  async function runScript(id: string) {
    setStatuses(prev => ({ ...prev, [id]: 'running' }));
    setActiveScript(id);
    setOutput(`Running ${id}...`);

    try {
      const res = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId: id }),
      });
      const data = await res.json();
      setOutput(data.output || 'No output');
      setStatuses(prev => ({ ...prev, [id]: data.success ? 'success' : 'failed' }));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setOutput(`Error: ${message}`);
      setStatuses(prev => ({ ...prev, [id]: 'failed' }));
    }
  }

  const isAnyRunning = Object.values(statuses).some(s => s === 'running');

  return (
    <div className="flex flex-col h-full">
      <div className="space-y-1 mb-2">
        {SCRIPTS.map(s => (
          <div key={s.id} className="flex items-center gap-2 px-1">
            <button
              onClick={() => runScript(s.id)}
              disabled={isAnyRunning}
              className="shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider
                rounded-sm transition-all
                hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'var(--accent-blue)',
                color: '#000',
              }}
            >
              {statuses[s.id] === 'running' ? '\u27F3' : '\u25B6'}
            </button>
            <div className="min-w-0 flex-1">
              <span
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{
                  fontFamily: 'var(--font-barlow-condensed)',
                  color: 'var(--text-primary)',
                }}
              >
                {s.name}
              </span>
              <span className="text-[10px] ml-2" style={{ color: 'var(--text-muted)' }}>
                {s.description}
              </span>
            </div>
            <StatusBadge status={statuses[s.id] ?? 'idle'} />
          </div>
        ))}
      </div>
      <div
        className="flex-1 overflow-auto rounded-sm p-1"
        style={{
          background: 'rgba(0,0,0,0.5)',
          border: '1px solid var(--border)',
        }}
      >
        <pre
          className="text-[10px] font-mono whitespace-pre-wrap"
          style={{ color: 'var(--text-secondary)' }}
        >
          {output || 'No script output yet. Click \u25B6 to run a script.'}
        </pre>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ScriptStatus }) {
  const styles: Record<ScriptStatus, { color: string; label: string; animate: boolean }> = {
    idle: { color: 'var(--text-muted)', label: '\u25CF', animate: false },
    running: { color: 'var(--accent-blue)', label: '\u25C9', animate: true },
    success: { color: 'var(--accent-green)', label: '\u2713', animate: false },
    failed: { color: 'var(--accent-red)', label: '\u2717', animate: false },
  };
  const s = styles[status];
  return (
    <span
      className={`text-[10px] ${s.animate ? 'animate-pulse' : ''}`}
      style={{ color: s.color }}
    >
      {s.label}
    </span>
  );
}
