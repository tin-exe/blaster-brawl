import { hashState } from '../engine/state-hash';
import type { MatchConfig } from '../types';
import { createMatchConfig } from './match-config';
import { RULESET_HASH } from './content';

export interface DailyChallenge {
  schemaVersion: 1;
  challengeDate: string;
  seed: number;
  rulesetHash: string;
  config: MatchConfig;
}

function utcDate(value: Date | string): string {
  if (typeof value === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError('Daily challenge date must use YYYY-MM-DD.');
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new RangeError('Daily challenge date is invalid.');
    return value;
  }
  if (!Number.isFinite(value.getTime())) throw new RangeError('Daily challenge date is invalid.');
  return value.toISOString().slice(0, 10);
}

export function createDailyChallenge(date: Date | string): DailyChallenge {
  const challengeDate = utcDate(date);
  const fingerprint = hashState([challengeDate, RULESET_HASH]);
  const seed = Number.parseInt(fingerprint.slice(0, 8), 16) >>> 0;
  return {
    schemaVersion: 1,
    challengeDate,
    seed: seed || 1,
    rulesetHash: RULESET_HASH,
    config: createMatchConfig('daily', { botCount: 3, difficulty: 'hard', stocks: 3, weaponsEnabled: true }),
  };
}
