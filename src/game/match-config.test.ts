import { describe, expect, it } from 'vitest';
import { adjustMatchConfig, createMatchConfig, validateMatchConfig } from './match-config';

describe('MatchConfig', () => {
  it('provides the reusable match and survival mode presets', () => {
    expect(createMatchConfig('versus')).toMatchObject({ mode: 'versus', humanPlayers: 1, botCount: 1 });
    expect(createMatchConfig('ffa')).toMatchObject({ mode: 'ffa', humanPlayers: 1, botCount: 3 });
    expect(createMatchConfig('local')).toMatchObject({ mode: 'local', humanPlayers: 2, botCount: 0 });
    expect(createMatchConfig('duoBots')).toMatchObject({ mode: 'duoBots', humanPlayers: 2, botCount: 2 });
    expect(createMatchConfig('survival')).toMatchObject({ mode: 'survival', humanPlayers: 1, botCount: 3 });
  });

  it('keeps the daily challenge fixed regardless of custom-game overrides', () => {
    const daily = createMatchConfig('daily', { difficulty: 'easy', stocks: 1, weaponsEnabled: false, botCount: 1 });
    expect(daily).toMatchObject({ mode: 'daily', humanPlayers: 1, botCount: 3, difficulty: 'hard', stocks: 3, weaponsEnabled: true });
    expect(adjustMatchConfig(daily, 'stocks', -1)).toEqual(daily);
  });

  it('clamps stocks and bot count to the selected mode limits', () => {
    expect(createMatchConfig('ffa', { stocks: 9, botCount: 8 })).toMatchObject({ stocks: 5, botCount: 3 });
    expect(createMatchConfig('local', { botCount: 2 })).toMatchObject({ botCount: 0, humanPlayers: 2 });
  });

  it('accepts valid configurations and rejects inconsistent or unsafe values', () => {
    expect(validateMatchConfig(createMatchConfig('duoBots', { stocks: 4, weaponsEnabled: false }))).toBe(true);
    expect(validateMatchConfig({ ...createMatchConfig('ffa'), humanPlayers: 2 })).toBe(false);
    expect(validateMatchConfig({ ...createMatchConfig('versus'), stocks: 0 })).toBe(false);
    expect(validateMatchConfig({ ...createMatchConfig('local'), botCount: 1 })).toBe(false);
  });

  it('adjusts difficulty, stocks and weapons while preserving the mode', () => {
    const mode = createMatchConfig('ffa');
    expect(adjustMatchConfig(mode, 'difficulty', 1).difficulty).toBe('hard');
    expect(adjustMatchConfig(mode, 'stocks', 1).stocks).toBe(4);
    expect(adjustMatchConfig(mode, 'weapons', -1).weaponsEnabled).toBe(false);
    expect(adjustMatchConfig(mode, 'bots', -1).botCount).toBe(2);
  });
});
