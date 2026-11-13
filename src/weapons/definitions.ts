import { CONFIG } from '../config';
import type { WeaponId } from '../config';

export type WeaponDefinition = (typeof CONFIG.weapons)[WeaponId];

export function getWeapon(id: WeaponId): WeaponDefinition {
  return CONFIG.weapons[id];
}
