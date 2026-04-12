import { describe, it, expect } from 'vitest';
import { RealClock, FixedClock } from '../../core/clock.js';

describe('FixedClock', () => {
  it('returns injected values', () => {
    const c = new FixedClock(new Date('2024-06-14T20:00:00Z'));
    expect(c.now().toISOString()).toBe('2024-06-14T20:00:00.000Z');
    expect(c.asOfDate()).toBe('2024-06-14');
  });
});

describe('RealClock', () => {
  it('returns a date', () => {
    const c = new RealClock();
    expect(c.now()).toBeInstanceOf(Date);
    expect(c.asOfDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
