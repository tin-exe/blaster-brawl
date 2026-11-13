import { describe, expect, it } from 'vitest';
import { shouldShowTouchControls } from './input-source';
import { joystickAxis, TouchInputState } from './touch-input';

describe('touch input', () => {
  it('applies a dead zone and returns clamped horizontal direction', () => {
    expect(joystickAxis(4, 2, 100)).toBe(0);
    expect(joystickAxis(50, 0, 100)).toBeCloseTo(0.39, 2);
    expect(joystickAxis(400, 0, 100)).toBe(1);
    expect(joystickAxis(-400, 0, 100)).toBe(-1);
  });

  it('tracks movement and shooting concurrently by independent pointer id', () => {
    const state = new TouchInputState();
    state.pointerDown(11, 'joystick');
    state.setJoystick(11, -80, 0, 100);
    state.pointerDown(22, 'shoot');
    const movingAndShooting = state.frame();
    expect(movingAndShooting.axis).toBeCloseTo(-0.76, 1);
    expect(movingAndShooting.shoot).toBe(true);
    state.pointerUp(11);
    expect(state.frame()).toMatchObject({ axis: 0, shoot: true });
    state.pointerUp(22);
    expect(state.frame().shoot).toBe(false);
  });

  it('emits jump and switch edges once while keeping held state', () => {
    const state = new TouchInputState();
    state.pointerDown(1, 'jump');
    expect(state.frame()).toMatchObject({ jumpPressed: true, jumpHeld: true });
    expect(state.frame()).toMatchObject({ jumpPressed: false, jumpHeld: true });
    state.pointerDown(2, 'switch');
    expect(state.frame().switchPressed).toBe(true);
    state.pointerUp(1);
    expect(state.frame().jumpHeld).toBe(false);
  });

  it('does not show controls after keyboard/gamepad takes over; options can enable desktop touch mode', () => {
    expect(shouldShowTouchControls(true, false, 'touch')).toBe(true);
    expect(shouldShowTouchControls(true, false, 'keyboard')).toBe(false);
    expect(shouldShowTouchControls(false, false, 'touch')).toBe(false);
    expect(shouldShowTouchControls(false, true, 'touch')).toBe(true);
    expect(shouldShowTouchControls(false, true, 'gamepad')).toBe(false);
  });
});
