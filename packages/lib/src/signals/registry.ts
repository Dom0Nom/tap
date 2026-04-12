export type SignalFn = (barsWide: Record<string, number[]>, dates: string[], asOf: string) => Record<string, number>;

const REGISTRY = new Map<string, SignalFn>();

export function register(name: string, fn: SignalFn): void {
  REGISTRY.set(name, fn);
}

export function getSignal(name: string): SignalFn {
  const fn = REGISTRY.get(name);
  if (!fn) throw new Error(`Signal not found: ${name}`);
  return fn;
}

export function signalNames(): string[] {
  return [...REGISTRY.keys()].sort();
}
