import { readFileSync } from 'node:fs';

interface Membership {
  ticker: string;
  added: string;  // YYYY-MM-DD
  removed: string | null;
}

export class Universe {
  constructor(private memberships: Membership[]) {}

  static fromCSV(path: string): Universe {
    const lines = readFileSync(path, 'utf-8').trim().split('\n').slice(1); // skip header
    const memberships = lines.map(line => {
      const [ticker, added, removed] = line.split(',');
      return { ticker: ticker.trim(), added: added.trim(), removed: removed?.trim() || null };
    });
    return new Universe(memberships);
  }

  membersAt(asOf: string): Set<string> {
    return new Set(
      this.memberships
        .filter(m => m.added <= asOf && (m.removed === null || m.removed > asOf))
        .map(m => m.ticker)
    );
  }

  allHistoricalTickers(): Set<string> {
    return new Set(this.memberships.map(m => m.ticker));
  }
}
