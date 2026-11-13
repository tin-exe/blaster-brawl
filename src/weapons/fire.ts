import { CONFIG, WEAPON_ORDER } from '../config';
import { EffectSystem } from '../entities/effects';
import { ProjectileSystem } from '../entities/projectiles';
import type { Fighter } from '../types';

export interface FireResult { fired: boolean; empty: boolean }

export function fireWeapon(fighter: Fighter, aimAngle: number, projectiles: ProjectileSystem, effects: EffectSystem, random: () => number = Math.random): FireResult {
  if (fighter.dead || fighter.fireCooldown > 0) return { fired: false, empty: false };
  if (fighter.ammo[fighter.weapon] <= 0) return { fired: false, empty: true };
  const definition = CONFIG.weapons[fighter.weapon];
  fighter.ammo[fighter.weapon] -= 1;
  fighter.fireCooldown = definition.fireInterval;
  fighter.shootTimer = CONFIG.combat.shootPoseSeconds;
  const originX = fighter.x + Math.cos(aimAngle) * fighter.width * 0.48;
  const originY = fighter.y + fighter.height * 0.43 + Math.sin(aimAngle) * fighter.height * 0.23;
  effects.muzzle(originX, originY, definition.color);
  for (let pellet = 0; pellet < definition.pellets; pellet += 1) {
    const angle = aimAngle + (random() - 0.5) * definition.spreadRadians;
    projectiles.spawn(fighter.id, fighter.weapon, originX, originY, angle);
  }
  const horizontalSign = Math.cos(aimAngle) < 0 ? -1 : 1;
  fighter.vx -= Math.cos(aimAngle) * definition.recoil;
  fighter.vy -= Math.sin(aimAngle) * definition.recoil * 0.2;
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
