import type { InputFrame, MatchConfig, PlayerInput } from '../types';
import { DEFAULT_INPUT_LOG_TICKS, type InputLogSnapshot } from '../engine/input-log';
import { validateMatchConfig } from './match-config';

const INPUTS_PER_TICK = 16;

function readPlayer(frames: readonly number[], offset: number): PlayerInput {
  return {
    left: frames[offset] === 1,
    right: frames[offset + 1] === 1,
    leftPressed: frames[offset + 2] === 1,
    rightPressed: frames[offset + 3] === 1,
    jumpPressed: frames[offset + 4] === 1,
    jumpHeld: frames[offset + 5] === 1,
    shoot: frames[offset + 6] === 1,
    switchPressed: frames[offset + 7] === 1,
  };
}

export interface ReplayClip {
  schemaVersion: 1;
  gameVersion: number;
  rulesetHash: string;
  seed: number;
  arenaId: string;
  config: MatchConfig;
  firstTick: number;
  lastTick: number;
  inputsPerPlayer: number;
  frames: number[];
  createdAt: string;
}

export interface ReplayMetadata {
  gameVersion: number;
  rulesetHash: string;
  seed: number;
  arenaId: string;
  config: MatchConfig;
  inputLog: InputLogSnapshot;
}

export function createReplayClip(metadata: ReplayMetadata, now = new Date('2026-01-01T00:00:00.000Z')): ReplayClip {
  return {
    schemaVersion: 1,
    gameVersion: metadata.gameVersion,
    rulesetHash: metadata.rulesetHash,
    seed: metadata.seed >>> 0,
    arenaId: metadata.arenaId,
    config: { ...metadata.config },
    firstTick: metadata.inputLog.firstTick,
    lastTick: metadata.inputLog.lastTick,
    inputsPerPlayer: metadata.inputLog.inputsPerPlayer,
    frames: Array.from(metadata.inputLog.frames),
    createdAt: now.toISOString(),
  };
}

export function encodeReplayClip(clip: ReplayClip): string {
  return JSON.stringify(clip);
}

export function validateReplayClip(value: unknown): value is ReplayClip {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Partial<ReplayClip>;
  const firstTick = candidate.firstTick;
  const lastTick = candidate.lastTick;
  return candidate.schemaVersion === 1
    && Number.isInteger(candidate.gameVersion)
    && typeof candidate.rulesetHash === 'string' && candidate.rulesetHash.length > 0
    && Number.isInteger(candidate.seed)
    && typeof candidate.arenaId === 'string' && candidate.arenaId.length > 0
    && validateMatchConfig(candidate.config)
    && typeof firstTick === 'number' && Number.isInteger(firstTick)
    && typeof lastTick === 'number' && Number.isInteger(lastTick)
    && lastTick >= firstTick
    && candidate.inputsPerPlayer === 8
    && Array.isArray(candidate.frames)
    && candidate.frames.length <= DEFAULT_INPUT_LOG_TICKS * INPUTS_PER_TICK
    && candidate.frames.length === (lastTick - firstTick + 1) * INPUTS_PER_TICK
    && candidate.frames.every((frame) => Number.isInteger(frame) && frame >= 0 && frame <= 1);
}

export function replayInputAtTick(clip: ReplayClip, tick: number): InputFrame | null {
  if (!validateReplayClip(clip) || !Number.isInteger(tick) || tick < clip.firstTick || tick > clip.lastTick) return null;
  const offset = (tick - clip.firstTick) * INPUTS_PER_TICK;
  return {
    ...readPlayer(clip.frames, offset),
    player2: readPlayer(clip.frames, offset + 8),
    pausePressed: false,
    menuUp: false,
    menuDown: false,
    menuAccept: false,
    menuBack: false,
    pointerX: 0,
    pointerY: 0,
    pointerPressed: false,
    pointerDown: false,
    pointerMoved: false,
  };
}

export function downloadReplayClip(clip: ReplayClip): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([encodeReplayClip(clip)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `blaster-brawl-replay-${clip.seed.toString(16)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function shareReplayClip(clip: ReplayClip): Promise<'shared' | 'downloaded'> {
  const file = typeof File === 'undefined' ? null : new File([encodeReplayClip(clip)], 'blaster-brawl-replay.json', { type: 'application/json' });
  const share = typeof navigator !== 'undefined' ? navigator.share : undefined;
  if (share && file && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    await share({ title: 'Blaster Brawl replay', text: 'Local replay clip — not server verified.', files: [file] });
    return 'shared';
  }
  downloadReplayClip(clip);
  return 'downloaded';
}
