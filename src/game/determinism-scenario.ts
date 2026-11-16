import { AudioManager } from '../audio/audio';
import { CONFIG } from '../config';
import { createMatchConfig } from './match-config';
import { defaultSettings } from '../storage/settings';
import type { InputFrame } from '../types';
import { MatchScene } from '../scenes/match';

const neutralInput: InputFrame = {
  left: false, right: false, leftPressed: false, rightPressed: false,
  jumpPressed: false, jumpHeld: false, shoot: false, switchPressed: false,
  player2: { left: false, right: false, leftPressed: false, rightPressed: false, jumpPressed: false, jumpHeld: false, shoot: false, switchPressed: false },
  pausePressed: false, menuUp: false, menuDown: false, menuAccept: false, menuBack: false,
  pointerX: 0, pointerY: 0, pointerPressed: false, pointerDown: false,
};
const fixedStep = 1 / CONFIG.canvas.targetFps;

export interface DeterminismScenarioOptions {
  presentationVariant?: boolean;
  ticks?: number;
}

export function runSeededCheckpointScenario(seed: number, options: DeterminismScenarioOptions = {}): { hashes: string[]; match: MatchScene } {
  const config = createMatchConfig('ffa', { difficulty: 'hard', stocks: 5, weaponsEnabled: true });
  const match = new MatchScene(defaultSettings(), new AudioManager(true), config, { seed });
  for (const fighter of match.fighters) fighter.invulnerable = 1_000;
  if (options.presentationVariant) {
    match.setParticleQuality(0.25);
    match.setParticleLimit(12);
  }
  const hashes: string[] = [];
  const tickCount = options.ticks ?? 720;
  for (let tick = 0; tick < tickCount; tick += 1) {
    if (options.presentationVariant) {
      match.hitstopRemaining = 0.2;
      match.renderAlpha = ((tick * 37) % 101) / 100;
    }
    const input: InputFrame = {
      ...neutralInput,
      left: tick % 160 >= 80,
      right: tick % 160 < 80,
      leftPressed: tick % 160 === 80,
      rightPressed: tick % 160 === 0,
      jumpPressed: tick % 96 === 0,
      jumpHeld: tick % 96 < 8,
      shoot: tick % 32 < 9,
      switchPressed: tick % 180 === 0,
    };
    match.update(fixedStep, input);
    if ((tick + 1) % 120 === 0) hashes.push(match.stateHash());
  }
  return { hashes, match };
}
