import { CONFIG } from '../config';
import type { HatStyle } from '../types';

export interface GameSettings {
  version: number;
  muted: boolean;
  shake: number;
  colorIndex: number;
  hatIndex: number;
  touchControlsEnabled: boolean;
  touchControlSize: number;
  touchOpacity: number;
  leftHanded: boolean;
  haptics: boolean;
  qualityMode: 'auto' | 'low' | 'high';
}

const hats: readonly HatStyle[] = CONFIG.fighters.hatStyles;
const colorCount = CONFIG.fighters.colorways.length;

export function defaultSettings(): GameSettings {
  return { version: CONFIG.settings.version, ...CONFIG.settings.defaults };
}

function resolveStorage(storage?: Storage): Storage | undefined {
  if (storage) return storage;
  try { return typeof localStorage === 'undefined' ? undefined : localStorage; } catch { return undefined; }
}

export function validateSettings(value: unknown): GameSettings | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.version !== CONFIG.settings.version || typeof candidate.muted !== 'boolean') return null;
  if (typeof candidate.shake !== 'number' || !Number.isFinite(candidate.shake)) return null;
  if (typeof candidate.colorIndex !== 'number' || !Number.isInteger(candidate.colorIndex)) return null;
  if (typeof candidate.hatIndex !== 'number' || !Number.isInteger(candidate.hatIndex)) return null;
  const defaults = CONFIG.settings.defaults;
  const touchControlsEnabled = candidate.touchControlsEnabled ?? defaults.touchControlsEnabled;
  const touchControlSize = candidate.touchControlSize ?? defaults.touchControlSize;
  const touchOpacity = candidate.touchOpacity ?? defaults.touchOpacity;
  const leftHanded = candidate.leftHanded ?? defaults.leftHanded;
  const haptics = candidate.haptics ?? defaults.haptics;
  const qualityMode = candidate.qualityMode ?? defaults.qualityMode;
  if (typeof touchControlsEnabled !== 'boolean' || typeof leftHanded !== 'boolean' || typeof haptics !== 'boolean') return null;
  if (typeof touchControlSize !== 'number' || ![0.8, 1, 1.2].includes(touchControlSize)) return null;
  if (typeof touchOpacity !== 'number' || ![0.42, 0.62, 0.82].includes(touchOpacity)) return null;
  if (qualityMode !== 'auto' && qualityMode !== 'low' && qualityMode !== 'high') return null;
  if (candidate.shake < CONFIG.settings.minShake || candidate.shake > CONFIG.settings.maxShake) return null;
  if (candidate.colorIndex < 0 || candidate.colorIndex >= colorCount) return null;
  if (candidate.hatIndex < 0 || candidate.hatIndex >= hats.length) return null;
  return {
    version: CONFIG.settings.version,
    muted: candidate.muted,
    shake: candidate.shake,
    colorIndex: candidate.colorIndex,
    hatIndex: candidate.hatIndex,
    touchControlsEnabled,
    touchControlSize,
    touchOpacity,
    leftHanded,
    haptics,
    qualityMode,
  };
}

export function loadSettings(storage?: Storage): GameSettings {
  const target = resolveStorage(storage);
  if (!target) return defaultSettings();
  try {
    const raw = target.getItem(CONFIG.settings.storageKey);
    if (raw === null) {
      const initial = defaultSettings();
      target.setItem(CONFIG.settings.storageKey, JSON.stringify(initial));
      return initial;
    }
    const validated = validateSettings(JSON.parse(raw) as unknown);
    if (validated) return validated;
  } catch {
    // Malformed/unavailable storage is treated as untrusted and safely ignored.
  }
  const reset = defaultSettings();
  try { target.setItem(CONFIG.settings.storageKey, JSON.stringify(reset)); } catch { /* Storage can be disabled. */ }
  return reset;
}

export function saveSettings(settings: GameSettings, storage?: Storage): void {
  const target = resolveStorage(storage);
  if (!target) return;
  const safe = validateSettings(settings);
  if (!safe) return;
  try { target.setItem(CONFIG.settings.storageKey, JSON.stringify(safe)); } catch { /* Private browsing may block writes. */ }
}
