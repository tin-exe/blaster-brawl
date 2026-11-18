import { describe, expect, it } from 'vitest';
import { createReplayClip, encodeReplayClip, replayInputAtTick, validateReplayClip } from './replay';
import { DEFAULT_MATCH_CONFIG } from './match-config';

const inputLog = {
  firstTick: 1,
  lastTick: 2,
  inputsPerPlayer: 8,
  frames: new Uint8Array([0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0]),
};

describe('local replay clips', () => {
  it('creates a bounded, portable JSON clip with match identity', () => {
    const clip = createReplayClip({
      gameVersion: 1,
      rulesetHash: 'ruleset-test',
      seed: 0x1234,
      arenaId: 'meadow',
      config: DEFAULT_MATCH_CONFIG,
      inputLog,
    });

    expect(clip.frames).toHaveLength(32);
    expect(validateReplayClip(JSON.parse(encodeReplayClip(clip)))).toBe(true);
    expect(clip.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('rejects malformed or non-boolean input bytes', () => {
    const clip = createReplayClip({ gameVersion: 1, rulesetHash: 'x', seed: 1, arenaId: 'meadow', config: DEFAULT_MATCH_CONFIG, inputLog });
    expect(validateReplayClip({ ...clip, frames: [0, 2] })).toBe(false);
    expect(validateReplayClip({ ...clip, lastTick: 0 })).toBe(false);
    expect(validateReplayClip({ ...clip, frames: new Array(60 * 180 * 16 + 16).fill(0), firstTick: 1, lastTick: 10801 })).toBe(false);
    expect(validateReplayClip({ ...clip, frames: [0], firstTick: 1, lastTick: 1 })).toBe(false);
    expect(validateReplayClip({ ...clip, config: { ...clip.config, stocks: 99 } })).toBe(false);
  });

  it('decodes both players and returns null outside the recorded tick range', () => {
    const clip = createReplayClip({ gameVersion: 1, rulesetHash: 'x', seed: 1, arenaId: 'meadow', config: DEFAULT_MATCH_CONFIG, inputLog });
    expect(replayInputAtTick(clip, 1)).toMatchObject({
      right: true,
      jumpPressed: true,
      jumpHeld: true,
      player2: { left: true, shoot: true },
    });
    expect(replayInputAtTick(clip, 0)).toBeNull();
    expect(replayInputAtTick(clip, 3)).toBeNull();
  });
});
