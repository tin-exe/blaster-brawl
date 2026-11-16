import { describe, expect, it } from 'vitest';
import { CONFIG } from '../config';
import { GAME_CONTENT, RULESET_HASH, SAFE_DEFAULT_ARENA, isHazardActiveAtTick, validateArena, validateContentManifest } from './content';

describe('versioned game content', () => {
  it('validates the manifest and preserves stable IDs and versions for arenas and power-ups', () => {
    expect(validateContentManifest(GAME_CONTENT)).toBe(true);
    expect(new Set(GAME_CONTENT.arenas.map((arena) => arena.id)).size).toBe(GAME_CONTENT.arenas.length);
    expect(GAME_CONTENT.arenas.every((arena) => arena.schemaVersion === 1)).toBe(true);
    expect(GAME_CONTENT.powerUps.map((powerUp) => powerUp.id)).toContain('spring');
    expect(RULESET_HASH).toMatch(/^fnv1a64-v1:[0-9a-f]{16}$/);
    expect(SAFE_DEFAULT_ARENA.id).toBe('meadow');
  });

  it('keeps the new arena in bounds and its required spawn points outside the pulse rail', () => {
    const signal = GAME_CONTENT.arenas.find((arena) => arena.id === 'signal-station')!;
    expect(validateArena(signal)).toBe(true);
    expect(signal.platforms).toHaveLength(5);
    const rail = signal.hazards[0]!;
    for (const spawn of CONFIG.world.spawnPoints) {
      const fighter = { x: spawn.x - CONFIG.fighters.width / 2, y: spawn.y, width: CONFIG.fighters.width, height: CONFIG.fighters.height };
      const intersects = fighter.x < rail.x + rail.width && fighter.x + fighter.width > rail.x
        && fighter.y < rail.y + rail.height && fighter.y + fighter.height > rail.y;
      expect(intersects).toBe(false);
    }
  });

  it('rejects a hazard placed over a spawn and rejects manifest rule mismatches', () => {
    const signal = GAME_CONTENT.arenas.find((arena) => arena.id === 'signal-station')!;
    const rail = signal.hazards[0]!;
    const unsafe = { ...signal, hazards: [{ ...rail, x: 690, y: 200, height: 100 }] };
    expect(validateArena(unsafe)).toBe(false);
    expect(validateContentManifest({ ...GAME_CONTENT, rulesetHash: 'stale-rules' })).toBe(false);
  });

  it('uses a deterministic fixed-tick pulse with exact active/inactive boundaries', () => {
    const rail = GAME_CONTENT.arenas.find((arena) => arena.id === 'signal-station')!.hazards[0]!;
    expect(isHazardActiveAtTick(rail, 0)).toBe(true);
    expect(isHazardActiveAtTick(rail, 44)).toBe(true);
    expect(isHazardActiveAtTick(rail, 45)).toBe(false);
    expect(isHazardActiveAtTick(rail, 179)).toBe(false);
    expect(isHazardActiveAtTick(rail, 180)).toBe(true);
  });
});
