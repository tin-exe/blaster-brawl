import { createServer } from 'vite';

const server = await createServer({
  configFile: new URL('../vite.config.ts', import.meta.url).pathname,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
});

try {
  const [{ MatchScene }, { AudioManager }, { createMatchConfig }, { defaultSettings }, { CONFIG }] = await Promise.all([
    server.ssrLoadModule('/src/scenes/match.ts'),
    server.ssrLoadModule('/src/audio/audio.ts'),
    server.ssrLoadModule('/src/game/match-config.ts'),
    server.ssrLoadModule('/src/storage/settings.ts'),
    server.ssrLoadModule('/src/config.ts'),
  ]);
  const input = {
    left: false, right: false, leftPressed: false, rightPressed: false,
    jumpPressed: false, jumpHeld: false, shoot: false, switchPressed: false,
    player2: { left: false, right: false, leftPressed: false, rightPressed: false, jumpPressed: false, jumpHeld: false, shoot: false, switchPressed: false },
    pausePressed: false, menuUp: false, menuDown: false, menuAccept: false, menuBack: false,
    pointerX: 0, pointerY: 0, pointerPressed: false, pointerDown: false,
  };
  const step = 1 / CONFIG.canvas.targetFps;
  const warmupTicks = 1200;
  const measuredTicks = 6000;
  const runs = [];

  function createRandom(seed) {
    let state = seed >>> 0;
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0x1_0000_0000;
    };
  }

  function measure(seed) {
    const match = new MatchScene(
      defaultSettings(),
      new AudioManager(true),
      createMatchConfig('ffa', { difficulty: 'hard', stocks: 5, weaponsEnabled: true }),
      { botVsBot: true, random: createRandom(seed) },
    );
    for (const fighter of match.fighters) fighter.invulnerable = 1_000_000;
    for (let tick = 0; tick < warmupTicks; tick += 1) match.update(step, input);
    const heapBeforeBytes = process.memoryUsage().heapUsed;
    const start = performance.now();
    for (let tick = 0; tick < measuredTicks; tick += 1) match.update(step, input);
    const elapsedMs = performance.now() - start;
    const heapAfterBytes = process.memoryUsage().heapUsed;
    match.shutdown();
    return {
      elapsedMs: Number(elapsedMs.toFixed(3)),
      millisecondsPerTick: Number((elapsedMs / measuredTicks).toFixed(6)),
      simulatedTicksPerSecond: Math.round(measuredTicks / (elapsedMs / 1000)),
      heapDeltaBytesApprox: heapAfterBytes - heapBeforeBytes,
    };
  }

  for (const seed of [8041, 8042, 8043]) runs.push(measure(seed));
  const sortedTimes = runs.map((run) => run.millisecondsPerTick).sort((a, b) => a - b);
  console.log(JSON.stringify({
    profile: 'Node headless; 4-fighter FFA; Hard bots; weapons on; 5 stocks; invulnerability keeps the stress path active',
    timestepSeconds: step,
    warmupTicks,
    measuredTicksPerRun: measuredTicks,
    runs,
    medianMillisecondsPerTick: sortedTimes[Math.floor(sortedTimes.length / 2)],
    note: 'Host-side simulation proxy only; not a browser frame-time or physical-phone measurement.',
  }, null, 2));
} finally {
  await server.close();
}
