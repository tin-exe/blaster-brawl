import { describe, expect, it } from 'vitest';
import { shouldLowerQuality } from './quality';

describe('automatic quality detection', () => {
  it('waits for enough initial samples before choosing quality', () => {
    expect(shouldLowerQuality(Array(29).fill(30))).toBe(false);
  });

  it('lowers quality when average initial frame time is below 50 FPS', () => {
    expect(shouldLowerQuality(Array(45).fill(22))).toBe(true);
  });

  it('keeps high quality when initial average reaches 50 FPS', () => {
    expect(shouldLowerQuality(Array(45).fill(20))).toBe(false);
  });
});
