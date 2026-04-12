import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

function loadSecrets(): { keyId: string; secret: string; baseUrl: string } {
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
    baseUrl: vars['ALPACA_BASE_URL'] ?? 'https://paper-api.alpaca.markets',
  };
}

function headers(): Record<string, string> {
  const { keyId, secret } = loadSecrets();
  return { 'APCA-API-KEY-ID': keyId, 'APCA-API-SECRET-KEY': secret };
}

function baseUrl(): string {
  return loadSecrets().baseUrl;
}

export async function getAccount(): Promise<Record<string, unknown>> {
  const res = await fetch(`${baseUrl()}/v2/account`, { headers: headers() });
  if (!res.ok) throw new Error(`Account error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getPositions(): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${baseUrl()}/v2/positions`, { headers: headers() });
  if (!res.ok) throw new Error(`Positions error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function submitOrder(params: {
  symbol: string;
  qty: number;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop';
  timeInForce: 'day' | 'gtc';
  clientOrderId: string;
  limitPrice?: number;
  stopPrice?: number;
}): Promise<Record<string, unknown>> {
  const body: Record<string, string> = {
    symbol: params.symbol,
    qty: String(params.qty),
    side: params.side,
    type: params.type,
    time_in_force: params.timeInForce,
    client_order_id: params.clientOrderId,
  };
  if (params.limitPrice) body.limit_price = String(params.limitPrice);
  if (params.stopPrice) body.stop_price = String(params.stopPrice);

  const res = await fetch(`${baseUrl()}/v2/orders`, {
    method: 'POST',
    headers: {
      ...headers(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Order error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function getOrders(
  status: 'open' | 'closed' | 'all' = 'all',
  limit = 50,
): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${baseUrl()}/v2/orders?status=${status}&limit=${limit}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Orders error ${res.status}: ${await res.text()}`);
  return res.json();
}
