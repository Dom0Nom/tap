import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync } from 'node:fs';
import { NewsStore, type Headline } from '../../data/news.js';

describe('NewsStore', () => {
  it('fetches before cutoff only', () => {
    const dir = join(tmpdir(), `tap-news-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const store = new NewsStore(join(dir, 'news.sqlite'));
    const h1: Headline = { ticker: 'AAPL', createdAt: '2024-06-14T10:00:00Z', headline: 'Apple beats', source: 'bz' };
    const h2: Headline = { ticker: 'AAPL', createdAt: '2024-06-14T22:00:00Z', headline: 'Apple guidance', source: 'bz' };
    store.upsert([h1, h2]);
    const before = store.fetch('AAPL', '2024-06-14T20:00:00Z');
    expect(before).toHaveLength(1);
    expect(before[0].headline).toBe('Apple beats');
  });

  it('upsert is idempotent', () => {
    const dir = join(tmpdir(), `tap-news-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const store = new NewsStore(join(dir, 'news.sqlite'));
    const h: Headline = { ticker: 'AAPL', createdAt: '2024-06-14T10:00:00Z', headline: 'same', source: 'bz' };
    store.upsert([h, h, h]);
    expect(store.fetch('AAPL', '2024-06-15T00:00:00Z')).toHaveLength(1);
  });
});
