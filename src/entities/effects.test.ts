import { describe, expect, it } from 'vitest';
import { EffectSystem } from './effects';

describe('pooled particle limits', () => {
  it('does not exceed the configured active-particle cap', () => {
    const effects = new EffectSystem(() => 0.5);
    effects.setParticleLimit(3);
    effects.burst(100, 100, '#fff', 20, 100, 1);
    expect(effects.pool.items.filter((particle) => particle.active)).toHaveLength(3);
  });
});
