import type { InputFrame } from '../types';

export class TickInputSampler {
  private jumpQueued = false;
  private switchQueued = false;
  private player2JumpQueued = false;
  private player2SwitchQueued = false;

  sample(frame: InputFrame): InputFrame {
    this.jumpQueued ||= frame.jumpPressed;
    this.switchQueued ||= frame.switchPressed;
    this.player2JumpQueued ||= frame.player2.jumpPressed;
    this.player2SwitchQueued ||= frame.player2.switchPressed;
    return {
      ...frame,
      jumpPressed: this.jumpQueued,
      switchPressed: this.switchQueued,
      player2: { ...frame.player2, jumpPressed: this.player2JumpQueued, switchPressed: this.player2SwitchQueued },
    };
  }

  consumeTick(): void {
    this.jumpQueued = false;
    this.switchQueued = false;
    this.player2JumpQueued = false;
    this.player2SwitchQueued = false;
  }

  clear(): void { this.consumeTick(); }
}
