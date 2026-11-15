import { CONFIG } from '../config';
import { ObjectPool } from '../engine/pool';
import type { Particle } from '../types';

function makeParticle(): Particle {
  return { active: false, x: 0, y: 0, vx: 0, vy: 0, radius: 2, life: 0, maxLife: 0, color: '#fff', gravity: 0, square: false, ring: false, expansion: 0 };
}

export class EffectSystem {
  readonly pool = new ObjectPool(CONFIG.particles.poolSize, makeParticle);
  private quality = 1;
  private maxActiveParticles: number = CONFIG.particles.poolSize;
  private activeCount = 0;

  constructor(private readonly random: () => number = Math.random) {}

  setQuality(scale: number): void { this.quality = Math.max(0.25, Math.min(1, scale)); }
  setParticleLimit(limit: number): void { this.maxActiveParticles = Math.max(1, Math.min(this.pool.items.length, Math.floor(limit))); }

  burst(x: number, y: number, color: string, count: number, speed: number, lifetime: number = CONFIG.particles.defaultLifetime, gravity: number = CONFIG.particles.gravity, square = false): void {
    const emissionCount = Math.max(1, Math.round(count * this.quality));
    for (let index = 0; index < emissionCount; index += 1) {
      if (this.activeCount >= this.maxActiveParticles) break;
      const particle = this.pool.acquire();
      if (!particle) break;
      this.activeCount += 1;
      const angle = this.random() * Math.PI * 2;
      const velocity = speed * (0.38 + this.random() * 0.9);
      const duration = lifetime * (0.55 + this.random() * 0.75);
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * velocity;
      particle.vy = Math.sin(angle) * velocity - speed * 0.12;
      particle.radius = 1.5 + this.random() * 4.5;
      particle.life = duration;
      particle.maxLife = duration;
      particle.color = color;
      particle.gravity = gravity;
      particle.square = square;
      particle.ring = false;
      particle.expansion = 0;
    }
  }

  ring(x: number, y: number, color: string, startRadius: number, endRadius: number, lifetime = 0.24): void {
    if (this.activeCount >= this.maxActiveParticles) return;
    const particle = this.pool.acquire();
    if (!particle) return;
    const duration = Math.max(0.04, lifetime);
    this.activeCount += 1;
    particle.x = x;
    particle.y = y;
    particle.vx = 0;
    particle.vy = 0;
    particle.radius = startRadius;
    particle.life = duration;
    particle.maxLife = duration;
    particle.color = color;
    particle.gravity = 0;
    particle.square = false;
    particle.ring = true;
    particle.expansion = Math.max(0, endRadius - startRadius) / duration;
  }

  dust(x: number, y: number, color: string): void {
    this.burst(x, y, color, CONFIG.particles.dustCount, CONFIG.particles.dustSpeed, CONFIG.particles.dustLifetime, CONFIG.particles.dustGravity, true);
  }

  muzzle(x: number, y: number, color: string): void {
    this.burst(x, y, color, CONFIG.particles.muzzleCount, CONFIG.particles.muzzleSpeed, CONFIG.particles.muzzleLifetime, 0, true);
  }

  explosion(x: number, y: number, color: string): void {
    this.burst(x, y, color, CONFIG.particles.explosionCount, CONFIG.particles.explosionSpeed, CONFIG.combat.explosionLifetime, CONFIG.particles.explosionGravity, true);
    this.burst(x, y, '#fff6d5', Math.floor(CONFIG.particles.explosionCount * CONFIG.particles.secondaryExplosionCountRatio), CONFIG.particles.secondaryExplosionSpeed, CONFIG.combat.explosionLifetime * CONFIG.particles.secondaryExplosionLifetimeRatio, CONFIG.particles.secondaryExplosionGravity, false);
  }

  update(dt: number): void {
    for (const particle of this.pool.items) {
      if (!particle.active) continue;
      particle.life -= dt;
      if (particle.life <= 0) { particle.active = false; this.activeCount = Math.max(0, this.activeCount - 1); continue; }
      if (particle.ring) { particle.radius += particle.expansion * dt; continue; }
      particle.vy += particle.gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.max(0, 1 - dt * 1.7);
      particle.vy *= Math.max(0, 1 - dt * 0.25);
    }
  }
}
