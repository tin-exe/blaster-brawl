import { describe, expect, it } from 'vitest';
import { RULESET_HASH } from './content';
import { createDailyChallenge } from './daily-challenge';

describe('offline daily challenge', () => {
  it('repeats the same UTC-day challenge config, seed, and ruleset identity', () => {
    const first = createDailyChallenge('2026-11-16');
    const second = createDailyChallenge('2026-11-16');
    expect(first).toEqual(second);
    expect(first.seed).toBeGreaterThan(0);
    expect(first.rulesetHash).toBe(RULESET_HASH);
    expect(first.config.mode).toBe('daily');
    expect(first.config.difficulty).toBe('hard');
    expect(first.config.botCount).toBe(3);
    expect(first.config.stocks).toBe(3);
  });

  it('normalizes Date inputs to UTC and changes the challenge on a new UTC day', () => {
    expect(createDailyChallenge(new Date('2026-11-16T07:59:00-08:00')).challengeDate).toBe('2026-11-16');
    expect(createDailyChallenge('2026-11-16').seed).not.toBe(createDailyChallenge('2026-11-17').seed);
  });

  it('rejects malformed or impossible date strings instead of making an ambiguous challenge', () => {
    expect(() => createDailyChallenge('2026-2-3')).toThrow(RangeError);
    expect(() => createDailyChallenge('2026-02-30')).toThrow(RangeError);
    expect(() => createDailyChallenge(new Date(Number.NaN))).toThrow(RangeError);
  });
});
