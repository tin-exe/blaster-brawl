import { CONFIG } from '../config';
import { distanceToPlatformEdge } from '../entities/world';
import type { BotAction, Fighter, MatchConfig, Pickup, Platform, Projectile } from '../types';
import { getDifficultyProfile } from './difficulty';
import { chooseDodge, getBotAction, getBotAimError, getRecoveryDirection, getStuckFallback, selectPickup, selectTarget, updateStuckState, type StuckState } from './decisions';

export interface BotContext {
  self: Fighter;
  fighters: readonly Fighter[];
  projectiles: readonly Projectile[];
  pickups: readonly Pickup[];
  platforms: readonly Platform[];
  matchConfig: MatchConfig;
  dt: number;
  random: () => number;
  simulatedAllBots?: boolean;
}

export interface BotMemory {
  reactionRemaining: number;
  burstShots: number;
  burstPauseRemaining: number;
  action: BotAction;
  stuck: StuckState;
}

export function createBotMemory(fighter: Fighter): BotMemory {
  return {
    reactionRemaining: 0,
    burstShots: 0,
    burstPauseRemaining: 0,
    action: { move: 0, jump: false, shoot: false, aimAngle: fighter.facing > 0 ? 0 : Math.PI },
    stuck: { seconds: 0, lastX: fighter.x, lastY: fighter.y, triggered: false },
  };
}

export class BotController {
  private readonly memory = new Map<Fighter['id'], BotMemory>();

  update(context: BotContext): BotAction {
    const { self, matchConfig, dt, random } = context;
    let state = this.memory.get(self.id);
    if (!state) {
      state = createBotMemory(self);
      this.memory.set(self.id, state);
    }
    const profile = getDifficultyProfile(matchConfig.difficulty);
    self.botJumpCooldown = Math.max(0, self.botJumpCooldown - dt);
    state.reactionRemaining = Math.max(0, state.reactionRemaining - dt);
    state.burstPauseRemaining = Math.max(0, state.burstPauseRemaining - dt);

    if (state.reactionRemaining <= 0) {
      state.action = this.planAction(context, profile);
      state.reactionRemaining = profile.reactionTimeDelay;
    }

    let action: BotAction = { ...state.action };
    const dodge = matchConfig.weaponsEnabled
      ? chooseDodge(self, context.projectiles, profile, CONFIG.ai.projectileLookAhead, CONFIG.ai.dodgeDistance, random())
      : null;
    if (dodge) {
      action.move = dodge.direction;
      if (dodge.jump && self.jumpsUsed < CONFIG.combat.maxJumps && self.botJumpCooldown <= 0) {
        action.jump = true;
        self.botJumpCooldown = CONFIG.bot.jumpCooldown;
      }
    }

    if (!self.grounded && self.vy > 55) {
      const recovery = getRecoveryDirection(self, context.platforms, CONFIG.ai.recoveryMargin);
      if (recovery.platform && Math.abs(self.x - recovery.targetX) > CONFIG.ai.recoveryMargin * 0.55) action.move = recovery.direction;
      const fallingPastLedge = recovery.platform !== null && self.y + self.height > recovery.platform.y + 12;
      if (fallingPastLedge && self.jumpsUsed < CONFIG.combat.maxJumps && self.botJumpCooldown <= 0) {
        action.jump = true;
        self.botJumpCooldown = CONFIG.bot.jumpCooldown;
      }
    }

    const tryingToMove = action.move !== 0 || (!self.grounded && self.vy > 0);
    state.stuck = updateStuckState(state.stuck, self.x, self.y, dt, profile.stuckTimeout, CONFIG.ai.stuckMovementEpsilon, tryingToMove);
    if (state.stuck.triggered) {
      const fallback = getStuckFallback(self, context.platforms, CONFIG.ai.recoveryMargin);
      action.move = fallback.move;
      if (fallback.jump && self.jumpsUsed < CONFIG.combat.maxJumps && self.botJumpCooldown <= 0) {
        action.jump = true;
        self.botJumpCooldown = CONFIG.bot.jumpCooldown;
      }
      state.reactionRemaining = Math.min(state.reactionRemaining, profile.reactionTimeDelay * 0.25);
    }

    if (matchConfig.weaponsEnabled && action.shoot && self.ammo[self.weapon] > 0 && self.fireCooldown <= dt) {
      if (profile.fireDiscipline === 'spray') action.shoot = random() <= profile.sprayShotProbability;
      else action.shoot = state.burstPauseRemaining <= 0;
    } else {
      action.shoot = false;
    }
    return action;
  }

