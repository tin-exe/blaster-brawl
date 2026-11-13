import { describe, expect, it } from 'vitest';
import { CONFIG } from '../config';
import { defaultSettings, loadSettings, saveSettings, validateSettings } from './settings';

function memoryStorage(initial?: string): Storage {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(CONFIG.settings.storageKey, initial);
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => { values.delete(key); },
    setItem: (key: string, value: string) => { values.set(key, String(value)); },
  };
}

describe('settings schema', () => {
  it('accepts the versioned defaults', () => expect(validateSettings(defaultSettings())).not.toBeNull());
  it('keeps legacy version-one preferences and fills in new mobile defaults', () => {
    const oldSettings = { version: 1, muted: true, shake: 0.4, colorIndex: 2, hatIndex: 1 };
    const loaded = loadSettings(memoryStorage(JSON.stringify(oldSettings)));
    expect(loaded).toMatchObject({ ...oldSettings, touchControlsEnabled: false, touchControlSize: 1, qualityMode: 'auto' });
  });
  it('rejects out-of-range values and wrong versions', () => {
    expect(validateSettings({ ...defaultSettings(), shake: 99 })).toBeNull();
    expect(validateSettings({ ...defaultSettings(), version: 99 })).toBeNull();
  });
  it('resets malformed JSON safely', () => {
    const storage = memoryStorage('{broken');
    expect(loadSettings(storage)).toEqual(defaultSettings());
    expect(storage.getItem(CONFIG.settings.storageKey)).toBe(JSON.stringify(defaultSettings()));
  });
  it('falls back safely when the localStorage getter itself throws', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('Storage blocked'); } });
    try {
      expect(loadSettings()).toEqual(defaultSettings());
      expect(() => saveSettings(defaultSettings())).not.toThrow();
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });
});
