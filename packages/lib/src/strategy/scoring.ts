export function combine(
  signals: Record<string, Record<string, number>>,
  weights: Record<string, number>,
): Record<string, number> {
  const primary = signals['momentum'];
  if (!primary || Object.keys(primary).length === 0) return {};

  const result: Record<string, number> = {};
  for (const ticker of Object.keys(primary)) {
    let score = 0;
    for (const [name, w] of Object.entries(weights)) {
      score += w * (signals[name]?.[ticker] ?? 0);
    }
    result[ticker] = score;
  }
  return result;
}
