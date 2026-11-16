import { CONFIG } from '../config';
import { angleForVector } from '../engine/deterministic-trig';
import { squaredDistance } from '../engine/math';
import type { BotAction, BotObservation, Fighter, Pickup, Platform, Projectile } from '../types';
import type { DifficultyProfile } from './difficulty';

export interface StuckState { seconds: number; lastX: number; lastY: number; triggered: boolean }
export interface DodgeDecision { direction: -1 | 1; jump: boolean; threatWeapon: Projectile['weapon'] }
export interface RecoveryDecision { direction: -1 | 0 | 1; targetX: number; targetY: number; platform: Platform | null }

export function getBotAction(observation: BotObservation): BotAction {
  const dx = observation.targetX - observation.selfX;
  const dy = observation.targetY - observation.selfY;
  const absoluteDistance = Math.abs(dx);
  const direction: -1 | 1 = dx < 0 ? -1 : 1;
  const tooClose = absoluteDistance < observation.closeDistance;
  const tooFar = absoluteDistance > observation.preferredDistance;
  const move: -1 | 0 | 1 = tooFar ? direction : tooClose ? (direction === 1 ? -1 : 1) : 0;
  const movingTowardTarget = move !== 0 && Math.sign(move) === direction;
  const edgeDanger = observation.selfGrounded && observation.distanceToEdge < observation.edgeLookAhead && movingTowardTarget;
  const jump = observation.selfGrounded && observation.selfCanJump && (
    edgeDanger || (dy < -observation.jumpTargetHeight && absoluteDistance < observation.shootRange * 0.82)
  );
  const aimAngle = angleForVector(dx || direction, dy);
  const shooting = absoluteDistance < observation.shootRange && Math.abs(dy) < observation.jumpTargetHeight * 2.6;
  return { move, jump, shoot: shooting && (tooFar || Math.abs(dy) < observation.jumpTargetHeight * 1.6), aimAngle };
}

export function getBotAimError(randomValue: number, errorRadians: number, accuracy: number): number {
  let centeredNoise = randomValue * 2 - 1;
  if (Math.abs(centeredNoise) < 0.08) centeredNoise = randomValue < 0.5 ? -0.08 : 0.08;
  const effectiveError = errorRadians * (1.15 - Math.max(0, Math.min(1, accuracy)) * 0.45);
  return centeredNoise * effectiveError;
}

export function lineBlocked(x1: number, y1: number, x2: number, y2: number, platforms: readonly Platform[]): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  for (const platform of platforms) {
    const left = platform.x;
    const right = platform.x + platform.width;
    const top = platform.y;
    const bottom = platform.y + platform.height;
    const p = [-dx, dx, -dy, dy];
    const q = [x1 - left, right - x1, y1 - top, bottom - y1];
    let enter = 0;
    let exit = 1;
    let intersects = true;
    for (let index = 0; index < 4; index += 1) {
      const denominator = p[index] ?? 0;
      const numerator = q[index] ?? 0;
      if (Math.abs(denominator) < 1e-9) {
        if (numerator < 0) { intersects = false; break; }
        continue;
      }
      const ratio = numerator / denominator;
      if (denominator < 0) enter = Math.max(enter, ratio);
      else exit = Math.min(exit, ratio);
      if (enter > exit) { intersects = false; break; }
    }
    if (intersects && exit > 0.08 && enter < 0.92 && exit - enter > 0.012) return true;
  }
  return false;
}

export function selectTarget(self: Fighter, candidates: readonly Fighter[], visionRange: number, platforms: readonly Platform[]): Fighter | null {
  let selected: Fighter | null = null;
  let selectedDistanceSquared = Number.POSITIVE_INFINITY;
  const visionRangeSquared = visionRange * visionRange;
  for (const candidate of candidates) {
    if (candidate.id === self.id || candidate.dead) continue;
    const selfY = self.y + self.height * 0.42;
    const targetY = candidate.y + candidate.height * 0.42;
    const currentDistanceSquared = squaredDistance(self.x, selfY, candidate.x, targetY);
    if (currentDistanceSquared > visionRangeSquared || currentDistanceSquared >= selectedDistanceSquared) continue;
    if (lineBlocked(self.x, selfY, candidate.x, targetY, platforms)) continue;
    selected = candidate;
    selectedDistanceSquared = currentDistanceSquared;
  }
  return selected;
}

export function selectPickup(self: Fighter, pickups: readonly Pickup[], priority: number, maxDistance: number, randomValue: number): Pickup | null {
  if (randomValue > priority) return null;
  let selected: Pickup | null = null;
  let selectedDistanceSquared = maxDistance * maxDistance;
  for (const pickup of pickups) {
    if (!pickup.active) continue;
    const currentDistanceSquared = squaredDistance(self.x, self.y + self.height * 0.5, pickup.x, pickup.y);
    if (currentDistanceSquared < selectedDistanceSquared) {
      selected = pickup;
      selectedDistanceSquared = currentDistanceSquared;
    }
  }
  return selected;
}

