import type { Classification } from '../core/llm.js';
import type { Headline } from '../data/news.js';

export interface LLMLike {
  classifyHeadline(headline: string): Promise<Classification> | Classification;
}

const SCORES: Record<Classification, number> = { bullish: 1, neutral: 0, bearish: -1 };

export async function scoreSentiment(ticker: string, headlines: Headline[], llm: LLMLike): Promise<number> {
  if (headlines.length === 0) return 0;
  let total = 0;
  for (const h of headlines) {
    try {
      const cls = await llm.classifyHeadline(h.headline);
      total += SCORES[cls] ?? 0;
    } catch {
      // neutral fallback
    }
  }
  return Math.max(-1, Math.min(1, total));
}
