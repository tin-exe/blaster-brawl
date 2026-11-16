export const DEFAULT_MATCH_SEED = 0x0b1a57e;

export class SeededRandom {
  private currentState: number;

  constructor(seed: number) {
    this.currentState = seed >>> 0 || 0x6d2b79f5;
  }

  get state(): number { return this.currentState >>> 0; }

  nextUint32(): number {
    let value = this.currentState = (this.currentState + 0x6d2b79f5) >>> 0;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return (value ^ (value >>> 14)) >>> 0;
  }

  next(): number { return this.nextUint32() / 0x1_0000_0000; }
}
