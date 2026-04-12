import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { StructuredLogger } from '../../core/logger.js';

describe('StructuredLogger', () => {
  it('writes JSONL and buffers', () => {
    const path = join(tmpdir(), `tap-log-${Date.now()}`, 'tap.jsonl');
    const log = new StructuredLogger(path, 64);
    log.info('signal_computed', { ticker: 'AAPL', value: 0.42 });
    log.warn('llm_fallback', { ticker: 'NVDA' });
    const lines = readFileSync(path, 'utf-8').trim().split('\n');
    expect(lines).toHaveLength(2);
    const first = JSON.parse(lines[0]);
    expect(first.event).toBe('signal_computed');
    expect(first.level).toBe('INFO');
    expect(first.ticker).toBe('AAPL');
  });

  it('ring buffer rotates', () => {
    const path = join(tmpdir(), `tap-log-${Date.now()}`, 'tap.jsonl');
    const log = new StructuredLogger(path, 3);
    for (let i = 0; i < 5; i++) log.info('tick', { i });
    const snap = log.buffer.snapshot();
    expect(snap).toHaveLength(3);
    expect(snap[2].i).toBe(4);
  });
});
