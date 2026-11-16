export interface Vec2 { x: number; y: number }
export interface Rect { x: number; y: number; width: number; height: number }

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function approach(value: number, target: number, amount: number): number {
  if (value < target) return Math.min(target, value + amount);
  return Math.max(target, value - amount);
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function normalize(x: number, y: number): Vec2 {
  const length = deterministicSqrt(squaredDistance(0, 0, x, y)) || 1;
  return { x: x / length, y: y / length };
}

export function squaredDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

export function deterministicSqrt(value: number): number {
  if (Number.isNaN(value) || value < 0) return Number.NaN;
  if (value === 0 || value === Number.POSITIVE_INFINITY) return value;
  let scaled = value;
  let scale = 1;
  while (scaled >= 4) { scaled *= 0.25; scale *= 2; }
  while (scaled < 1) { scaled *= 4; scale *= 0.5; }
  let low = 0;
  let high = 2;
  for (let iteration = 0; iteration < 64; iteration += 1) {
    const midpoint = low + (high - low) * 0.5;
    if (midpoint * midpoint > scaled) high = midpoint;
    else low = midpoint;
  }
  return (low + (high - low) * 0.5) * scale;
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return deterministicSqrt(squaredDistance(x1, y1, x2, y2));
}
