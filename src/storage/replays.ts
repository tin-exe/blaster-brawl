import { validateReplayClip, type ReplayClip } from '../game/replay';

export const REPLAY_STORAGE_KEY = 'blaster-brawl-replays-v1';
const VERSION = 1 as const;
const MAX_REPLAYS = 5;

interface ReplayStore {
  version: typeof VERSION;
  clips: ReplayClip[];
}

function resolveStorage(storage?: Storage): Storage | undefined {
  if (storage) return storage;
  try { return typeof localStorage === 'undefined' ? undefined : localStorage; } catch { return undefined; }
}

function validateStore(value: unknown): ReplayStore | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const candidate = value as Partial<ReplayStore>;
  if (candidate.version !== VERSION || !Array.isArray(candidate.clips) || candidate.clips.length > MAX_REPLAYS) return null;
  if (!candidate.clips.every((clip) => validateReplayClip(clip))) return null;
  return { version: VERSION, clips: candidate.clips.map((clip) => ({ ...clip, frames: [...clip.frames], config: { ...clip.config } })) };
}

export function loadReplayClips(storage?: Storage): ReplayClip[] {
  const target = resolveStorage(storage);
  if (!target) return [];
  try {
    const raw = target.getItem(REPLAY_STORAGE_KEY);
    if (raw === null) return [];
    return validateStore(JSON.parse(raw) as unknown)?.clips ?? [];
  } catch { return []; }
}

export function saveReplayClip(clip: ReplayClip, storage?: Storage): void {
  if (!validateReplayClip(clip)) return;
  const target = resolveStorage(storage);
  if (!target) return;
  const clips = [clip, ...loadReplayClips(target)].slice(0, MAX_REPLAYS);
  try { target.setItem(REPLAY_STORAGE_KEY, JSON.stringify({ version: VERSION, clips } satisfies ReplayStore)); } catch { /* Storage can be disabled. */ }
}
