'use client';

import { useEffect, useState } from 'react';
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/backtest', { method: 'POST' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Unknown error');
      });
  }, []);

  if (error) {
    return (
      <main className="h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-[#ff3333] font-mono text-sm">ERROR: {error}</div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-[#ffaa00] font-mono text-sm animate-pulse">LOADING BACKTEST...</div>
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
    <main className="h-screen p-0.5 grid grid-cols-3 grid-rows-3 gap-px bg-[#1a1a2e]">
      <PanelFrame title="Equity Curve" className="col-span-2 row-span-1">
        <EquityCurve data={data.equityCurve} />
      </PanelFrame>

      <PanelFrame title="Backtest Stats">
        <BacktestStats
          metrics={data.metrics}
          numTrades={data.numTrades}
          numDays={data.equityCurve.length}
        />
      </PanelFrame>

      <PanelFrame title="Positions">
        <PositionsGrid positions={data.positions} currentPrices={currentPrices} />
      </PanelFrame>

      <PanelFrame title="Signal Heatmap" className="col-span-2">
        <SignalHeatmap signals={data.signals} />
      </PanelFrame>

      <PanelFrame title="Order Blotter">
        <OrderBlotter orders={data.orders} />
      </PanelFrame>

      <PanelFrame title="System Log" className="col-span-2">
        <SystemLog />
      </PanelFrame>
    </main>
  );
}
