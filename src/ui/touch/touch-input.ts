import type { PlayerInput } from '../../types';

export type TouchAction = 'joystick' | 'jump' | 'shoot' | 'switch' | 'pause';

export interface TouchInputFrame {
  axis: number;
  jumpPressed: boolean;
  jumpHeld: boolean;
  shoot: boolean;
  switchPressed: boolean;
  pausePressed: boolean;
}

export function joystickAxis(dx: number, dy: number, radius: number, deadZone = 0.18): number {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(radius) || radius <= 0) return 0;
  const distance = Math.hypot(dx, dy);
  const magnitude = Math.min(1, distance / radius);
  if (magnitude <= Math.max(0, Math.min(deadZone, 0.95))) return 0;
  const normalizedX = dx / Math.max(distance, 0.0001);
  const scaled = (magnitude - deadZone) / (1 - deadZone);
  return Math.max(-1, Math.min(1, normalizedX * scaled));
}

export class TouchInputState {
  private readonly pointers = new Map<number, TouchAction>();
  private readonly currentFrame: TouchInputFrame = {
    axis: 0,
    jumpPressed: false,
    jumpHeld: false,
    shoot: false,
    switchPressed: false,
    pausePressed: false,
  };
  private axis = 0;
  private jumpPressed = false;
  private switchPressed = false;
  private pausePressed = false;

  pointerDown(pointerId: number, action: TouchAction): void {
    if (this.pointers.has(pointerId)) return;
    const wasHeld = action !== 'joystick' && this.isHeld(action);
    this.pointers.set(pointerId, action);
    if (action === 'jump' && !wasHeld) this.jumpPressed = true;
    if (action === 'switch' && !wasHeld) this.switchPressed = true;
    if (action === 'pause' && !wasHeld) this.pausePressed = true;
  }

  setJoystick(pointerId: number, dx: number, dy: number, radius: number, deadZone = 0.18): void {
    if (this.pointers.get(pointerId) !== 'joystick') return;
    this.axis = joystickAxis(dx, dy, radius, deadZone);
  }

  pointerUp(pointerId: number): void {
    const action = this.pointers.get(pointerId);
    if (!action) return;
    this.pointers.delete(pointerId);
    if (action === 'joystick') this.axis = 0;
  }

  clear(): void {
    this.pointers.clear();
    this.axis = 0;
    this.jumpPressed = false;
    this.switchPressed = false;
    this.pausePressed = false;
  }

  getAction(pointerId: number): TouchAction | undefined { return this.pointers.get(pointerId); }
  get activePointerCount(): number { return this.pointers.size; }

  private isHeld(action: Exclude<TouchAction, 'joystick'>): boolean {
    for (const current of this.pointers.values()) if (current === action) return true;
    return false;
  }

  frame(): TouchInputFrame {
    this.currentFrame.axis = this.axis;
    this.currentFrame.jumpPressed = this.jumpPressed;
    this.currentFrame.jumpHeld = this.isHeld('jump');
    this.currentFrame.shoot = this.isHeld('shoot');
    this.currentFrame.switchPressed = this.switchPressed;
    this.currentFrame.pausePressed = this.pausePressed;
    this.jumpPressed = false;
    this.switchPressed = false;
    this.pausePressed = false;
    return this.currentFrame;
  }
}

export function mergeTouchInput<T extends PlayerInput & { pausePressed?: boolean }>(
  input: T,
  touch: TouchInputFrame,
): T {
  input.left ||= touch.axis < -0.08;
  input.right ||= touch.axis > 0.08;
  input.leftPressed ||= touch.axis < -0.08;
  input.rightPressed ||= touch.axis > 0.08;
  input.jumpPressed ||= touch.jumpPressed;
  input.jumpHeld ||= touch.jumpHeld;
  input.shoot ||= touch.shoot;
  input.switchPressed ||= touch.switchPressed;
  if (typeof input.pausePressed === 'boolean') input.pausePressed ||= touch.pausePressed;
  return input;
}
