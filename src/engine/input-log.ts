import type { InputFrame, PlayerInput } from '../types';

const INPUTS_PER_PLAYER = 8;
const INPUTS_PER_TICK = INPUTS_PER_PLAYER * 2;
export const DEFAULT_INPUT_LOG_TICKS = 60 * 180;

export interface InputLogSnapshot {
  firstTick: number;
  lastTick: number;
  inputsPerPlayer: number;
  frames: Uint8Array;
}

function writePlayer(target: Uint8Array, offset: number, input: PlayerInput): void {
  target[offset] = Number(input.left);
  target[offset + 1] = Number(input.right);
  target[offset + 2] = Number(input.leftPressed);
  target[offset + 3] = Number(input.rightPressed);
  target[offset + 4] = Number(input.jumpPressed);
  target[offset + 5] = Number(input.jumpHeld);
  target[offset + 6] = Number(input.shoot);
  target[offset + 7] = Number(input.switchPressed);
}

export class TickInputLog {
  private readonly bytes: Uint8Array;
  private firstTickValue = 1;
  private lastTickValue = 0;
  private lengthValue = 0;

  constructor(readonly capacity = DEFAULT_INPUT_LOG_TICKS) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError('Input-log capacity must be a positive integer.');
    this.bytes = new Uint8Array(capacity * INPUTS_PER_TICK);
  }

  get firstTick(): number { return this.firstTickValue; }
  get lastTick(): number { return this.lastTickValue; }
  get length(): number { return this.lengthValue; }

  record(tick: number, input: InputFrame): void {
    if (!Number.isInteger(tick) || tick !== this.lastTickValue + 1) throw new RangeError('Input ticks must be recorded sequentially from tick 1.');
    const slotOffset = ((tick - 1) % this.capacity) * INPUTS_PER_TICK;
    writePlayer(this.bytes, slotOffset, input);
    writePlayer(this.bytes, slotOffset + INPUTS_PER_PLAYER, input.player2);
    this.lastTickValue = tick;
    this.lengthValue = Math.min(this.capacity, this.lengthValue + 1);
    this.firstTickValue = this.lastTickValue - this.lengthValue + 1;
  }

  snapshot(): InputLogSnapshot {
    const frames = new Uint8Array(this.lengthValue * INPUTS_PER_TICK);
    for (let index = 0; index < this.lengthValue; index += 1) {
      const tick = this.firstTickValue + index;
      const sourceOffset = ((tick - 1) % this.capacity) * INPUTS_PER_TICK;
      frames.set(this.bytes.subarray(sourceOffset, sourceOffset + INPUTS_PER_TICK), index * INPUTS_PER_TICK);
    }
    return {
      firstTick: this.firstTickValue,
      lastTick: this.lastTickValue,
      inputsPerPlayer: INPUTS_PER_PLAYER,
      frames,
    };
  }
}
