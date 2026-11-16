import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../dist/', import.meta.url);
const files = await readdir(root, { recursive: true });
const assets = [];
for (const file of files) {
  const path = join(root.pathname, file);
  const info = await stat(path);
  if (info.isFile()) assets.push({ path: file, bytes: info.size });
}
if (assets.length === 0) throw new Error('No built files found in dist/. Run the production build first.');

const jsBytes = assets.filter((asset) => asset.path.endsWith('.js')).reduce((total, asset) => total + asset.bytes, 0);
const cssBytes = assets.filter((asset) => asset.path.endsWith('.css')).reduce((total, asset) => total + asset.bytes, 0);
const totalBytes = assets.reduce((total, asset) => total + asset.bytes, 0);
const budgets = { javascript: 250_000, css: 100_000, total: 350_000 };
console.log(`Bundle bytes: JavaScript ${jsBytes}/${budgets.javascript}; CSS ${cssBytes}/${budgets.css}; dist ${totalBytes}/${budgets.total}.`);
if (jsBytes > budgets.javascript || cssBytes > budgets.css || totalBytes > budgets.total) {
  console.error('Bundle-size budget exceeded. Review the production output before merging.');
  process.exitCode = 1;
}
