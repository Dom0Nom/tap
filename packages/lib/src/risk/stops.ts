export function volStopPrice(entryPrice: number, stdev20: number, multiple: number): number {
  return entryPrice - multiple * stdev20 * entryPrice;
}
