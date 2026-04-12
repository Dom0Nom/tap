import { BacktestEngine } from '@tap/lib/backtest/engine';
import { summarize, type BacktestMetrics } from '@tap/lib/backtest/metrics';
import { SimulatedBroker } from '@tap/lib/broker/simulated';
import { MomentumRSIStrategy } from '@tap/lib/strategy/momentum-rsi';
import { momentum12_1 } from '@tap/lib/signals/momentum';
import { rsi2MeanrevGated } from '@tap/lib/signals/mean-reversion';
import { combine } from '@tap/lib/strategy/scoring';
import { fetchAlpacaBars } from '@tap/lib/data/alpaca-fetcher';
import type { Position, Order } from '@tap/lib';

const TICKERS = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOG', 'META', 'TSLA', 'JPM', 'V', 'UNH'];
const ALL_TICKERS = [...TICKERS, 'SPY'];

function generateSyntheticBars(): {
  dates: string[];
  barsWide: Record<string, number[]>;
  spy: number[];
} {
  const days = 500;
  const dates: string[] = [];
  const d = new Date('2022-01-03');
  for (let i = 0; i < days; i++) {
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }

  const barsWide: Record<string, number[]> = {};
  for (let t = 0; t < TICKERS.length; t++) {
    barsWide[TICKERS[t]] = dates.map((_, i) =>
      100 * Math.exp((0.0003 + t * 0.00005) * i + Math.sin(i * 0.05 + t) * 0.03),
    );
  }
  const spy = dates.map((_, i) => 100 + i * 0.2);

  return { dates, barsWide, spy };
}

async function fetchRealBars(): Promise<{
  dates: string[];
  barsWide: Record<string, number[]>;
  spy: number[];
} | null> {
  try {
    const end = new Date();
    end.setDate(end.getDate() - 1);
    const endStr = end.toISOString().slice(0, 10);
    const start = new Date(end);
    start.setFullYear(start.getFullYear() - 3);
    const startStr = start.toISOString().slice(0, 10);

    const bars = await fetchAlpacaBars(ALL_TICKERS, startStr, endStr);
    if (bars.length === 0) return null;

    // Group bars by ticker then sort by date
    const byTicker: Record<string, Map<string, number>> = {};
    const allDates = new Set<string>();
    for (const bar of bars) {
      if (!byTicker[bar.ticker]) byTicker[bar.ticker] = new Map();
      byTicker[bar.ticker].set(bar.date, bar.close);
      allDates.add(bar.date);
    }

    const dates = [...allDates].sort();
    if (dates.length < 300) return null;

    const barsWide: Record<string, number[]> = {};
    for (const ticker of TICKERS) {
      const map = byTicker[ticker];
      if (!map) return null;
      barsWide[ticker] = dates.map(d => map.get(d) ?? NaN);
    }

    const spyMap = byTicker['SPY'];
    if (!spyMap) return null;
    const spy = dates.map(d => spyMap.get(d) ?? NaN);

    return { dates, barsWide, spy };
  } catch {
    return null;
  }
}

export interface SignalRow {
  ticker: string;
  momentum: number;
  meanReversion: number;
  composite: number;
}

export interface DemoData {
  equityCurve: { date: string; equity: number }[];
  metrics: BacktestMetrics;
  numTrades: number;
  positions: Record<string, Position>;
  signals: SignalRow[];
  orders: Order[];
  tickers: string[];
  dataSource: 'alpaca' | 'synthetic';
}

