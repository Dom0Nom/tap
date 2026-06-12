import { describe, it, expect, vi } from 'vitest';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync } from 'node:fs';
import { LLMClient, type SDKLike } from '../../core/llm.js';

describe('LLMClient', () => {
  it('caches on second call', async () => {
    const dir = join(tmpdir(), `tap-llm-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const sdk: SDKLike = { classify: vi.fn().mockResolvedValue('bullish') };
    const client = new LLMClient('haiku', dir, sdk);

    const first = await client.classifyHeadline('AAPL up 5%');
    const second = await client.classifyHeadline('AAPL up 5%');
    expect(first).toBe('bullish');
    expect(second).toBe('bullish');
    expect(sdk.classify).toHaveBeenCalledTimes(1);
  });

  it('retries then throws', async () => {
    const dir = join(tmpdir(), `tap-llm-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const sdk: SDKLike = { classify: vi.fn().mockImplementation(() => Promise.reject(new Error('boom'))) };
    // make retry backoff instant
    const origSetTimeout = globalThis.setTimeout;
    // @ts-expect-error patching global
    globalThis.setTimeout = (fn: () => void) => origSetTimeout(fn, 0);
    try {
      const client = new LLMClient('haiku', dir, sdk, 3);
      await expect(client.classifyHeadline('test')).rejects.toThrow('boom');
      expect(sdk.classify).toHaveBeenCalledTimes(3);
    } finally {
      globalThis.setTimeout = origSetTimeout;
    }
  }, 10_000);
});
