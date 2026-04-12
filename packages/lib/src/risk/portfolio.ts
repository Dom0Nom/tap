export function applyCaps(desired: Record<string, number>, maxPositions: number): Record<string, number> {
  const entries = Object.entries(desired);
  if (entries.length <= maxPositions) return { ...desired };
  const top = entries.sort((a, b) => b[1] - a[1]).slice(0, maxPositions);
  return Object.fromEntries(top);
}
