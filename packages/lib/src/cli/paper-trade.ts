#!/usr/bin/env tsx
import Database from 'better-sqlite3';
import { blendedMomentum } from '../signals/momentum.js';
import { rsi2MeanrevGated } from '../signals/mean-reversion.js';
import { combine } from '../strategy/scoring.js';
import { volTargetShares } from '../risk/sizing.js';
import { applyCaps } from '../risk/portfolio.js';
import { pctChange, std as arrayStd, tail, dropNaN } from '../utils/math.js';
import { getAccount, getPositions, submitOrder } from '../data/alpaca-trading.js';

const WEIGHTS = { momentum: 0.4, mean_reversion: 0.4, sentiment: 0.0 };
const MAX_POSITIONS = 5;
const PRE_FILTER_SIZE = 5;
const TARGET_RISK = 0.01;

interface BarRow { ticker: string; date: string; close: number }
interface DateRow { date: string }
interface TickerRow { ticker: string }

async function main() {
  console.log('[paper-trade] Starting paper trading run...');
  console.log('[paper-trade] NOTE: If markets are closed, orders will queue for next open.\n');

  const account = await getAccount();
  const equity = parseFloat(account.equity as string);
  const cash = parseFloat(account.cash as string);
  const buyingPower = parseFloat(account.buying_power as string);
  console.log(`[account] Equity: $${equity.toLocaleString()} | Cash: $${cash.toLocaleString()} | Buying Power: $${buyingPower.toLocaleString()}`);

  const positions = await getPositions();
  const positionMap = new Map<string, { qty: number; avgPrice: number; currentPrice: number; pnl: number }>();
  for (const p of positions) {
    positionMap.set(p.symbol as string, {
      qty: parseInt(p.qty as string),
      avgPrice: parseFloat(p.avg_entry_price as string),
      currentPrice: parseFloat(p.current_price as string),
      pnl: parseFloat(p.unrealized_pl as string),
    });
  }
  console.log(`[positions] ${positionMap.size} open positions`);
  for (const [sym, pos] of positionMap) {
    const pnlStr = pos.pnl >= 0 ? `+$${pos.pnl.toFixed(2)}` : `-$${Math.abs(pos.pnl).toFixed(2)}`;
    console.log(`  ${sym}: ${pos.qty} shares @ $${pos.avgPrice.toFixed(2)} (${pnlStr})`);
  }

  const db = new Database('data/bars.sqlite');
  const tickers = (db.prepare("SELECT DISTINCT ticker FROM bars WHERE ticker != 'SPY' ORDER BY ticker").all() as TickerRow[]).map(r => r.ticker);
  const dates = (db.prepare('SELECT DISTINCT date FROM bars ORDER BY date').all() as DateRow[]).map(r => r.date);

  if (dates.length < 260) {
    console.error('[paper-trade] Need 260+ bars. Run sync-bars first.');
    process.exit(1);
  }

  const barsWide: Record<string, number[]> = {};
  for (const t of [...tickers, 'SPY']) {
    const rows = db.prepare('SELECT date, close FROM bars WHERE ticker = ? ORDER BY date').all(t) as BarRow[];
    const closeMap = new Map(rows.map(r => [r.date, r.close]));
    barsWide[t] = dates.map(d => closeMap.get(d) ?? NaN);
  }
  const spyCloses = barsWide['SPY'] ?? [];
  db.close();

  const asOf = dates[dates.length - 1];
  console.log(`\n[signals] Computing as of ${asOf}...`);

  const mom = blendedMomentum(barsWide, dates, asOf);
  const nonSpyWide = Object.fromEntries(Object.entries(barsWide).filter(([k]) => k !== 'SPY'));
  const mr = rsi2MeanrevGated(nonSpyWide, dates, asOf, spyCloses);
  const scored = combine({ momentum: mom, mean_reversion: mr, sentiment: {} }, WEIGHTS);

  const sorted = Object.entries(scored).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, PRE_FILTER_SIZE);
  const capped = applyCaps(Object.fromEntries(top), MAX_POSITIONS);

  console.log('\n[ranked]');
  for (const [ticker, score] of sorted) {
    const picked = ticker in capped ? ' << PICK' : '';
    console.log(`  ${ticker.padEnd(6)} ${score >= 0 ? '+' : ''}${score.toFixed(4)}${picked}`);
  }

  const existingSymbols = new Set(positionMap.keys());
  const targetSymbols = new Set(Object.keys(capped));

  const toSell: { symbol: string; qty: number }[] = [];
  for (const [sym, pos] of positionMap) {
    if (!targetSymbols.has(sym)) {
      toSell.push({ symbol: sym, qty: pos.qty });
    }
  }

  const toBuy: { symbol: string; qty: number }[] = [];
  for (const ticker of Object.keys(capped)) {
    if (existingSymbols.has(ticker)) continue;

    const history = barsWide[ticker];
    if (!history) continue;
    const price = history[history.length - 1];
    const returns = dropNaN(pctChange(history));
    const stdev20 = arrayStd(tail(returns, 20));
    const shares = volTargetShares(price, stdev20, equity, TARGET_RISK);
    if (shares > 0) {
      toBuy.push({ symbol: ticker, qty: shares });
    }
  }

  if (toSell.length === 0 && toBuy.length === 0) {
    console.log('\n[paper-trade] No trades needed -- portfolio matches target.');
    return;
  }

  console.log('\n[orders] Submitting to Alpaca paper trading...');
  console.log(`  SELLS: ${toSell.length} | BUYS: ${toBuy.length}`);
  console.log('  These are REAL market orders on Alpaca paper. They will fill at market price.\n');

  const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');

  for (const sell of toSell) {
    const clientId = `tap-${timestamp}-${sell.symbol}-sell`;
    console.log(`  SELL ${sell.qty} ${sell.symbol} (client_id: ${clientId})`);
    try {
      const result = await submitOrder({
        symbol: sell.symbol,
        qty: sell.qty,
        side: 'sell',
        type: 'market',
        timeInForce: 'day',
        clientOrderId: clientId,
      });
      console.log(`    -> Order ${result.id} status: ${result.status}`);
    } catch (e) {
      console.error(`    FAILED: ${e}`);
    }
  }

  for (const buy of toBuy) {
    const clientId = `tap-${timestamp}-${buy.symbol}-buy`;
    console.log(`  BUY ${buy.qty} ${buy.symbol} (client_id: ${clientId})`);
    try {
      const result = await submitOrder({
        symbol: buy.symbol,
        qty: buy.qty,
        side: 'buy',
        type: 'market',
        timeInForce: 'day',
        clientOrderId: clientId,
      });
      console.log(`    -> Order ${result.id} status: ${result.status}`);
    } catch (e) {
      console.error(`    FAILED: ${e}`);
    }
  }

  console.log(`\n${'='.repeat(45)}`);
  console.log('  PAPER TRADE COMPLETE');
  console.log(`${'='.repeat(45)}`);
  console.log(`  Sells: ${toSell.length} (${toSell.map(s => s.symbol).join(', ') || 'none'})`);
  console.log(`  Buys:  ${toBuy.length} (${toBuy.map(b => b.symbol).join(', ') || 'none'})`);
  console.log(`${'='.repeat(45)}`);
  console.log('\n[paper-trade] Done.');
}

main().catch(e => { console.error('[paper-trade] FAILED:', e); process.exit(1); });
