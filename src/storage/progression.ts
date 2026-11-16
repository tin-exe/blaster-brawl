export const PROGRESSION_STORAGE_KEY = 'blaster-brawl-progression-v1';
const VERSION = 1 as const;

export interface LocalProgression {
  version: typeof VERSION;
  tutorialComplete: boolean;
  wins: number;
  unlockedSkins: string[];
  unlockedTrails: string[];
  unlockedTitles: string[];
}

const DEFAULT_PROGRESSION: LocalProgression = {
  version: VERSION,
  tutorialComplete: false,
  wins: 0,
  unlockedSkins: ['default'],
  unlockedTrails: ['spark'],
  unlockedTitles: ['rookie'],
};

function resolveStorage(storage?: Storage): Storage | undefined {
  if (storage) return storage;
  try { return typeof localStorage === 'undefined' ? undefined : localStorage; } catch { return undefined; }
}

function stringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 32 && value.every((item) => typeof item === 'string' && item.length > 0 && item.length <= 40);
}

export function defaultProgression(): LocalProgression {
  return { ...DEFAULT_PROGRESSION, unlockedSkins: [...DEFAULT_PROGRESSION.unlockedSkins], unlockedTrails: [...DEFAULT_PROGRESSION.unlockedTrails], unlockedTitles: [...DEFAULT_PROGRESSION.unlockedTitles] };
}

export function validateProgression(value: unknown): LocalProgression | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const candidate = value as Partial<LocalProgression>;
  if (candidate.version !== VERSION || typeof candidate.tutorialComplete !== 'boolean' || typeof candidate.wins !== 'number' || !Number.isInteger(candidate.wins) || candidate.wins < 0 || candidate.wins > 100000) return null;
  if (!stringList(candidate.unlockedSkins) || !stringList(candidate.unlockedTrails) || !stringList(candidate.unlockedTitles)) return null;
  return {
    version: VERSION,
    tutorialComplete: candidate.tutorialComplete,
    wins: candidate.wins,
    unlockedSkins: [...candidate.unlockedSkins],
    unlockedTrails: [...candidate.unlockedTrails],
    unlockedTitles: [...candidate.unlockedTitles],
  };
}

export function loadProgression(storage?: Storage): LocalProgression {
  const target = resolveStorage(storage);
  if (!target) return defaultProgression();
  try {
    const raw = target.getItem(PROGRESSION_STORAGE_KEY);
    if (raw !== null) {
      const parsed = validateProgression(JSON.parse(raw) as unknown);
      if (parsed) return parsed;
    }
  } catch { /* Storage is untrusted or unavailable. */ }
  const reset = defaultProgression();
  try { target.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(reset)); } catch { /* Private browsing may block writes. */ }
  return reset;
}

export function saveProgression(value: LocalProgression, storage?: Storage): void {
  const target = resolveStorage(storage);
  const safe = validateProgression(value);
  if (!target || !safe) return;
  try { target.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(safe)); } catch { /* Storage can be disabled. */ }
}

export function completeTutorial(value: LocalProgression): LocalProgression {
  return { ...value, tutorialComplete: true };
}

export function recordLocalWin(value: LocalProgression): LocalProgression {
  const wins = Math.min(100000, value.wins + 1);
  const skins = wins >= 3 ? [...new Set([...value.unlockedSkins, 'neon'])] : value.unlockedSkins;
  const trails = wins >= 5 ? [...new Set([...value.unlockedTrails, 'comet'])] : value.unlockedTrails;
  const titles = wins >= 10 ? [...new Set([...value.unlockedTitles, 'ring-out artist'])] : value.unlockedTitles;
  return { ...value, wins, unlockedSkins: skins, unlockedTrails: trails, unlockedTitles: titles };
}
