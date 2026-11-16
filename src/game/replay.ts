import type { MatchConfig } from '../types';
import type { InputLogSnapshot } from '../engine/input-log';

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
    && typeof candidate.config === 'object' && candidate.config !== null
    && typeof firstTick === 'number' && Number.isInteger(firstTick)
    && typeof lastTick === 'number' && Number.isInteger(lastTick)
    && lastTick >= firstTick
    && candidate.inputsPerPlayer === 8
    && Array.isArray(candidate.frames)
    && candidate.frames.every((frame) => Number.isInteger(frame) && frame >= 0 && frame <= 1);
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
