import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Bar } from '../types.js';

function loadSecrets(): { keyId: string; secret: string; dataUrl: string } {
  const envPath = join(homedir(), '.tap', 'secrets.env');
  const content = readFileSync(envPath, 'utf-8');
  const vars: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) vars[key.trim()] = rest.join('=').trim();
  }
  return {
    keyId: vars['ALPACA_KEY_ID'] ?? '',
    secret: vars['ALPACA_SECRET_KEY'] ?? '',
    dataUrl: vars['ALPACA_DATA_URL'] ?? 'https://data.alpaca.markets',
  };
}

export async function fetchAlpacaBars(tickers: string[], start: string, end: string): Promise<Bar[]> {
  const { keyId, secret, dataUrl } = loadSecrets();
  const bars: Bar[] = [];

  const batchSize = 50;
  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    const symbols = batch.join(',');
    let pageToken: string | null = null;

    do {
      const params = new URLSearchParams({
        symbols,
        timeframe: '1Day',
        start,
        end,
        limit: '10000',
        feed: 'iex',
        adjustment: 'split',
      });
      if (pageToken) params.set('page_token', pageToken);

      const url = `${dataUrl}/v2/stocks/bars?${params}`;
      const resp = await fetch(url, {
        headers: {
          'APCA-API-KEY-ID': keyId,
          'APCA-API-SECRET-KEY': secret,
        },
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Alpaca API error ${resp.status}: ${text}`);
      }

      const data = (await resp.json()) as {
        bars?: Record<string, Array<{ t: string; o: number; h: number; l: number; c: number; v: number }>>;
        next_page_token?: string | null;
      };

      for (const [ticker, tickerBars] of Object.entries(data.bars ?? {})) {
        for (const b of tickerBars) {
          bars.push({
            ticker,
            date: b.t.slice(0, 10),
            open: b.o,
            high: b.h,
            low: b.l,
            close: b.c,
            volume: b.v,
          });
        }
      }
      pageToken = data.next_page_token ?? null;
    } while (pageToken);
  }

  return bars;
}
