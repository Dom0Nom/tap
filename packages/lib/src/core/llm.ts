import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

export type Classification = 'bullish' | 'neutral' | 'bearish';

export interface SDKLike {
  classify(headline: string, model: string): Promise<string>;
}

export class LLMClient {
  constructor(
    private model: string,
    private cacheDir: string,
    private sdk: SDKLike,
    private retries: number = 3,
  ) {
    mkdirSync(cacheDir, { recursive: true });
  }

  private cacheKey(headline: string): string {
    return createHash('sha256').update(`${this.model}|${headline}`).digest('hex');
  }

  private cachePath(key: string): string {
    return join(this.cacheDir, `${key}.json`);
  }

  async classifyHeadline(headline: string): Promise<Classification> {
    const key = this.cacheKey(headline);
    const path = this.cachePath(key);
    if (existsSync(path)) {
      try {
        const cached = JSON.parse(readFileSync(path, 'utf-8'));
        return cached.classification as Classification;
      } catch { /* corrupt cache, recompute */ }
    }

    let lastErr: Error | null = null;
    for (let attempt = 0; attempt < this.retries; attempt++) {
      try {
        const raw = await this.sdk.classify(headline, this.model);
        const label = raw as Classification;
        writeFileSync(path, JSON.stringify({ classification: label, headline }));
        return label;
      } catch (e) {
        lastErr = e as Error;
        await new Promise(r => setTimeout(r, 1000 * (4 ** attempt)));
      }
    }
    throw lastErr!;
  }
}
