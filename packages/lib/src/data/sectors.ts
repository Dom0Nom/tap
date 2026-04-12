const GICS_SECTORS: Record<string, string> = {
  AAPL: 'Information Technology',
  MSFT: 'Information Technology',
  NVDA: 'Information Technology',
  AMZN: 'Consumer Discretionary',
  GOOG: 'Communication Services',
  META: 'Communication Services',
  TSLA: 'Consumer Discretionary',
  JPM: 'Financials',
  V: 'Financials',
  UNH: 'Health Care',
  SPY: 'Index',
};

export function getSector(ticker: string): string {
  return GICS_SECTORS[ticker] ?? 'Unknown';
}

export { GICS_SECTORS };
