import { describe, expect, it } from 'vitest';
import { createFighter } from '../entities/fighter';
import { defaultSettings } from '../storage/settings';
import type { Fighter, Pickup, Platform, Projectile } from '../types';
import { DIFFICULTY_LEVELS, getDifficultyProfile } from './difficulty';
import { chooseDodge, getBotAimError, getRecoveryDirection, getStuckFallback, lineBlocked, selectPickup, selectTarget, updateStuckState } from './decisions';

const platform: Platform = { x: 180, y: 250, width: 240, height: 28 };
function actor(id: Fighter['id'], x: number, y: number): Fighter { return createFighter(id, { x, y }, defaultSettings()); }

describe('difficulty profiles', () => {
  it('keeps every difficulty field inside its documented bounds', () => {
    expect(DIFFICULTY_LEVELS).toEqual(['easy', 'normal', 'hard']);
    for (const level of DIFFICULTY_LEVELS) {
      const profile = getDifficultyProfile(level);
      expect(profile.reactionTimeDelay).toBeGreaterThan(0);
      expect(profile.aimAccuracy).toBeLessThan(1);
      expect(profile.aimErrorRadians).toBeGreaterThan(0);
      expect(profile.dodgeChance.rocket).toBeGreaterThanOrEqual(profile.dodgeChance.bullet);
      expect(profile.pickupPriority).toBeGreaterThanOrEqual(0);
      expect(profile.pickupPriority).toBeLessThanOrEqual(1);
    }
  });
});

describe('bot tactical helpers', () => {
  it('blocks sight through platforms but keeps open sight clear', () => {
    expect(lineBlocked(80, 264, 520, 264, [platform])).toBe(true);
    expect(lineBlocked(80, 190, 520, 190, [platform])).toBe(false);
  });

  it('selects the nearest visible live target and excludes hidden or dead actors', () => {
    const self = actor('bot', 80, 240);
    const hidden = actor('human', 500, 240);
    const visible = actor('bot2', 110, 160);
    expect(selectTarget(self, [hidden, visible], 700, [platform])?.id).toBe('bot2');
    expect(selectTarget(self, [hidden], 700, [platform])).toBeNull();
  });

  it('prioritizes a reachable pickup only at the configured random threshold', () => {
    const self = actor('bot', 100, 200);
    const pickup: Pickup = { active: true, x: 180, y: 190, weapon: 'rocket', powerUp: null, phase: 0, respawnTimer: 0 };
    expect(selectPickup(self, [pickup], 0.8, 300, 0.2)).toBe(pickup);
    expect(selectPickup(self, [pickup], 0.2, 300, 0.8)).toBeNull();
  });

  it('recognizes an incoming rocket and chooses an evasive direction', () => {
    const self = actor('bot', 300, 230);
    self.grounded = true;
    const rocket: Projectile = { active: true, x: 220, y: 258, vx: 250, vy: 0, radius: 9, owner: 'human', weapon: 'rocket', life: 1, trailTimer: 0 };
    const dodge = chooseDodge(self, [rocket], getDifficultyProfile('hard'), 0.52, 48, 0);
    expect(dodge).toEqual({ direction: 1, jump: true, threatWeapon: 'rocket' });
  });

  it('steers a knocked fighter toward the nearest safe platform edge', () => {
    const self = actor('bot', 540, 510);
    self.grounded = false;
    const recovery = getRecoveryDirection(self, [platform, { x: 500, y: 450, width: 300, height: 28 }], 28);
    expect(recovery.platform?.x).toBe(500);
    expect(recovery.direction).toBe(1);
    expect(recovery.targetX).toBeGreaterThan(self.x);
  });

  it('triggers and resets the stuck detector, then produces a fallback action', () => {
    let state = { seconds: 0, lastX: 100, lastY: 200, triggered: false };
    state = updateStuckState(state, 100, 200, 0.4, 0.8, 2, true);
    expect(state.triggered).toBe(false);
    state = updateStuckState(state, 100, 200, 0.45, 0.8, 2, true);
    expect(state.triggered).toBe(true);
    state = updateStuckState(state, 110, 200, 0.1, 0.8, 2, true);
    expect(state.seconds).toBe(0);
    expect(getStuckFallback(actor('bot', 170, 195), [platform], 28).move).toBe(1);
  });

  it('uses nonzero aim error even at the center of the random range', () => {
    const profile = getDifficultyProfile('hard');
    expect(Math.abs(getBotAimError(0.5, profile.aimErrorRadians, profile.aimAccuracy))).toBeGreaterThan(0);
  });
});
