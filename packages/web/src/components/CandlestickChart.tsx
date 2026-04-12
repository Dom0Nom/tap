'use client';

import { useEffect, useRef } from 'react';
import { createChart, type IChartApi, type CandlestickData, type HistogramData, ColorType, CandlestickSeries, HistogramSeries } from 'lightweight-charts';

export interface OHLCVBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandlestickChartProps {
  ticker: string;
  bars: OHLCVBar[];
}

export function CandlestickChart({ ticker, bars }: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || bars.length === 0) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#000000' },
        textColor: '#8b949e',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: '#111111' },
        horzLines: { color: '#111111' },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: '#ffffff30', style: 2, width: 1 },
        horzLine: { color: '#ffffff30', style: 2, width: 1 },
      },
      rightPriceScale: {
        borderColor: '#151515',
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: '#151515',
        timeVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#3fb950',
      downColor: '#f85149',
      borderUpColor: '#3fb950',
      borderDownColor: '#f85149',
      wickUpColor: '#3fb95080',
      wickDownColor: '#f8514980',
    });

    const candleData: CandlestickData[] = bars.map(b => ({
      time: b.date as unknown as CandlestickData['time'],
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }));
    candleSeries.setData(candleData);

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#ffffff10',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    const volumeData: HistogramData[] = bars.map(b => ({
      time: b.date as unknown as HistogramData['time'],
      value: b.volume,
      color: b.close >= b.open ? '#3fb95020' : '#f8514920',
    }));
    volumeSeries.setData(volumeData);

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [bars]);

  return (
    <div className="w-full h-full relative">
      <div className="absolute top-1 left-2 z-10 font-[family-name:var(--font-barlow-condensed)] text-[var(--accent-amber)] text-xs uppercase tracking-wider font-semibold">
        {ticker}
      </div>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
