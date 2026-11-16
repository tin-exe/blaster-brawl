import { describe, expect, it } from 'vitest';
import { completeTutorial, defaultProgression, loadProgression, recordLocalWin, validateProgression, PROGRESSION_STORAGE_KEY } from './progression';
import { createReplayClip } from '../game/replay';
import { DEFAULT_MATCH_CONFIG } from '../game/match-config';
import { loadReplayClips, REPLAY_STORAGE_KEY, saveReplayClip } from './replays';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return { get length() { return values.size; }, clear: () => values.clear(), getItem: (key) => values.get(key) ?? null, key: (index) => [...values.keys()][index] ?? null, removeItem: (key) => { values.delete(key); }, setItem: (key, value) => { values.set(key, String(value)); } };
}

function clip(seed: number) {
  return createReplayClip({ gameVersion: 1, rulesetHash: 'test', seed, arenaId: 'meadow', config: DEFAULT_MATCH_CONFIG, inputLog: { firstTick: 1, lastTick: 1, inputsPerPlayer: 8, frames: new Uint8Array(16) } });
}

describe('local progression and replay storage', () => {
  it('migrates malformed progression safely and persists tutorial completion', () => {
    const storage = memoryStorage();
    storage.setItem(PROGRESSION_STORAGE_KEY, '{broken');
    const loaded = loadProgression(storage);
    expect(loaded).toEqual(defaultProgression());
    const completed = completeTutorial(loaded);
    expect(validateProgression(completed)?.tutorialComplete).toBe(true);
  });

  it('unlocks cosmetics through validated local wins only', () => {
    let value = defaultProgression();
    for (let i = 0; i < 10; i += 1) value = recordLocalWin(value);
    expect(value.wins).toBe(10);
    expect(value.unlockedSkins).toContain('neon');
    expect(value.unlockedTrails).toContain('comet');
    expect(value.unlockedTitles).toContain('ring-out artist');
    expect(validateProgression({ ...value, wins: -1 })).toBeNull();
  });

  it('keeps only the five newest valid replay clips under a separate key', () => {
    const storage = memoryStorage();
    for (let seed = 1; seed <= 7; seed += 1) saveReplayClip(clip(seed), storage);
    const clips = loadReplayClips(storage);
    expect(clips).toHaveLength(5);
    expect(clips[0]?.seed).toBe(7);
    expect(storage.getItem(REPLAY_STORAGE_KEY)).toContain('version');
    expect(storage.getItem(PROGRESSION_STORAGE_KEY)).toBeNull();
  });
});
