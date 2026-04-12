export interface Bar {
  ticker: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type OrderSide = 'buy' | 'sell';
export type OrderKind = 'market' | 'stop';
export type OrderStatus = 'pending' | 'submitted' | 'filled' | 'rejected' | 'cancelled';

export interface Order {
  clientOrderId: string;
  ticker: string;
  side: OrderSide;
  qty: number;
  kind: OrderKind;
  stopPrice?: number;
  submittedAt?: string;
  status: OrderStatus;
}

export interface Position {
  ticker: string;
  qty: number;
  avgPrice: number;
  openedAt: string;
  stopPrice?: number;
}

export interface Portfolio {
  cash: number;
  equity: number;
  positions: Record<string, Position>;
}

export interface SignalValue {
  ticker: string;
  signalName: string;
  value: number;
  asOf: string;
}

export function createOrder(params: Omit<Order, 'status'> & { status?: OrderStatus }): Order {
  return { status: 'pending', ...params };
}
