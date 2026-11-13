export function shouldLowerQuality(
  frameTimesMs: readonly number[],
  targetFps = 50,
  minimumSamples = 30,
): boolean {
  if (frameTimesMs.length < minimumSamples || targetFps <= 0) return false;
  let total = 0;
  for (const frameTime of frameTimesMs) {
    if (!Number.isFinite(frameTime) || frameTime < 0) return true;
    total += frameTime;
  }
  const averageMs = total / frameTimesMs.length;
  return averageMs > 1000 / targetFps;
}
