import { describe, expect, it } from 'vitest';
import { angleForVector, directionForAngle } from './deterministic-trig';
import { TickInputLog } from './input-log';
import { SeededRandom } from './random';
import { hashState, quantizeStateNumber } from './state-hash';
import type { InputFrame } from '../types';

const frame: InputFrame = {
  left: false, right: true, leftPressed: false, rightPressed: true,
  jumpPressed: true, jumpHeld: true, shoot: true, switchPressed: false,
  player2: { left: true, right: false, leftPressed: true, rightPressed: false, jumpPressed: false, jumpHeld: false, shoot: false, switchPressed: true },
  pausePressed: false, menuUp: false, menuDown: false, menuAccept: false, menuBack: false,
  pointerX: 0, pointerY: 0, pointerPressed: false, pointerDown: false,
};

describe('deterministic simulation primitives', () => {
  it('produces identical seeded PRNG streams without a platform random source', () => {
    const first = new SeededRandom(12345);
    const second = new SeededRandom(12345);
    expect(Array.from({ length: 64 }, () => first.nextUint32())).toEqual(Array.from({ length: 64 }, () => second.nextUint32()));
    expect(new SeededRandom(12345).nextUint32()).not.toBe(new SeededRandom(12346).nextUint32());
  });

  it('round-trips cardinal and diagonal directions through integer CORDIC math', () => {
    const vectors = [[1, 0], [0, 1], [-1, 0], [0, -1], [3, 4], [-4, 3]] as const;
    for (const [x, y] of vectors) {
      const direction = directionForAngle(angleForVector(x, y));
      const magnitude = Math.hypot(x, y);
      expect(direction.x).toBeCloseTo(x / magnitude, 4);
      expect(direction.y).toBeCloseTo(y / magnitude, 4);
    }
  });

  it('bounds the input history and returns frames in tick order', () => {
    const log = new TickInputLog(2);
    log.record(1, frame);
    log.record(2, { ...frame, shoot: false });
    log.record(3, { ...frame, right: false, shoot: false });
    const result = log.snapshot();
    expect(result).toMatchObject({ firstTick: 2, lastTick: 3, inputsPerPlayer: 8, frames: expect.any(Uint8Array) });
    expect([...result.frames.slice(0, 8)]).toEqual([0, 1, 0, 1, 1, 1, 0, 0]);
    expect([...result.frames.slice(16, 24)]).toEqual([0, 0, 0, 1, 1, 1, 0, 0]);
    expect(() => log.record(5, frame)).toThrow(RangeError);
  });

  it('quantizes non-finite state numbers and hashes stable JSON structures', () => {
    expect(quantizeStateNumber(Number.NaN)).toBe(0);
    expect(hashState({ tick: 4, fighters: ['human', 'bot'] })).toBe(hashState({ tick: 4, fighters: ['human', 'bot'] }));
    expect(hashState({ tick: 4 })).not.toBe(hashState({ tick: 5 }));
  });
});
