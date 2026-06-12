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
import { ScriptsPanel } from '@/components/ScriptsPanel';
import { CandlestickChart } from '@/components/CandlestickChart';
import type { DemoData } from '@/lib/demo-data';

export default function Dashboard() {
  const [data, setData] = useState<DemoData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicker, setSelectedTicker] = useState('AAPL');

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
            style={{ background: 'var(--accent-blue)', color: '#000000' }}
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

  const tickerBars = data.bars?.[selectedTicker] ?? [];

  return (
    <main className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <StatusBar dataSource={data.dataSource} isConnected={!error} />
      <Toolbar isLoading={isLoading} onRunBacktest={fetchData} onRefresh={fetchData} />

      <div className="flex items-center gap-0 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}>
        {data.tickers.map(ticker => (
          <button
            key={ticker}
            onClick={() => setSelectedTicker(ticker)}
            className="px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider font-[family-name:var(--font-barlow-condensed)] transition-colors"
            style={{
              color: ticker === selectedTicker ? 'var(--accent-amber)' : 'var(--text-muted)',
              background: ticker === selectedTicker ? 'var(--bg-panel-header)' : 'transparent',
              borderBottom: ticker === selectedTicker ? '1px solid var(--accent-amber)' : '1px solid transparent',
            }}
          >
            {ticker}
          </button>
        ))}
      </div>

      <div className="flex-1 grid gap-px overflow-hidden" style={{
        gridTemplateColumns: '3fr 1fr',
        gridTemplateRows: 'minmax(350px, 1.5fr) 1fr auto',
        background: 'var(--bg-primary)',
      }}>
        <PanelFrame title={`${selectedTicker} — Daily`} accentColor="var(--accent-green)" isLive>
          <CandlestickChart ticker={selectedTicker} bars={tickerBars} />
        </PanelFrame>

        <div className="grid gap-px" style={{ gridTemplateRows: '1fr 1fr' }}>
          <PanelFrame title="Equity Curve" accentColor="var(--accent-cyan)">
            <EquityCurve data={data.equityCurve} />
          </PanelFrame>

          <PanelFrame title="Backtest Stats" accentColor="var(--accent-amber)">
            <BacktestStats
              metrics={data.metrics}
              numTrades={data.numTrades}
              numDays={data.equityCurve.length}
            />
          </PanelFrame>
        </div>

        <div className="grid gap-px overflow-hidden" style={{ gridTemplateColumns: '1fr 1.5fr', gridColumn: '1 / -1' }}>
          <PanelFrame title="Positions" accentColor="var(--accent-blue)">
            <PositionsGrid positions={data.positions} currentPrices={currentPrices} />
          </PanelFrame>

          <div className="grid gap-px" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
            <PanelFrame title="Signal Heatmap" accentColor="var(--accent-cyan)">
              <SignalHeatmap signals={data.signals} onTickerSelect={setSelectedTicker} selectedTicker={selectedTicker} />
            </PanelFrame>

            <PanelFrame title="Order Blotter" accentColor="var(--accent-red)">
              <OrderBlotter orders={data.orders} />
            </PanelFrame>
          </div>
        </div>

        <div className="grid gap-px" style={{ gridColumn: '1 / -1', gridTemplateColumns: '2fr 1fr' }}>
          <PanelFrame title="System Log" accentColor="var(--text-muted)">
            <SystemLog />
          </PanelFrame>
          <PanelFrame title="Scripts" accentColor="var(--accent-amber)">
            <ScriptsPanel />
          </PanelFrame>
        </div>
      </div>
    </main>
  );
}
