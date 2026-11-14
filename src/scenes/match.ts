import { CONFIG, SCENE_EVENTS, WEAPON_ORDER } from '../config';
import { AudioManager } from '../audio/audio';
import { clamp, distance, overlaps } from '../engine/math';
import { ObjectPool } from '../engine/pool';
import { BotController } from '../ai/controller';
import { EffectSystem } from '../entities/effects';
import { createFighter, respawnFighter, type SpawnPoint } from '../entities/fighter';
import { calculateKnockback } from '../entities/knockback';
import { ProjectileSystem } from '../entities/projectiles';
import { landingPlatform } from '../entities/world';
import { cycleWeapon, fireWeapon } from '../weapons/fire';
import type { BotAction, Fighter, FighterId, InputFrame, MatchConfig, Pickup, Platform, PlayerInput } from '../types';
import type { GameSettings } from '../storage/settings';
import { createMatchConfig, DEFAULT_MATCH_CONFIG } from '../game/match-config';
import { SceneEventEmitter } from './events';

const PICKUP_POINTS = CONFIG.world.pickupSpawns;

export interface MatchSceneOptions {
  botVsBot?: boolean;
  random?: () => number;
}

function makePickup(): Pickup {
  return { active: false, x: 0, y: 0, weapon: 'shotgun', phase: 0, respawnTimer: 0 };
}

function randomWeapon(random: () => number): (typeof WEAPON_ORDER)[number] {
  return WEAPON_ORDER[Math.floor(random() * WEAPON_ORDER.length)] ?? 'pistol';
}

function overlapsCircle(x: number, y: number, radius: number, fighter: Fighter): boolean {
  const padding = CONFIG.fighters.collisionPadding;
  const closestX = clamp(x, fighter.x - fighter.width * 0.5 + padding, fighter.x + fighter.width * 0.5 - padding);
  const closestY = clamp(y, fighter.y + padding, fighter.y + fighter.height - padding);
  return distance(x, y, closestX, closestY) <= radius;
}

export class MatchScene {
  readonly events = new SceneEventEmitter();
  readonly config: MatchConfig;
  readonly fighters: Fighter[];
  readonly projectiles = new ProjectileSystem();
  readonly effects: EffectSystem;
  readonly pickups = new ObjectPool(CONFIG.combat.pickupPoolSize, makePickup);
  readonly eliminationOrder: FighterId[] = [];
  cameraX = 0;
  shake = 0;
  shakeIntensity: number;
  toast = '';
  toastTimer = 0;
  elapsed = 0;
  winner: FighterId | null = null;
  finished = false;
  private readonly audio: AudioManager;
  private readonly botController = new BotController();
  private readonly random: () => number;
  private readonly botVsBot: boolean;
  private isShutdown = false;

  constructor(settings: GameSettings, audio: AudioManager, matchConfig: MatchConfig = DEFAULT_MATCH_CONFIG, options: MatchSceneOptions = {}) {
    this.audio = audio;
    this.config = createMatchConfig(matchConfig.mode, matchConfig);
    this.shakeIntensity = settings.shake;
    this.random = options.random ?? Math.random;
    this.botVsBot = options.botVsBot ?? false;
    this.effects = new EffectSystem(this.random);
    this.fighters = this.createRoster(settings);
    this.resetPickups();
    this.cameraX = this.cameraTarget();
  }

  get human(): Fighter { return this.fighters.find((fighter) => fighter.playerSlot === 1) ?? this.fighters[0]!; }
  get bot(): Fighter { return this.fighters.find((fighter) => fighter.controller === 'bot') ?? this.fighters.find((fighter) => fighter.playerSlot === 2) ?? this.fighters[0]!; }
  get platforms(): readonly Platform[] { return CONFIG.world.platforms; }
  get winnerFighter(): Fighter | null { return this.winner ? this.fighters.find((fighter) => fighter.id === this.winner) ?? null : null; }

  shutdown(): void {
    if (this.isShutdown) return;
    this.isShutdown = true;
    this.events.shutdown();
  }

