import { CONFIG } from '../config';

export interface KnockbackInput {
  baseKnockback: number;
  damage: number;
  direction: number;
  verticalBias?: number;
  scale?: number;
}

export interface KnockbackResult { x: number; y: number }

export function calculateKnockback(input: KnockbackInput): KnockbackResult {
  const direction = input.direction < 0 ? -1 : 1;
  const magnitude = Math.max(
    CONFIG.combat.knockbackMinimum,
    input.baseKnockback * (1 + input.damage * CONFIG.combat.knockbackDamageScale) * (input.scale ?? 1),
  );
  const vertical = input.verticalBias ?? -0.34;
  return { x: direction * magnitude, y: -magnitude * Math.max(0.12, Math.abs(vertical)) };
}
