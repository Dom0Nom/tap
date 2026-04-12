import { describe, it, expect } from 'vitest';
import { pctChange, rollingMean, rollingStd, cumMax, mean, std, clip, dropNaN, tail, correlation } from '../../utils/math.js';

describe('pctChange', () => {
  it('computes percentage changes', () => {
    const result = pctChange([100, 110, 99]);
    expect(result).toHaveLength(2);
    expect(result[0]).toBeCloseTo(0.1);
    expect(result[1]).toBeCloseTo(-0.1, 1);
  });

  it('returns empty for single element', () => {
    expect(pctChange([100])).toEqual([]);
  });
});

describe('rollingMean', () => {
  it('computes windowed mean', () => {
    const result = rollingMean([1, 2, 3, 4, 5], 3);
    expect(result[0]).toBeNaN();
    expect(result[1]).toBeNaN();
    expect(result[2]).toBeCloseTo(2);
    expect(result[3]).toBeCloseTo(3);
    expect(result[4]).toBeCloseTo(4);
  });
});

describe('rollingStd', () => {
  it('computes windowed standard deviation', () => {
    const result = rollingStd([1, 1, 1, 1], 3);
    expect(result[2]).toBeCloseTo(0);
    expect(result[3]).toBeCloseTo(0);
  });

  it('is non-zero for varying data', () => {
    const result = rollingStd([1, 2, 3], 3);
    expect(result[2]).toBeGreaterThan(0);
  });
});

describe('cumMax', () => {
  it('tracks running maximum', () => {
    expect(cumMax([1, 3, 2, 5, 4])).toEqual([1, 3, 3, 5, 5]);
  });
});

describe('mean and std', () => {
  it('computes mean', () => {
    expect(mean([2, 4, 6])).toBeCloseTo(4);
  });

  it('computes sample std', () => {
    expect(std([2, 4, 6])).toBeCloseTo(2);
  });

  it('returns NaN for empty', () => {
    expect(mean([])).toBeNaN();
    expect(std([1])).toBeNaN();
  });
});

describe('clip', () => {
  it('clips to range', () => {
    expect(clip(5, 0, 3)).toBe(3);
    expect(clip(-1, 0, 3)).toBe(0);
    expect(clip(2, 0, 3)).toBe(2);
  });
});

describe('tail', () => {
  it('returns last n elements', () => {
    expect(tail([1, 2, 3, 4, 5], 3)).toEqual([3, 4, 5]);
  });
});

describe('dropNaN', () => {
  it('removes NaN values', () => {
    expect(dropNaN([1, NaN, 3, NaN, 5])).toEqual([1, 3, 5]);
  });
});

describe('correlation', () => {
  it('returns ~1 for identical series', () => {
    const a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(correlation(a, a)).toBeCloseTo(1.0);
  });

  it('returns ~-1 for inverted series', () => {
    const a = [1, 2, 3, 4, 5];
    const b = [5, 4, 3, 2, 1];
    expect(correlation(a, b)).toBeCloseTo(-1.0);
  });

  it('returns 0 for insufficient data', () => {
    expect(correlation([1], [2])).toBe(0);
  });
});