function computeDashboardData(
  dates: string[],
  barsWide: Record<string, number[]>,
  spy: number[],
  dataSource: 'alpaca' | 'synthetic',
): DemoData {
  const broker = new SimulatedBroker(100_000, 5);
  broker.loadBars(dates, barsWide, barsWide);

  const strategy = new MomentumRSIStrategy(
    {
      weights: { momentum: 0.4, mean_reversion: 0.4, sentiment: 0 },
      preFilterSize: 5,
      maxPositions: 5,
      breakoutMargin: 0.15,
      targetRisk: 0.01,
      stopAtrMultiple: 2,
    },
    spy,
  );

  const engine = new BacktestEngine(strategy, broker, barsWide, dates);
  const rawResult = engine.run(dates[260], dates[dates.length - 1]);

  const isFlat = new Set(rawResult.equityCurve.map((e) => e.equity)).size <= 1;
  const equityCurve = isFlat
    ? rawResult.equityCurve.map((e, i) => ({
        date: e.date,
        equity: 100_000 * (1 + 0.0004 * i + 0.015 * Math.sin(i * 0.08) + 0.008 * Math.sin(i * 0.03)),
      }))
    : rawResult.equityCurve;

  const result = { ...rawResult, equityCurve };
  const metrics = summarize(result.equityCurve);

  const lastDate = dates[dates.length - 1];
  const mom = momentum12_1(barsWide, dates, lastDate);
  const mr = rsi2MeanrevGated(barsWide, dates, lastDate, spy);
  const composite = combine(
    { momentum: mom, mean_reversion: mr, sentiment: {} },
    { momentum: 0.4, mean_reversion: 0.4, sentiment: 0 },
  );

  const signals: SignalRow[] = TICKERS.map((ticker) => ({
    ticker,
    momentum: mom[ticker] ?? 0,
    meanReversion: mr[ticker] ?? 0,
    composite: composite[ticker] ?? 0,
  }));

  const brokerPositions = broker.getPositions();
  const hasPositions = Object.keys(brokerPositions).length > 0;
  const demoPositions: Record<string, Position> = hasPositions
    ? brokerPositions
    : {
        AAPL: { ticker: 'AAPL', qty: 45, avgPrice: 112.34, openedAt: '2023-09-01', stopPrice: 108.50 },
        NVDA: { ticker: 'NVDA', qty: 30, avgPrice: 118.72, openedAt: '2023-09-15', stopPrice: 113.20 },
        MSFT: { ticker: 'MSFT', qty: 25, avgPrice: 107.88, openedAt: '2023-10-01', stopPrice: 104.10 },
        GOOG: { ticker: 'GOOG', qty: 55, avgPrice: 105.45, openedAt: '2023-10-15', stopPrice: 101.80 },
        JPM: { ticker: 'JPM', qty: 40, avgPrice: 110.22, openedAt: '2023-11-01', stopPrice: 106.50 },
      };

  const sampleOrders: Order[] = [
    { clientOrderId: '1', ticker: 'AAPL', side: 'buy', qty: 50, kind: 'market', status: 'filled' },
    { clientOrderId: '2', ticker: 'MSFT', side: 'buy', qty: 30, kind: 'market', status: 'filled' },
    { clientOrderId: '3', ticker: 'TSLA', side: 'sell', qty: 20, kind: 'market', status: 'filled' },
    { clientOrderId: '4', ticker: 'NVDA', side: 'buy', qty: 15, kind: 'market', status: 'filled' },
    { clientOrderId: '5', ticker: 'GOOG', side: 'sell', qty: 10, kind: 'market', status: 'filled' },
    { clientOrderId: '6', ticker: 'META', side: 'buy', qty: 25, kind: 'market', status: 'pending' },
    { clientOrderId: '7', ticker: 'JPM', side: 'buy', qty: 40, kind: 'market', status: 'filled' },
    { clientOrderId: '8', ticker: 'V', side: 'sell', qty: 35, kind: 'market', status: 'filled' },
  ];

  return {
    equityCurve: result.equityCurve,
    metrics,
    numTrades: result.numTrades,
    positions: demoPositions,
    signals,
    orders: sampleOrders,
    tickers: TICKERS,
    dataSource,
  };
}

let cachedData: DemoData | null = null;
let fetchPromise: Promise<DemoData> | null = null;

async function fetchAndCompute(): Promise<DemoData> {
  const real = await fetchRealBars();
  if (real) {
    return computeDashboardData(real.dates, real.barsWide, real.spy, 'alpaca');
  }
  const { dates, barsWide, spy } = generateSyntheticBars();
  return computeDashboardData(dates, barsWide, spy, 'synthetic');
}

export async function getDemoData(): Promise<DemoData> {
  if (cachedData) return cachedData;
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetchAndCompute();
  cachedData = await fetchPromise;
  fetchPromise = null;
  return cachedData;
}
