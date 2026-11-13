import { describe, expect, it } from 'vitest';
import { getBotAction, getBotAimError } from './bot';
import { calculateKnockback } from './knockback';

const botBase = { selfY: 0, targetY: 0, selfGrounded: true, selfFacing: 1, selfCanJump: true, distanceToEdge: 180, edgeLookAhead: 62, shootRange: 620, preferredDistance: 250, closeDistance: 130, jumpTargetHeight: 74, aggression: 0.88 };

describe('calculateKnockback', () => {
  it('pushes the target horizontally away and upward without health subtraction', () => {
    const result = calculateKnockback({ baseKnockback: 350, damage: 1, direction: -1 });
    expect(result.x).toBeLessThan(0);
    expect(result.y).toBeLessThan(0);
  });

  it('scales with damage and blast power', () => {
    const light = calculateKnockback({ baseKnockback: 350, damage: 0.4, direction: 1 });
    const heavy = calculateKnockback({ baseKnockback: 790, damage: 1.55, direction: 1, scale: 1.5 });
    expect(heavy.x).toBeGreaterThan(light.x);
    expect(heavy.y).toBeLessThan(light.y);
  });

  it('enforces a minimum impulse for low-powered hits', () => {
    const result = calculateKnockback({ baseKnockback: 1, damage: 0, direction: 1, scale: 0.1 });
    expect(Math.abs(result.x)).toBe(240);
  });
});

describe('bot helpers', () => {
  it('holds a useful distance while firing at a nearby target to either side', () => {
    const right = getBotAction({ ...botBase, selfX: 0, targetX: 220 });
    const left = getBotAction({ ...botBase, selfX: 220, targetX: 0 });
    expect(right.move).toBe(0);
    expect(right.shoot).toBe(true);
    expect(left.shoot).toBe(true);
    expect(Math.abs(left.aimAngle)).toBeGreaterThan(2.8);
  });

  it('avoids walking toward a nearby ledge and asks to jump clear', () => {
    const action = getBotAction({ ...botBase, selfX: 0, targetX: 400, distanceToEdge: 24 });
    expect(action.move).toBe(1);
    expect(action.jump).toBe(true);
  });

  it('continues moving toward its target while airborne over a gap', () => {
    const action = getBotAction({ ...botBase, selfX: 0, targetX: 400, selfGrounded: false, distanceToEdge: 0 });
    expect(action.move).toBe(1);
    expect(action.jump).toBe(false);
  });

  it('varies aim deterministically based on the provided random sample', () => {
    expect(getBotAimError(0, 0.08, 0.5)).toBeLessThan(0);
    expect(getBotAimError(1, 0.08, 0.5)).toBeGreaterThan(0);
  });
});
