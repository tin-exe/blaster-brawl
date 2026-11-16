import { CONFIG, type WeaponId } from '../config';
import { ObjectPool } from '../engine/pool';
import { directionForAngle } from '../engine/deterministic-trig';
import type { FighterId, Projectile } from '../types';

function createProjectile(): Projectile {
  return { active: false, x: 0, y: 0, vx: 0, vy: 0, radius: 0, owner: 'human', weapon: 'pistol', life: 0, trailTimer: 0, hitFighters: [] };
}

export class ProjectileSystem {
  readonly pool = new ObjectPool(CONFIG.combat.bulletPoolSize, createProjectile);

  spawn(owner: FighterId, weapon: WeaponId, x: number, y: number, angle: number): Projectile | undefined {
    const projectile = this.pool.acquire();
    if (!projectile) return undefined;
    const definition = CONFIG.weapons[weapon];
    projectile.x = x;
    projectile.y = y;
    projectile.previousX = x;
    projectile.previousY = y;
    const direction = directionForAngle(angle);
    projectile.vx = direction.x * definition.projectileSpeed;
    projectile.vy = direction.y * definition.projectileSpeed;
    projectile.radius = definition.projectileRadius;
    projectile.owner = owner;
    projectile.weapon = weapon;
    projectile.life = definition.lifetime;
    projectile.trailTimer = 0;
    projectile.hitFighters = [];
    return projectile;
  }

  update(dt: number): void {
    for (const projectile of this.pool.items) {
      if (!projectile.active) continue;
      projectile.previousX = projectile.x;
      projectile.previousY = projectile.y;
      projectile.life -= dt;
      projectile.trailTimer -= dt;
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      if (projectile.life <= 0 || projectile.x < -120 || projectile.x > CONFIG.world.width + 120 || projectile.y < -180 || projectile.y > CONFIG.world.height) {
        projectile.active = false;
      }
    }
  }
}
