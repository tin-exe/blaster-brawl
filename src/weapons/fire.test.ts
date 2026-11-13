import { describe, expect, it } from 'vitest';
import { CONFIG } from '../config';
import { cycleWeapon } from './fire';
import type { Fighter } from '../types';

function fighter(): Fighter {
  return { id: 'human', controller: 'human', playerSlot: 1, displayName: 'Player 1', markerNumber: 1, markerShape: 'circle', x: 0, y: 0, vx: 0, vy: 0, width: 34, height: 55, facing: 1, grounded: false, jumpsUsed: 0, stocks: 3, weapon: 'pistol', ammo: { pistol: 0, shotgun: 2, rocket: 1 }, fireCooldown: 0, shootTimer: 0, hitTimer: 0, invulnerable: 0, respawnTimer: 0, dead: false, hat: 'cap', color: '#f00', botThinkTimer: 0, botJumpCooldown: 0, botAimOffset: 0, animationTime: 0, contactCooldown: 0 };
}

describe('weapon config and cycling', () => {
  it('gives the three weapons distinct rates, force, recoil and ammo', () => {
    const values = Object.values(CONFIG.weapons);
    expect(new Set(values.map((weapon) => weapon.fireInterval)).size).toBe(values.length);
    expect(new Set(values.map((weapon) => weapon.knockback)).size).toBe(values.length);
    expect(new Set(values.map((weapon) => weapon.recoil)).size).toBe(values.length);
    expect(new Set(values.map((weapon) => weapon.ammo)).size).toBe(values.length);
  });

  it('cycles to the next weapon that has ammunition', () => {
    const player = fighter();
    cycleWeapon(player);
    expect(player.weapon).toBe('shotgun');
  });
});
