import { CONFIG, WEAPON_ORDER } from '../config';
import { directionForAngle } from '../engine/deterministic-trig';
import { EffectSystem } from '../entities/effects';
import { ProjectileSystem } from '../entities/projectiles';
import type { Fighter } from '../types';

export interface FireResult { fired: boolean; empty: boolean }

export function fireWeapon(fighter: Fighter, aimAngle: number, projectiles: ProjectileSystem, effects: EffectSystem, random: () => number): FireResult {
  if (fighter.dead || fighter.fireCooldown > 0) return { fired: false, empty: false };
  if (fighter.ammo[fighter.weapon] <= 0) return { fired: false, empty: true };
  const definition = CONFIG.weapons[fighter.weapon];
  fighter.ammo[fighter.weapon] -= 1;
  fighter.fireCooldown = definition.fireInterval;
  fighter.shootTimer = CONFIG.combat.shootPoseSeconds;
  const aim = directionForAngle(aimAngle);
  const originX = fighter.x + aim.x * fighter.width * 0.48;
  const originY = fighter.y + fighter.height * 0.43 + aim.y * fighter.height * 0.23;
  effects.muzzle(originX, originY, definition.color);
  if (fighter.weapon === 'railgun') effects.ring(originX, originY, definition.color, 4, 34, 0.14);
  for (let pellet = 0; pellet < definition.pellets; pellet += 1) {
    const angle = aimAngle + (random() - 0.5) * definition.spreadRadians;
    projectiles.spawn(fighter.id, fighter.weapon, originX, originY, angle);
  }
  const horizontalSign = aim.x < 0 ? -1 : 1;
  fighter.vx -= aim.x * definition.recoil;
  fighter.vy -= aim.y * definition.recoil * 0.2;
  fighter.facing = horizontalSign;
  if (fighter.ammo[fighter.weapon] === 0) {
    const next = WEAPON_ORDER.find((weapon) => fighter.ammo[weapon] > 0);
    if (next) fighter.weapon = next;
  }
  return { fired: true, empty: false };
}

export function cycleWeapon(fighter: Fighter): void {
  const startIndex = WEAPON_ORDER.indexOf(fighter.weapon);
  for (let offset = 1; offset <= WEAPON_ORDER.length; offset += 1) {
    const weapon = WEAPON_ORDER[(startIndex + offset) % WEAPON_ORDER.length];
    if (weapon && fighter.ammo[weapon] > 0) {
      fighter.weapon = weapon;
      return;
    }
  }
}
