import { CONFIG } from '../config';
import { hashState } from '../engine/state-hash';
import type { ArenaDefinition, ArenaHazard, PowerUpId } from '../types';

export const CONTENT_SCHEMA_VERSION = 1;
export const CONTENT_VERSION = '2.0.0';

export interface PowerUpDefinition {
  id: PowerUpId;
  schemaVersion: number;
}

export interface ContentManifest {
  schemaVersion: number;
  contentVersion: string;
  rulesetHash: string;
  arenas: readonly ArenaDefinition[];
  powerUps: readonly PowerUpDefinition[];
}

const rulesetPayload = {
  schemaVersion: CONTENT_SCHEMA_VERSION,
  world: {
    width: CONFIG.world.width,
    height: CONFIG.world.height,
    gravity: CONFIG.world.gravity,
    groundY: CONFIG.world.groundY,
    killY: CONFIG.world.killY,
    spawnPoints: CONFIG.world.spawnPoints,
    arenas: CONFIG.world.arenas.map(({ id, schemaVersion, platforms, hazards }) => ({ id, schemaVersion, platforms, hazards })),
  },
  fighters: CONFIG.fighters,
  weapons: CONFIG.weapons,
  powerups: CONFIG.powerups,
  combat: CONFIG.combat,
  bot: CONFIG.bot,
  ai: CONFIG.ai,
  match: {
    defaultStocks: CONFIG.match.defaultStocks,
    minStocks: CONFIG.match.minStocks,
    maxStocks: CONFIG.match.maxStocks,
    minBots: CONFIG.match.minBots,
    maxBots: CONFIG.match.maxBots,
    pickupBaseCount: CONFIG.match.pickupBaseCount,
    pickupPerExtraFighter: CONFIG.match.pickupPerExtraFighter,
    pickupRespawnRatePerFighter: CONFIG.match.pickupRespawnRatePerFighter,
    unarmedBumpKnockback: CONFIG.match.unarmedBumpKnockback,
    unarmedBumpLift: CONFIG.match.unarmedBumpLift,
    unarmedBumpCooldown: CONFIG.match.unarmedBumpCooldown,
    modes: CONFIG.match.modes.map(({ id, humanPlayers, minBots, maxBots, defaultBots }) => ({ id, humanPlayers, minBots, maxBots, defaultBots })),
  },
};

/** Compatibility fingerprint, not a cryptographic signature or anti-cheat proof. */
export const RULESET_HASH = `fnv1a64-v${CONTENT_SCHEMA_VERSION}:${hashState(rulesetPayload)}`;

function overlaps(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function validateArena(arena: ArenaDefinition): boolean {
  if (!arena.id || !Number.isInteger(arena.schemaVersion) || arena.schemaVersion < 1 || arena.platforms.length === 0) return false;
  for (const platform of arena.platforms) {
    if (![platform.x, platform.y, platform.width, platform.height].every(Number.isFinite)) return false;
    if (platform.x < 0 || platform.y < 0 || platform.width <= 0 || platform.height <= 0) return false;
    if (platform.x + platform.width > CONFIG.world.width || platform.y + platform.height > CONFIG.world.height) return false;
  }
  const hazardIds = new Set<string>();
  for (const hazard of arena.hazards) {
    if (!validateHazard(hazard) || hazardIds.has(hazard.id)) return false;
    hazardIds.add(hazard.id);
    if (hazard.x + hazard.width > CONFIG.world.width || hazard.y + hazard.height > CONFIG.world.height) return false;
    for (const spawn of CONFIG.world.spawnPoints) {
      const spawnRect = { x: spawn.x - CONFIG.fighters.width / 2, y: spawn.y, width: CONFIG.fighters.width, height: CONFIG.fighters.height };
      if (overlaps(spawnRect, hazard)) return false;
    }
  }
  return true;
}

function validateHazard(hazard: ArenaHazard): boolean {
  return Boolean(hazard.id)
    && Number.isInteger(hazard.schemaVersion) && hazard.schemaVersion >= 1
    && [hazard.x, hazard.y, hazard.width, hazard.height, hazard.damage, hazard.knockbackX, hazard.knockbackY].every(Number.isFinite)
    && hazard.x >= 0 && hazard.y >= 0 && hazard.width > 0 && hazard.height > 0 && hazard.damage >= 0
    && Number.isInteger(hazard.periodTicks) && hazard.periodTicks > 0
    && Number.isInteger(hazard.activeTicks) && hazard.activeTicks > 0 && hazard.activeTicks < hazard.periodTicks
    && Number.isInteger(hazard.phaseTicks) && hazard.phaseTicks >= 0
    && Number.isInteger(hazard.cooldownTicks) && hazard.cooldownTicks > 0;
}

export function isHazardActiveAtTick(hazard: ArenaHazard, tick: number): boolean {
  if (!Number.isInteger(tick) || tick < 0 || !validateHazard(hazard)) return false;
  return ((tick + hazard.phaseTicks) % hazard.periodTicks) < hazard.activeTicks;
}

const powerUps: readonly PowerUpDefinition[] = [
  { id: 'shield', schemaVersion: CONFIG.powerups.shield.schemaVersion },
  { id: 'overdrive', schemaVersion: CONFIG.powerups.overdrive.schemaVersion },
  { id: 'spring', schemaVersion: CONFIG.powerups.spring.schemaVersion },
];

export const GAME_CONTENT: ContentManifest = {
  schemaVersion: CONTENT_SCHEMA_VERSION,
  contentVersion: CONTENT_VERSION,
  rulesetHash: RULESET_HASH,
  arenas: CONFIG.world.arenas as readonly ArenaDefinition[],
  powerUps,
};

export function validateContentManifest(manifest: ContentManifest): boolean {
  if (manifest.schemaVersion !== CONTENT_SCHEMA_VERSION || !manifest.contentVersion || manifest.rulesetHash !== RULESET_HASH) return false;
  if (manifest.arenas.length === 0 || manifest.powerUps.length === 0) return false;
  const arenaIds = new Set<string>();
  for (const arena of manifest.arenas) {
    if (!validateArena(arena) || arenaIds.has(arena.id)) return false;
    arenaIds.add(arena.id);
  }
  const powerUpIds = new Set<string>();
  for (const powerUp of manifest.powerUps) {
    if (!powerUp.id || !Number.isInteger(powerUp.schemaVersion) || powerUp.schemaVersion < 1 || powerUpIds.has(powerUp.id)) return false;
    powerUpIds.add(powerUp.id);
  }
  return true;
}

export const VALID_ARENAS: readonly ArenaDefinition[] = GAME_CONTENT.arenas.filter(validateArena);
export const SAFE_DEFAULT_ARENA: ArenaDefinition = VALID_ARENAS.find((arena) => arena.id === 'meadow') ?? CONFIG.world.arenas[0];
