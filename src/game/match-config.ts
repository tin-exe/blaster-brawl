import { CONFIG } from '../config';
import type { DifficultyLevel, MatchConfig, MatchMode } from '../types';

export const DEFAULT_MATCH_CONFIG: MatchConfig = createMatchConfig('versus');

export function createMatchConfig(
  mode: MatchMode = 'versus',
  overrides: Partial<Omit<MatchConfig, 'mode' | 'humanPlayers' | 'botCount'>> & { botCount?: number } = {},
): MatchConfig {
  const modeSpec = CONFIG.match.modes.find((candidate) => candidate.id === mode) ?? CONFIG.match.modes[0];
  const rawBotCount = overrides.botCount ?? modeSpec.defaultBots;
  const botCount = Math.max(modeSpec.minBots, Math.min(modeSpec.maxBots, Math.round(rawBotCount))) as MatchConfig['botCount'];
  const rawStocks = overrides.stocks ?? CONFIG.match.defaultStocks;
  const stocks = Math.max(CONFIG.match.minStocks, Math.min(CONFIG.match.maxStocks, Math.round(rawStocks)));
  const difficulty: DifficultyLevel = overrides.difficulty ?? 'normal';
  return {
    mode: modeSpec.id,
    humanPlayers: modeSpec.humanPlayers,
    botCount,
    difficulty,
    stocks,
    weaponsEnabled: overrides.weaponsEnabled ?? true,
  };
}

export function validateMatchConfig(value: unknown): value is MatchConfig {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const mode = CONFIG.match.modes.find((item) => item.id === candidate.mode);
  if (!mode || candidate.humanPlayers !== mode.humanPlayers) return false;
  if (typeof candidate.botCount !== 'number' || !Number.isInteger(candidate.botCount) || candidate.botCount < mode.minBots || candidate.botCount > mode.maxBots) return false;
  if (typeof candidate.difficulty !== 'string' || !(candidate.difficulty in CONFIG.ai.difficulties)) return false;
  if (typeof candidate.stocks !== 'number' || !Number.isInteger(candidate.stocks) || candidate.stocks < CONFIG.match.minStocks || candidate.stocks > CONFIG.match.maxStocks) return false;
  return typeof candidate.weaponsEnabled === 'boolean';
}

export function cycleMatchMode(current: MatchMode, direction: -1 | 1): MatchMode {
  const modes = CONFIG.match.modes;
  const index = modes.findIndex((mode) => mode.id === current);
  return modes[(index + direction + modes.length) % modes.length]?.id ?? 'versus';
}

export function adjustMatchConfig(config: MatchConfig, field: 'mode' | 'bots' | 'difficulty' | 'stocks' | 'weapons', direction: -1 | 1): MatchConfig {
  if (field === 'mode') {
    const nextMode = cycleMatchMode(config.mode, direction);
    return createMatchConfig(nextMode, { difficulty: config.difficulty, stocks: config.stocks, weaponsEnabled: config.weaponsEnabled });
  }
  if (field === 'bots') return createMatchConfig(config.mode, { ...config, botCount: config.botCount + direction });
  if (field === 'stocks') return createMatchConfig(config.mode, { ...config, stocks: config.stocks + direction });
  if (field === 'weapons') return { ...config, weaponsEnabled: !config.weaponsEnabled };
  const levels = Object.keys(CONFIG.ai.difficulties) as DifficultyLevel[];
  const index = levels.indexOf(config.difficulty);
  return createMatchConfig(config.mode, { ...config, difficulty: levels[(index + direction + levels.length) % levels.length] ?? 'normal' });
}

export function matchModeLabel(mode: MatchMode): string {
  return CONFIG.match.modes.find((item) => item.id === mode)?.label ?? '1V1 VS BOT';
}
