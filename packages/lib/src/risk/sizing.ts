export function volTargetShares(price: number, stdev20: number, capital: number, targetRisk: number): number {
  if (stdev20 <= 0 || isNaN(stdev20) || price <= 0) return 0;
  const dollarRisk = targetRisk * capital;
  const dollarsPerShareRisk = stdev20 * price;
  if (dollarsPerShareRisk <= 0) return 0;
  return Math.max(0, Math.floor(dollarRisk / dollarsPerShareRisk));
}