  recordShot(fighter: Fighter, difficulty: MatchConfig['difficulty']): void {
    const state = this.memory.get(fighter.id);
    if (!state) return;
    const profile = getDifficultyProfile(difficulty);
    if (profile.fireDiscipline !== 'burst') return;
    state.burstShots += 1;
    if (state.burstShots >= profile.burstSize) {
      state.burstShots = 0;
      state.burstPauseRemaining = profile.burstPauseSeconds;
    }
  }

  getStuckSeconds(id: Fighter['id']): number { return this.memory.get(id)?.stuck.seconds ?? 0; }

  private planAction(context: BotContext, profile: ReturnType<typeof getDifficultyProfile>): BotAction {
    const { self, fighters, pickups, platforms, matchConfig, random } = context;
    const opponents = fighters.filter((fighter) => fighter.id !== self.id && !fighter.dead);
    const target = selectTarget(self, opponents, profile.visionRange, platforms);
    const pickup = matchConfig.weaponsEnabled
      ? selectPickup(self, pickups, profile.pickupPriority, CONFIG.ai.pickupDecisionRadius, random())
      : null;
    const shouldChasePickup = pickup !== null && (!target || random() < profile.pickupPriority * 0.32);

    if (shouldChasePickup && pickup) {
      const direction: -1 | 0 | 1 = pickup.x > self.x + 18 ? 1 : pickup.x < self.x - 18 ? -1 : 0;
      const jump = direction !== 0 && pickup.y + 8 < self.y && self.grounded && self.jumpsUsed < CONFIG.combat.maxJumps;
      return { move: direction, jump, shoot: false, aimAngle: self.facing > 0 ? 0 : Math.PI, targetId: null };
    }

    if (!target) {
      const recovery = getRecoveryDirection(self, platforms, CONFIG.ai.recoveryMargin);
      const move = recovery.direction || (self.x < CONFIG.world.width * 0.5 ? 1 : -1);
      const atEdge = distanceToPlatformEdge(self, move) < CONFIG.bot.edgeLookAhead;
      return { move, jump: self.grounded && atEdge && self.jumpsUsed < CONFIG.combat.maxJumps, shoot: false, aimAngle: self.facing > 0 ? 0 : Math.PI, targetId: null };
    }

    const dx = target.x - self.x;
    const aim = getBotAction({
      selfX: self.x,
      selfY: self.y + self.height * 0.42,
      targetX: target.x,
      targetY: target.y + target.height * 0.42,
      selfGrounded: self.grounded,
      selfFacing: self.facing,
      selfCanJump: self.jumpsUsed < CONFIG.combat.maxJumps && self.botJumpCooldown <= 0,
      distanceToEdge: distanceToPlatformEdge(self, dx < 0 ? -1 : 1),
      edgeLookAhead: CONFIG.bot.edgeLookAhead,
      shootRange: CONFIG.bot.shootingRange,
      preferredDistance: CONFIG.bot.preferredDistance,
      closeDistance: CONFIG.bot.closeDistance,
      jumpTargetHeight: CONFIG.bot.jumpTargetHeight,
      aggression: profile.aimAccuracy,
    });
    aim.aimAngle += getBotAimError(random(), profile.aimErrorRadians, profile.aimAccuracy);
    aim.targetId = target.id;
    if (aim.jump) self.botJumpCooldown = CONFIG.bot.jumpCooldown;
    return aim;
  }
}
