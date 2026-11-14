import { describe, expect, it, vi } from 'vitest';
import { AudioManager } from '../audio/audio';
import { CONFIG, SCENE_EVENTS } from '../config';
import { createMatchConfig } from '../game/match-config';
import { defaultSettings } from '../storage/settings';
import type { InputFrame, MatchConfig } from '../types';
import { getDifficultyProfile } from '../ai/difficulty';
import { MatchScene } from './match';

const neutralInput: InputFrame = {
  left: false, right: false, leftPressed: false, rightPressed: false,
  jumpPressed: false, jumpHeld: false, shoot: false, switchPressed: false,
  player2: { left: false, right: false, leftPressed: false, rightPressed: false, jumpPressed: false, jumpHeld: false, shoot: false, switchPressed: false },
  pausePressed: false, menuUp: false, menuDown: false, menuAccept: false, menuBack: false,
  pointerX: 0, pointerY: 0, pointerPressed: false, pointerDown: false,
};
const step = 1 / CONFIG.canvas.targetFps;

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function makeMatch(config: MatchConfig = createMatchConfig('versus')): MatchScene {
  return new MatchScene(defaultSettings(), new AudioManager(true), config);
}

describe('match roster and round lifecycle', () => {
  it('lets the default bot approach across platform gaps instead of stalling', () => {
    const match = makeMatch();
    const startX = match.bot.x;
    for (let frame = 0; frame < CONFIG.canvas.targetFps * 2.5; frame += 1) match.update(step, neutralInput);
    expect(match.bot.x).toBeLessThan(startX - 170);
  });

  it('constructs the requested roster size for each match mode', () => {
    expect(makeMatch(createMatchConfig('versus')).fighters).toHaveLength(2);
    expect(makeMatch(createMatchConfig('ffa')).fighters).toHaveLength(4);
    const local = makeMatch(createMatchConfig('local'));
    expect(local.fighters.map((fighter) => fighter.playerSlot)).toEqual([1, 2]);
    expect(makeMatch(createMatchConfig('duoBots')).fighters).toHaveLength(4);
  });

  it('routes Player 2 movement without moving Player 1 in a local game', () => {
    const match = makeMatch(createMatchConfig('local'));
    const player1Start = match.human.x;
    const player2 = match.fighters.find((fighter) => fighter.playerSlot === 2)!;
    const player2Start = player2.x;
    const input: InputFrame = { ...neutralInput, player2: { ...neutralInput.player2, right: true } };
    for (let frame = 0; frame < CONFIG.canvas.targetFps; frame += 1) match.update(step, input);
    expect(match.human.x).toBeCloseTo(player1Start, 4);
    expect(player2.x).toBeGreaterThan(player2Start + 60);
  });

  it('disables weapon pickups in a weapons-off match', () => {
    const match = makeMatch(createMatchConfig('ffa', { weaponsEnabled: false }));
    expect(match.pickups.items.every((pickup) => !pickup.active)).toBe(true);
    expect(match.config.weaponsEnabled).toBe(false);
  });

  it('removes one stock and respawns with invulnerability after a ring-out', () => {
    const match = makeMatch();
    match.human.invulnerable = 10;
    match.bot.y = CONFIG.world.killY + 1;
    match.update(step, neutralInput);
    expect(match.bot.stocks).toBe(CONFIG.fighters.stocks - 1);
    expect(match.bot.dead).toBe(true);
    const respawnFrames = Math.ceil(CONFIG.fighters.respawnSeconds * CONFIG.canvas.targetFps) + 2;
    for (let frame = 0; frame < respawnFrames; frame += 1) match.update(step, neutralInput);
    expect(match.bot.dead).toBe(false);
    expect(match.bot.stocks).toBe(CONFIG.fighters.stocks - 1);
    expect(match.bot.invulnerable).toBeGreaterThan(0);
    expect(match.finished).toBe(false);
  });

  it('ends the round when the last stock is lost', () => {
    const match = makeMatch();
    let eventWinner = '';
    match.events.once(SCENE_EVENTS.GAME_OVER, (winner) => { eventWinner = winner ?? ''; });
    match.human.invulnerable = 10;
    match.bot.stocks = 1;
    match.bot.y = CONFIG.world.killY + 1;
    match.update(step, neutralInput);
    expect(match.bot.stocks).toBe(0);
    expect(match.finished).toBe(true);
    expect(match.winner).toBe('human');
    expect(eventWinner).toBe('human');
  });

  it('cleans up scene listeners on shutdown', () => {
    const match = makeMatch();
    const onGameOver = vi.fn();
    match.events.on(SCENE_EVENTS.GAME_OVER, onGameOver);

    match.shutdown();
    match.events.emit(SCENE_EVENTS.GAME_OVER, 'human');

    expect(onGameOver).not.toHaveBeenCalled();
    expect(match.update(step, neutralInput)).toBeNull();
  });

  it('records free-for-all elimination order and names the last fighter standing', () => {
    const match = makeMatch(createMatchConfig('ffa', { stocks: 1 }));
    match.human.invulnerable = 10;
    const bots = match.fighters.filter((fighter) => fighter.controller === 'bot');
    for (const bot of bots) { bot.stocks = 1; bot.y = CONFIG.world.killY + 1; }
    match.update(step, neutralInput);
    expect(match.finished).toBe(true);
    expect(match.winner).toBe('human');
    expect(match.eliminationOrder).toEqual(bots.map((bot) => bot.id));
  });
});

describe('headless bot-vs-bot simulations', () => {
  it('finishes a four-fighter free-for-all on each difficulty without any bot remaining stuck', () => {
    const levels = ['easy', 'normal', 'hard'] as const;
    for (let levelIndex = 0; levelIndex < levels.length; levelIndex += 1) {
      const difficulty = levels[levelIndex]!;
      const config = createMatchConfig('ffa', { difficulty, stocks: 1 });
      const match = new MatchScene(defaultSettings(), new AudioManager(true), config, { botVsBot: true, random: seededRandom(7100 + levelIndex) });
      const frameLimit = CONFIG.canvas.targetFps * 120;
      let frame = 0;
      for (; frame < frameLimit && !match.finished; frame += 1) {
        match.update(step, neutralInput);
        if (frame % CONFIG.canvas.targetFps === 0) {
          const stuckLimit = getDifficultyProfile(difficulty).stuckTimeout + 2;
          for (const fighter of match.fighters.filter((candidate) => candidate.controller === 'bot' && candidate.stocks > 0)) {
            expect(match.getBotStuckSeconds(fighter.id), `${difficulty}: ${fighter.displayName} stalled at frame ${frame}`).toBeLessThan(stuckLimit);
          }
        }
      }
      expect(match.finished, `${difficulty} did not finish within 120 seconds`).toBe(true);
      expect(match.winner).not.toBeNull();
      expect(match.fighters.every((fighter) => Number.isFinite(fighter.x) && Number.isFinite(fighter.y))).toBe(true);
    }
  }, 30_000);
});
