export function applyCaps(desired: Record<string, number>, maxPositions: number): Record<string, number> {
  const entries = Object.entries(desired);
  if (entries.length <= maxPositions) return { ...desired };
  const top = entries.sort((a, b) => b[1] - a[1]).slice(0, maxPositions);
  return Object.fromEntries(top);
}

export function applySectorCaps(
  desired: Record<string, number>,
  maxPerSector: number,
  sectorFn: (ticker: string) => string,
): Record<string, number> {
  if (maxPerSector === Infinity || maxPerSector <= 0) return { ...desired };

  // Group by sector
  const bySector = new Map<string, [string, number][]>();
  for (const [ticker, score] of Object.entries(desired)) {
    const sector = sectorFn(ticker);
    if (!bySector.has(sector)) bySector.set(sector, []);
    bySector.get(sector)!.push([ticker, score]);
  }

  // Within each sector, keep only top N by score
  const result: Record<string, number> = {};
  for (const [, tickers] of bySector) {
    const sorted = tickers.sort((a, b) => b[1] - a[1]);
    for (let i = 0; i < Math.min(maxPerSector, sorted.length); i++) {
      result[sorted[i][0]] = sorted[i][1];
    }
  }
  return result;
}