  private createRoster(settings: GameSettings): Fighter[] {
    const selectedColor = Math.max(0, Math.min(CONFIG.fighters.colorways.length - 1, settings.colorIndex));
    const colors = [
      CONFIG.fighters.colorways[selectedColor] ?? CONFIG.fighters.colorways[0]!,
      ...CONFIG.fighters.colorways.filter((_, index) => index !== selectedColor),
    ];
    const roster: Fighter[] = [];
    const spawnPoints: SpawnPoint[] = CONFIG.world.spawnPoints.map((point) => ({ x: point.x, y: point.y }));
    const entries: { id: FighterId; controller: 'human' | 'bot'; playerSlot: 1 | 2 | null; displayName: string }[] = [];
    for (let slot = 1; slot <= this.config.humanPlayers; slot += 1) {
      entries.push({ id: slot === 1 ? 'human' : 'player2', controller: 'human', playerSlot: slot as 1 | 2, displayName: `Player ${slot}` });
    }
    for (let bot = 1; bot <= this.config.botCount; bot += 1) {
      entries.push({ id: bot === 1 ? 'bot' : bot === 2 ? 'bot2' : 'bot3', controller: 'bot', playerSlot: null, displayName: `Bot ${bot}` });
    }
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (!entry) continue;
      const spawn = this.config.mode === 'versus' && entry.playerSlot === 1
        ? CONFIG.world.spawn.human
        : this.config.mode === 'versus' && entry.controller === 'bot'
          ? CONFIG.world.spawn.bot
          : this.chooseSpawn(spawnPoints, roster);
      const spawnIndex = spawnPoints.findIndex((point) => point.x === spawn?.x && point.y === spawn?.y);
      if (spawnIndex >= 0) spawnPoints.splice(spawnIndex, 1);
      const color = colors[index % colors.length] ?? CONFIG.fighters.colorways[index % CONFIG.fighters.colorways.length] ?? '#ff6b5c';
      const markerIndex = index % CONFIG.fighters.markerShapes.length;
      const fighter = createFighter(entry.id, spawn ?? CONFIG.world.spawn.human, settings, {
        controller: entry.controller,
        playerSlot: entry.playerSlot,
        displayName: entry.displayName,
        markerNumber: index + 1,
        markerShape: CONFIG.fighters.markerShapes[markerIndex],
        color,
        stocks: this.config.stocks,
      });
      roster.push(fighter);
    }
    return roster;
  }

  private chooseSpawn(points: readonly SpawnPoint[], placed: readonly Fighter[], excluded?: Fighter): SpawnPoint | undefined {
    if (points.length === 0) return CONFIG.world.spawn.human;
    let selected = points[0];
    let selectedScore = Number.NEGATIVE_INFINITY;
    for (const point of points) {
      if (!point) continue;
      let nearest = Number.POSITIVE_INFINITY;
      for (const fighter of placed) {
        if (fighter === excluded || fighter.dead || fighter.stocks <= 0) continue;
        nearest = Math.min(nearest, distance(point.x, point.y, fighter.x, fighter.y));
      }
      const score = Number.isFinite(nearest) ? nearest + this.random() * 8 : this.random() * 20;
      if (score > selectedScore) { selectedScore = score; selected = point; }
    }
    return selected;
  }

  private resetPickups(): void {
    const count = this.config.weaponsEnabled
      ? Math.min(this.pickups.items.length, CONFIG.match.pickupBaseCount + Math.max(0, this.fighters.length - 2) * CONFIG.match.pickupPerExtraFighter)
      : 0;
    const points = [...PICKUP_POINTS];
    for (let index = points.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(this.random() * (index + 1));
      [points[index], points[swap]] = [points[swap]!, points[index]!];
    }
    for (let index = 0; index < count; index += 1) {
      const point = points[index];
      const pickup = this.pickups.acquire();
      if (!pickup || !point) break;
      pickup.x = point.x;
      pickup.y = point.y;
      pickup.weapon = randomWeapon(this.random);
      pickup.phase = this.random() * Math.PI * 2;
      pickup.respawnTimer = 0;
    }
  }

  private showToast(value: string): void {
    this.toast = value;
    this.toastTimer = CONFIG.hud.toastSeconds;
  }

  private pauseShake(amount: number): void {
    this.shake = Math.min(CONFIG.world.camera.maxShake, this.shake + amount * this.shakeIntensity);
  }

  update(dt: number, input: InputFrame): FighterId | null {
    if (this.finished || this.isShutdown) return this.winner;
    this.elapsed += dt;
    this.toastTimer = Math.max(0, this.toastTimer - dt);
    this.shake = Math.max(0, this.shake - CONFIG.feedback.shakeDecay * dt);
    this.effects.update(dt);
    this.updatePickups(dt);

    for (const fighter of this.fighters) {
      if (fighter.stocks <= 0) continue;
      const isAI = this.botVsBot || fighter.controller === 'bot';
      const action = isAI ? this.botAction(fighter, dt) : null;
      const playerInput: PlayerInput = fighter.playerSlot === 2 ? input.player2 : input;
      this.updateFighter(fighter, dt, playerInput, action);
    }

    this.resolveFighterBumps();
    this.projectiles.update(dt);
    this.resolveProjectileHits();
    this.collectPickups();
    this.updateCamera(dt);

    const contenders = this.fighters.filter((fighter) => fighter.stocks > 0);
    if (contenders.length <= 1) {
      const winner = contenders[0] ?? this.fighters.find((fighter) => fighter.id === this.eliminationOrder.at(-2)) ?? this.human;
      this.finish(winner.id);
    }
    return this.winner;
  }

  private botAction(fighter: Fighter, dt: number): BotAction {
    return this.botController.update({
      self: fighter,
      fighters: this.fighters,
      projectiles: this.projectiles.pool.items,
      pickups: this.pickups.items,
      platforms: this.platforms,
      matchConfig: this.config,
      dt,
      random: this.random,
      simulatedAllBots: this.botVsBot,
    });
  }

  getBotStuckSeconds(id: FighterId): number { return this.botController.getStuckSeconds(id); }
  setParticleQuality(scale: number): void { this.effects.setQuality(scale); }
  setParticleLimit(limit: number): void { this.effects.setParticleLimit(limit); }

  private updateFighter(fighter: Fighter, dt: number, input: PlayerInput, botAction: BotAction | null): void {
    fighter.animationTime += dt;
    fighter.fireCooldown = Math.max(0, fighter.fireCooldown - dt);
    fighter.shootTimer = Math.max(0, fighter.shootTimer - dt);
    fighter.hitTimer = Math.max(0, fighter.hitTimer - dt);
    fighter.invulnerable = Math.max(0, fighter.invulnerable - dt);
    fighter.contactCooldown = Math.max(0, fighter.contactCooldown - dt);
    if (fighter.dead) {
      fighter.respawnTimer -= dt;
      if (fighter.respawnTimer <= 0 && fighter.stocks > 0) {
        const spawn = this.chooseSpawn(CONFIG.world.spawnPoints, this.fighters, fighter) ?? CONFIG.world.spawn.human;
        respawnFighter(fighter, spawn);
        this.faceNearestOpponent(fighter);
        this.showToast(`${fighter.displayName.toUpperCase()} BACK IN THE BRAWL!`);
      }
      return;
    }

    let axis = 0;
    let wantsJump = false;
    let wantsShoot = false;
    let aimAngle = fighter.facing > 0 ? 0 : Math.PI;
    if (fighter.playerSlot !== null && !this.botVsBot) {
      axis = Number(input.right) - Number(input.left);
      wantsJump = input.jumpPressed;
      wantsShoot = input.shoot && this.config.weaponsEnabled;
      if (axis !== 0) fighter.facing = axis > 0 ? 1 : -1;
      if (input.switchPressed && this.config.weaponsEnabled) cycleWeapon(fighter);
    } else if (botAction) {
      axis = botAction.move;
      wantsJump = botAction.jump && fighter.jumpsUsed < CONFIG.combat.maxJumps && fighter.botJumpCooldown <= dt;
      wantsShoot = botAction.shoot && this.config.weaponsEnabled;
      aimAngle = botAction.aimAngle;
      if (axis !== 0) fighter.facing = axis > 0 ? 1 : -1;
      if (this.config.weaponsEnabled && fighter.ammo[fighter.weapon] <= 0) cycleWeapon(fighter);
    }

    const targetSpeed = axis * (fighter.grounded ? CONFIG.fighters.groundSpeed : CONFIG.fighters.airSpeed);
    const acceleration = (fighter.grounded ? CONFIG.fighters.groundAcceleration : CONFIG.fighters.airAcceleration) * dt;
    const friction = (fighter.grounded ? CONFIG.fighters.groundFriction : CONFIG.fighters.airFriction) * dt;
    if (axis !== 0) fighter.vx = approachNumber(fighter.vx, targetSpeed, acceleration);
    else fighter.vx = approachNumber(fighter.vx, 0, friction);

    if (wantsJump && fighter.jumpsUsed < CONFIG.combat.maxJumps && (fighter.grounded || fighter.playerSlot === null || this.botVsBot)) {
      fighter.vy = -(fighter.jumpsUsed === 0 ? CONFIG.fighters.jumpVelocity : CONFIG.fighters.doubleJumpVelocity);
      fighter.jumpsUsed += 1;
      fighter.grounded = false;
      this.effects.dust(fighter.x, fighter.y + fighter.height, fighter.color);
      this.audio.play('jump');
    }

    if (wantsShoot && this.config.weaponsEnabled) {
      const firedWeapon = fighter.weapon;
      const fired = fireWeapon(fighter, aimAngle, this.projectiles, this.effects, this.random);
      if (fired.fired) {
        if (botAction) this.botController.recordShot(fighter, this.config.difficulty);
        this.audio.play('shot', firedWeapon);
        this.pauseShake(firedWeapon === 'rocket' ? CONFIG.feedback.rocketShake * 0.12 : 0.25);
      } else if (fired.empty && fighter.playerSlot === 1) {
        this.showToast('OUT OF AMMO — GRAB A PICKUP!');
      }
    }

    const previousBottom = fighter.y + fighter.height;
    fighter.x = clamp(fighter.x + fighter.vx * dt, fighter.width * 0.5, CONFIG.world.width - fighter.width * 0.5);
    fighter.vy = Math.min(CONFIG.fighters.maxFallSpeed, fighter.vy + CONFIG.world.gravity * dt);
    fighter.y += fighter.vy * dt;
    const nextBottom = fighter.y + fighter.height;
    const landing = landingPlatform(previousBottom, nextBottom, fighter.x - fighter.width * 0.5, fighter.x + fighter.width * 0.5);
    if (landing) {
      if (!fighter.grounded && fighter.vy > 260) this.effects.dust(fighter.x, landing.y, '#f4d993');
      fighter.y = landing.y - fighter.height;
      fighter.vy = 0;
      fighter.grounded = true;
      fighter.jumpsUsed = 0;
    } else {
      fighter.grounded = false;
    }

    if (fighter.y > CONFIG.world.killY) this.knockout(fighter);
  }

  private faceNearestOpponent(fighter: Fighter): void {
    const nearest = this.fighters
      .filter((other) => other.id !== fighter.id && !other.dead && other.stocks > 0)
      .sort((a, b) => distance(fighter.x, fighter.y, a.x, a.y) - distance(fighter.x, fighter.y, b.x, b.y))[0];
    if (nearest) fighter.facing = nearest.x >= fighter.x ? 1 : -1;
  }

  private knockout(fighter: Fighter): void {
    if (fighter.dead) return;
    fighter.stocks = Math.max(0, fighter.stocks - 1);
    fighter.dead = true;
    fighter.respawnTimer = CONFIG.fighters.respawnSeconds;
    fighter.vx = 0;
    fighter.vy = 0;
    fighter.grounded = false;
    if (fighter.stocks <= 0 && !this.eliminationOrder.includes(fighter.id)) this.eliminationOrder.push(fighter.id);
    this.showToast(fighter.stocks > 0 ? `${fighter.displayName.toUpperCase()} RING OUT! ${fighter.stocks} STOCK${fighter.stocks === 1 ? '' : 'S'} LEFT.` : `${fighter.displayName.toUpperCase()} ELIMINATED!`);
    this.audio.play('hit');
  }

  private resolveFighterBumps(): void {
    for (let first = 0; first < this.fighters.length; first += 1) {
      const a = this.fighters[first];
      if (!a || a.dead || a.stocks <= 0) continue;
      for (let second = first + 1; second < this.fighters.length; second += 1) {
        const b = this.fighters[second];
        if (!b || b.dead || b.stocks <= 0) continue;
        const rectA = { x: a.x - a.width * 0.5, y: a.y, width: a.width, height: a.height };
        const rectB = { x: b.x - b.width * 0.5, y: b.y, width: b.width, height: b.height };
        if (!overlaps(rectA, rectB)) continue;
        const direction: -1 | 1 = a.x <= b.x ? -1 : 1;
        a.x += direction * CONFIG.combat.bumpSeparation;
        b.x -= direction * CONFIG.combat.bumpSeparation;
        if (!this.config.weaponsEnabled && a.contactCooldown <= 0 && b.contactCooldown <= 0) {
          a.vx = direction * CONFIG.match.unarmedBumpKnockback;
          b.vx = -direction * CONFIG.match.unarmedBumpKnockback;
          a.vy = -CONFIG.match.unarmedBumpLift;
          b.vy = -CONFIG.match.unarmedBumpLift;
          a.grounded = false;
          b.grounded = false;
          a.contactCooldown = CONFIG.match.unarmedBumpCooldown;
          b.contactCooldown = CONFIG.match.unarmedBumpCooldown;
        }
      }
    }
  }

  private resolveProjectileHits(): void {
    for (const projectile of this.projectiles.pool.items) {
      if (!projectile.active) continue;
      const targets = this.fighters
        .filter((fighter) => fighter.id !== projectile.owner && fighter.stocks > 0 && !fighter.dead)
        .sort((a, b) => distance(projectile.x, projectile.y, a.x, a.y) - distance(projectile.x, projectile.y, b.x, b.y));
      const target = targets.find((fighter) => overlapsCircle(projectile.x, projectile.y, projectile.radius + CONFIG.combat.fighterHitRadius, fighter)) ?? null;
      const weapon = CONFIG.weapons[projectile.weapon];
      const platform = CONFIG.world.platforms.find((item) => projectile.x >= item.x && projectile.x <= item.x + item.width && projectile.y + projectile.radius >= item.y && projectile.y - projectile.radius <= item.y + item.height);
      if (projectile.weapon === 'rocket' && (target || platform)) {
        this.detonate(projectile.x, projectile.y, projectile.weapon, target, projectile.owner);
        projectile.active = false;
      } else if (target) {
        this.applyImpact(target, projectile.weapon, projectile.x, projectile.vx, 1);
        projectile.active = false;
      } else if (platform) {
        projectile.active = false;
        this.effects.burst(projectile.x, projectile.y, weapon.color, CONFIG.particles.platformHitCount, CONFIG.particles.platformHitSpeed, CONFIG.particles.platformHitLifetime, CONFIG.particles.platformHitGravity, true);
      }
      if (!projectile.active) continue;
      if (projectile.trailTimer <= 0) {
        this.effects.burst(projectile.x, projectile.y, weapon.color, CONFIG.particles.trailCount, CONFIG.particles.trailSpeed, CONFIG.particles.trailLifetime, 0, true);
        projectile.trailTimer = CONFIG.combat.bulletTrailInterval;
      }
    }
  }

  private detonate(x: number, y: number, weaponId: 'rocket', directTarget: Fighter | null, owner: FighterId): void {
    const weapon = CONFIG.weapons[weaponId];
    this.effects.explosion(x, y, weapon.color);
    this.audio.play('explosion', 'rocket');
    this.pauseShake(CONFIG.feedback.rocketShake);
    for (const target of this.fighters) {
      if (target.id === owner || target.dead || target.stocks <= 0 || target.invulnerable > 0) continue;
      const centerX = target.x;
      const centerY = target.y + target.height * 0.5;
      const distanceToBlast = distance(x, y, centerX, centerY);
      if (distanceToBlast > weapon.explosionRadius) continue;
      const scale = directTarget === target ? 1 : (1 - distanceToBlast / weapon.explosionRadius) * CONFIG.combat.rocketSplashScale;
      this.applyImpact(target, weaponId, x, centerX - x, scale);
    }
  }

  private applyImpact(target: Fighter, weaponId: 'pistol' | 'shotgun' | 'rocket', sourceX: number, horizontalVelocity: number, scale: number): void {
    if (target.dead || target.invulnerable > 0) return;
    const weapon = CONFIG.weapons[weaponId];
    let direction: -1 | 1 = target.x >= sourceX ? 1 : -1;
    if (Math.abs(target.x - sourceX) < 1) direction = horizontalVelocity < 0 ? 1 : -1;
    const force = calculateKnockback({ baseKnockback: weapon.knockback, damage: weapon.damage, direction, scale });
    target.vx = force.x;
    target.vy = force.y;
    target.grounded = false;
    target.hitTimer = CONFIG.combat.hitStunSeconds;
    this.effects.burst(target.x, target.y + target.height * 0.42, '#fff6d5', CONFIG.particles.impactCount, CONFIG.particles.impactSpeed, CONFIG.particles.impactLifetime, 0, true);
    this.audio.play('hit');
    this.pauseShake(weaponId === 'rocket' ? CONFIG.feedback.rocketShake : CONFIG.feedback.hitShake);
  }

  private updatePickups(dt: number): void {
    if (!this.config.weaponsEnabled) return;
    const count = Math.min(this.pickups.items.length, CONFIG.match.pickupBaseCount + Math.max(0, this.fighters.length - 2) * CONFIG.match.pickupPerExtraFighter);
    let activeCount = this.pickups.items.reduce((total, pickup) => total + Number(pickup.active), 0);
    for (const pickup of this.pickups.items) {
      pickup.phase += CONFIG.combat.pickupFloatSpeed * dt;
      if (pickup.active) continue;
      if (activeCount >= count || pickup.respawnTimer <= 0) continue;
      pickup.respawnTimer -= dt;
      if (pickup.respawnTimer <= 0) {
        const point = PICKUP_POINTS[Math.floor(this.random() * PICKUP_POINTS.length)];
        if (point) { pickup.x = point.x; pickup.y = point.y; }
        pickup.weapon = randomWeapon(this.random);
        pickup.respawnTimer = 0;
        pickup.active = true;
        activeCount += 1;
      }
    }
  }

  private collectPickups(): void {
    if (!this.config.weaponsEnabled) return;
    for (const pickup of this.pickups.items) {
      if (!pickup.active) continue;
      for (const fighter of this.fighters) {
        if (fighter.dead || fighter.stocks <= 0 || !overlapsCircle(pickup.x, pickup.y, 25, fighter)) continue;
        const weapon = CONFIG.weapons[pickup.weapon];
        fighter.weapon = pickup.weapon;
        fighter.ammo[pickup.weapon] = Math.min(weapon.ammo, fighter.ammo[pickup.weapon] + weapon.pickupAmmo);
        pickup.active = false;
        const fighterCountScale = 1 + Math.max(0, this.fighters.length - 2) * CONFIG.match.pickupRespawnRatePerFighter;
        pickup.respawnTimer = CONFIG.combat.pickupRespawnSeconds / fighterCountScale;
        this.showToast(`${fighter.displayName.toUpperCase()} GRABBED ${weapon.label}!`);
        this.effects.burst(pickup.x, pickup.y, weapon.color, CONFIG.particles.pickupCount, CONFIG.particles.pickupSpeed, CONFIG.particles.pickupLifetime, CONFIG.particles.pickupGravity, true);
        this.audio.play('pickup');
        break;
      }
    }
  }

  private cameraTarget(): number {
    const visible = this.fighters.filter((fighter) => !fighter.dead && fighter.stocks > 0);
    const actors = visible.length ? visible : this.fighters;
    const center = actors.reduce((sum, fighter) => sum + fighter.x, 0) / Math.max(1, actors.length);
    return clamp(center - CONFIG.canvas.width * 0.5, 0, CONFIG.world.width - CONFIG.canvas.width);
  }

  private updateCamera(dt: number): void {
    const target = this.cameraTarget();
    this.cameraX += (target - this.cameraX) * (1 - Math.pow(1 - CONFIG.world.camera.follow, dt * CONFIG.canvas.targetFps));
  }

  private finish(winner: FighterId): void {
    if (this.finished) return;
    this.finished = true;
    this.winner = winner;
    const winningFighter = this.fighters.find((fighter) => fighter.id === winner);
    this.audio.play(winningFighter?.playerSlot !== null && winningFighter?.playerSlot !== undefined ? 'win' : 'lose');
    this.events.emit(SCENE_EVENTS.GAME_OVER, winner);
  }
}

function approachNumber(value: number, target: number, amount: number): number {
  if (value < target) return Math.min(target, value + amount);
  return Math.max(target, value - amount);
}
