import { CONFIG } from '../config';
import type { DifficultyLevel } from '../types';

export type FireDiscipline = 'spray' | 'burst';
export type DifficultyProfile = (typeof CONFIG.ai.difficulties)[DifficultyLevel];
export const DIFFICULTY_LEVELS: readonly DifficultyLevel[] = ['easy', 'normal', 'hard'];

export function getDifficultyProfile(level: DifficultyLevel): DifficultyProfile {
  return CONFIG.ai.difficulties[level];
}

export function isDifficultyProfileValid(value: unknown): value is DifficultyProfile {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const profile = value as Record<string, unknown>;
  const finiteRange = (candidate: unknown, min: number, max: number): candidate is number =>
    typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= min && candidate <= max;
  const dodge = profile.dodgeChance;
  if (typeof dodge !== 'object' || dodge === null || Array.isArray(dodge)) return false;
  const dodgeChance = dodge as Record<string, unknown>;
  return typeof profile.label === 'string'
    && finiteRange(profile.reactionTimeDelay, 0.05, 1.5)
    && finiteRange(profile.aimAccuracy, 0.05, 0.95)
    && finiteRange(profile.aimErrorRadians, 0.02, 0.5)
    && (profile.fireDiscipline === 'spray' || profile.fireDiscipline === 'burst')
    && finiteRange(profile.sprayShotProbability, 0.05, 1)
    && typeof profile.burstSize === 'number' && Number.isInteger(profile.burstSize) && profile.burstSize >= 1 && profile.burstSize <= 8
    && finiteRange(profile.burstPauseSeconds, 0.05, 2)
    && finiteRange(dodgeChance.bullet, 0, 1)
    && finiteRange(dodgeChance.rocket, 0, 1)
    && finiteRange(profile.pickupPriority, 0, 1)
    && finiteRange(profile.visionRange, 200, 1200)
    && finiteRange(profile.stuckTimeout, 0.3, 3);
}