export function chooseDodge(
  self: Fighter,
  projectiles: readonly Projectile[],
  profile: DifficultyProfile,
  lookAhead: number,
  safeRadius: number,
  randomValue: number,
): DodgeDecision | null {
  let best: { decision: DodgeDecision; danger: number } | null = null;
  for (const projectile of projectiles) {
    if (!projectile.active || projectile.owner === self.id) continue;
    const relativeX = projectile.x - self.x;
    const relativeY = projectile.y - (self.y + self.height * 0.5);
    const speedSquared = projectile.vx * projectile.vx + projectile.vy * projectile.vy;
    if (speedSquared < 1) continue;
    const time = -(relativeX * projectile.vx + relativeY * projectile.vy) / speedSquared;
    if (time <= 0 || time > lookAhead) continue;
    const closestX = relativeX + projectile.vx * time;
    const closestY = relativeY + projectile.vy * time;
    const missDistanceSquared = closestX * closestX + closestY * closestY;
    const hitRadius = safeRadius + projectile.radius * (projectile.weapon === 'rocket' ? 1.65 : 1);
    if (missDistanceSquared > hitRadius * hitRadius) continue;
    const chance = projectile.weapon === 'rocket' ? profile.dodgeChance.rocket : profile.dodgeChance.bullet;
    if (randomValue > chance) continue;
    const away = self.x >= projectile.x ? 1 : -1;
    const danger = chance * (projectile.weapon === 'rocket' ? 2 : 1) / Math.max(0.05, time);
    if (!best || danger > best.danger) best = { decision: { direction: away, jump: self.grounded, threatWeapon: projectile.weapon }, danger };
  }
  return best?.decision ?? null;
}

export function getRecoveryDirection(self: Fighter, platforms: readonly Platform[], safeMargin: number): RecoveryDecision {
  let best: RecoveryDecision = { direction: 0, targetX: self.x, targetY: self.y, platform: null };
  let bestScoreSquared = Number.POSITIVE_INFINITY;
  for (const platform of platforms) {
    const leftEdge = platform.x + self.width * 0.5 + safeMargin;
    const rightEdge = platform.x + platform.width - self.width * 0.5 - safeMargin;
    if (rightEdge <= leftEdge) continue;
    const targetX = self.x < leftEdge ? leftEdge : self.x > rightEdge ? rightEdge : (Math.abs(self.x - leftEdge) < Math.abs(self.x - rightEdge) ? leftEdge : rightEdge);
    const verticalGap = Math.abs(self.y + self.height - platform.y);
    const horizontalGap = self.x - targetX;
    const scaledVerticalGap = verticalGap * 0.82;
    const scoreSquared = horizontalGap * horizontalGap + scaledVerticalGap * scaledVerticalGap;
    if (scoreSquared < bestScoreSquared) {
      bestScoreSquared = scoreSquared;
      best = { direction: targetX > self.x + 4 ? 1 : targetX < self.x - 4 ? -1 : 0, targetX, targetY: platform.y - self.height, platform };
    }
  }
  return best;
}

export function updateStuckState(previous: StuckState, x: number, y: number, dt: number, threshold: number, epsilon: number, tryingToMove: boolean): StuckState {
  const moved = squaredDistance(previous.lastX, previous.lastY, x, y) > epsilon * epsilon;
  const seconds = tryingToMove && !moved ? previous.seconds + dt : 0;
  return { seconds, lastX: x, lastY: y, triggered: seconds >= threshold };
}

export function getStuckFallback(self: Fighter, platforms: readonly Platform[], safeMargin: number): { move: -1 | 1; jump: boolean } {
  const recovery = getRecoveryDirection(self, platforms, safeMargin);
  if (recovery.direction !== 0) return { move: recovery.direction, jump: !self.grounded && self.jumpsUsed < CONFIG.combat.maxJumps };
  const currentPlatform = platforms.find((platform) => self.x >= platform.x && self.x <= platform.x + platform.width && Math.abs(self.y + self.height - platform.y) < 18);
  if (currentPlatform) {
    const center = currentPlatform.x + currentPlatform.width * 0.5;
    const direction: -1 | 1 = center > self.x ? 1 : center < self.x ? -1 : (self.facing > 0 ? -1 : 1);
    return { move: direction, jump: true };
  }
  return { move: self.facing > 0 ? -1 : 1, jump: self.jumpsUsed < CONFIG.combat.maxJumps };
}
