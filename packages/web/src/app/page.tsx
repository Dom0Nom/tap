'use client';

import { useEffect, useState, useCallback } from 'react';
import { StatusBar } from '@/components/StatusBar';
import { Toolbar } from '@/components/Toolbar';
import { PanelFrame } from '@/components/PanelFrame';
import { EquityCurve } from '@/components/EquityCurve';
import { PositionsGrid } from '@/components/PositionsGrid';
import { SignalHeatmap } from '@/components/SignalHeatmap';
import { OrderBlotter } from '@/components/OrderBlotter';
import { BacktestStats } from '@/components/BacktestStats';
import { SystemLog } from '@/components/SystemLog';
import type { DemoData } from '@/lib/demo-data';

export default function Dashboard() {
  const [data, setData] = useState<DemoData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/backtest', { method: 'POST' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const result = await r.json();
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'r' || e.key === 'R') {
        fetchData();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fetchData]);

  if (error) {
    return (
      <main className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="font-[family-name:var(--font-mono)] text-sm mb-2" style={{ color: 'var(--accent-red)' }}>
            CONNECTION ERROR
          </div>
          <div className="font-[family-name:var(--font-mono)] text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            {error}
          </div>
          <button
            onClick={fetchData}
            className="px-3 py-1 rounded-sm text-[11px] font-semibold uppercase tracking-wide"
            style={{ background: 'var(--accent-blue)', color: '#080b0e' }}
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="inline-block w-5 h-5 border-2 border-t-transparent rounded-full animate-spin mb-3" style={{ borderColor: 'var(--accent-amber)', borderTopColor: 'transparent' }} />
          <div className="font-[family-name:var(--font-barlow-condensed)] text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-amber)' }}>
            Loading backtest data...
          </div>
        </div>
      </main>
    );
  }

  const currentPrices: Record<string, number> = {};
  for (const [ticker, pos] of Object.entries(data.positions)) {
    const hash = ticker.charCodeAt(0) + ticker.charCodeAt(1);
    const offset = ((hash % 13) - 4) / 100;
    currentPrices[ticker] = pos.avgPrice * (1 + offset);
  }

  return (
    <main className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <StatusBar dataSource={data.dataSource} isConnected={!error} />
      <Toolbar isLoading={isLoading} onRunBacktest={fetchData} onRefresh={fetchData} />

      <div className="flex-1 grid gap-px p-px overflow-hidden" style={{
        gridTemplateColumns: '2fr 1fr',
        gridTemplateRows: '2fr 1.2fr auto',
        background: 'var(--bg-primary)',
      }}>
        {/* Row 1: Equity Curve (hero) + Stats sidebar */}
        <PanelFrame title="Equity Curve" accentColor="var(--accent-green)" isLive>
          <EquityCurve data={data.equityCurve} />
        </PanelFrame>

        <PanelFrame title="Backtest Stats" accentColor="var(--accent-amber)">
          <BacktestStats
            metrics={data.metrics}
            numTrades={data.numTrades}
            numDays={data.equityCurve.length}
          />
        </PanelFrame>

        {/* Row 2: Positions + Signals + Orders (3-col within 2-col parent) */}
        <div className="grid gap-px overflow-hidden" style={{ gridTemplateColumns: '1fr 1.5fr', gridColumn: '1 / -1' }}>
          <PanelFrame title="Positions" accentColor="var(--accent-blue)">
            <PositionsGrid positions={data.positions} currentPrices={currentPrices} />
          </PanelFrame>

          <div className="grid gap-px" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
            <PanelFrame title="Signal Heatmap" accentColor="var(--accent-cyan)">
              <SignalHeatmap signals={data.signals} />
            </PanelFrame>

            <PanelFrame title="Order Blotter" accentColor="var(--accent-red)">
              <OrderBlotter orders={data.orders} />
            </PanelFrame>
          </div>
        </div>

        {/* Row 3: System log full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <PanelFrame title="System Log" accentColor="var(--text-muted)">
            <SystemLog />
          </PanelFrame>
        </div>
      </div>
    </main>
  );
}
