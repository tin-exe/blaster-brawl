import { createServer } from 'vite';
import { chromium, firefox, webkit } from 'playwright';

const seed = 0x51a7;
const server = await createServer({
  configFile: new URL('../vite.config.ts', import.meta.url).pathname,
  server: { host: '127.0.0.1', port: 4174, strictPort: true },
  logLevel: 'silent',
});

try {
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('Could not determine the Vite test-server address.');
  const origin = `http://127.0.0.1:${address.port}`;
  const { runSeededCheckpointScenario } = await server.ssrLoadModule('/src/game/determinism-scenario.ts');
  const nodeHashes = runSeededCheckpointScenario(seed).hashes;
  const results = { node: nodeHashes };

  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      await page.goto(`${origin}/tests/browser/determinism.html`, { waitUntil: 'load' });
      await page.waitForFunction(() => Array.isArray(window.__determinismHashes), undefined, { timeout: 20_000 });
      const browserHashes = await page.evaluate(() => window.__determinismHashes ?? []);
      if (pageErrors.length) throw new Error(`${name} page error(s): ${pageErrors.join('; ')}`);
      if (JSON.stringify(browserHashes) !== JSON.stringify(nodeHashes)) {
        throw new Error(`${name} checkpoint mismatch. Node: ${JSON.stringify(nodeHashes)}; browser: ${JSON.stringify(browserHashes)}`);
      }
      results[name] = browserHashes;
    } finally {
      await browser.close();
    }
  }

  console.log(JSON.stringify({ seed, checkpointIntervalTicks: 120, checkpoints: nodeHashes.length, results }, null, 2));
} finally {
  await server.close();
}
