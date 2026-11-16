import { describe, expect, it } from 'vitest';
import type { InputFrame } from '../types';
import { TickInputSampler } from './tick-input';

const neutralInput: InputFrame = {
  left: false, right: false, leftPressed: false, rightPressed: false,
  jumpPressed: false, jumpHeld: false, shoot: false, switchPressed: false,
  player2: { left: false, right: false, leftPressed: false, rightPressed: false, jumpPressed: false, jumpHeld: false, shoot: false, switchPressed: false },
  pausePressed: false, menuUp: false, menuDown: false, menuAccept: false, menuBack: false,
  pointerX: 0, pointerY: 0, pointerPressed: false, pointerDown: false,
};

describe('tick-boundary input sampling', () => {
  it('keeps one-shot inputs pressed across render frames until a tick consumes them', () => {
    const sampler = new TickInputSampler();
    const pressed = sampler.sample({ ...neutralInput, jumpPressed: true, switchPressed: true });
    expect(pressed.jumpPressed).toBe(true);
    expect(pressed.switchPressed).toBe(true);

    const nextRenderFrame = sampler.sample(neutralInput);
    expect(nextRenderFrame.jumpPressed).toBe(true);
    expect(nextRenderFrame.switchPressed).toBe(true);

    sampler.consumeTick();
    const followingTick = sampler.sample(neutralInput);
    expect(followingTick.jumpPressed).toBe(false);
    expect(followingTick.switchPressed).toBe(false);
  });

  it('retains and consumes Player 2 action edges independently', () => {
    const sampler = new TickInputSampler();
    const player2Pressed = sampler.sample({
      ...neutralInput,
      player2: { ...neutralInput.player2, jumpPressed: true, switchPressed: true },
    });
    expect(player2Pressed.player2.jumpPressed).toBe(true);
    expect(player2Pressed.player2.switchPressed).toBe(true);
    expect(sampler.sample(neutralInput).player2.jumpPressed).toBe(true);
    sampler.consumeTick();
    expect(sampler.sample(neutralInput).player2.jumpPressed).toBe(false);
  });
});
