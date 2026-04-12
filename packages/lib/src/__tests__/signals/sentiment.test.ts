import { describe, it, expect } from 'vitest';
import { scoreSentiment, type LLMLike } from '../../signals/sentiment.js';
import type { Classification } from '../../core/llm.js';
import type { Headline } from '../../data/news.js';

function fakeLLM(mapping: Record<string, Classification>): LLMLike {
  return {
    classifyHeadline: (h: string) => mapping[h] ?? 'neutral',
  };
}

describe('scoreSentiment', () => {
  it('aggregates and clips to +1', async () => {
    const headlines: Headline[] = [
      { ticker: 'AAPL', createdAt: '2024-06-14T09:00:00Z', headline: 'beats', source: 'bz' },
      { ticker: 'AAPL', createdAt: '2024-06-14T10:00:00Z', headline: 'guidance', source: 'bz' },
      { ticker: 'AAPL', createdAt: '2024-06-14T11:00:00Z', headline: 'buyback', source: 'bz' },
    ];
    const llm = fakeLLM({ beats: 'bullish', guidance: 'bullish', buyback: 'bullish' });
    const score = await scoreSentiment('AAPL', headlines, llm);
    expect(score).toBe(1);
  });

  it('returns 0 for empty', async () => {
    const score = await scoreSentiment('AAPL', [], fakeLLM({}));
    expect(score).toBe(0);
  });
});
