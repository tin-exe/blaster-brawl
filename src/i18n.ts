const messages = {
  'arena.signalStation': 'SIGNAL STATION',
  'hazard.signalPulse': 'PULSE RAIL',
  'hazard.active': 'RAIL LIVE!',
  'powerup.spring': 'SPRING BOOTS',
  'mode.dailyChallenge': 'DAILY CHALLENGE',
  'mode.bestOfThree': 'BEST OF THREE',
  'menu.dailyHint': 'ONE SEEDED LOCAL CHALLENGE PER UTC DAY',
  'daily.hud': 'DAILY · {date}',
  'daily.result': 'LOCAL DAILY RUN · {date}',
  'series.score': 'ROUND {round} / 3  ·  P1 {player1} — CPU {player2}',
  'series.roundWinner': 'ROUND WINNER · {name}',
  'series.champion': 'SERIES CHAMPION · {name}',
  'series.playerOne': 'PLAYER 1',
  'series.cpu': 'CPU',
  'series.nextRound': 'NEXT ROUND',
  'series.newSeries': 'NEW SERIES',
  'series.backToMenu': 'BACK TO MENU',
} as const;

export type TranslationKey = keyof typeof messages;

export function t(key: TranslationKey, values: Readonly<Record<string, string | number>> = {}): string {
  const template: string = messages[key];
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name: string) => {
    const value = values[name];
    return value === undefined ? match : String(value);
  });
}
