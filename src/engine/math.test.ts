import { describe, expect, it } from 'vitest';
import { deterministicSqrt, distance, normalize, squaredDistance } from './math';

describe('deterministic math helpers', () => {
  it('computes stable square roots for game-scale values and edge cases', () => {
    expect(deterministicSqrt(0)).toBe(0);
    expect(deterministicSqrt(1)).toBeCloseTo(1, 14);
    expect(deterministicSqrt(25)).toBeCloseTo(5, 14);
    expect(deterministicSqrt(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY);
    expect(Number.isNaN(deterministicSqrt(-1))).toBe(true);
  });

  it('uses squared distances for comparisons without changing ordinary distance results', () => {
    expect(squaredDistance(0, 0, 3, 4)).toBe(25);
    expect(distance(0, 0, 3, 4)).toBeCloseTo(5, 14);
  });

  it('normalizes vectors consistently', () => {
    expect(normalize(3, 4).x).toBeCloseTo(0.6, 14);
    expect(normalize(3, 4).y).toBeCloseTo(0.8, 14);
    expect(normalize(0, 0)).toEqual({ x: 0, y: 0 });
  });
});
