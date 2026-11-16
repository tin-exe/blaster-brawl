import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
  /\bsk_live_[A-Za-z0-9]{16,}\b/,
  /\bAIza[0-9A-Za-z_-]{30,}\b/,
  /\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|private[_-]?key|password)\s*[:=]\s*["'][A-Za-z0-9_./+=-]{24,}["']/i,
];
const findings = [];

for (const file of files) {
  if (file === 'pnpm-lock.yaml') continue;
  const text = readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    if (patterns.some((pattern) => pattern.test(lines[index] ?? ''))) findings.push(`${file}:${index + 1}`);
  }
}

if (findings.length) {
  console.error(`Possible committed credential pattern(s) found at:\n${findings.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Secret-pattern scan passed (${files.length} repository files checked; lockfile excluded).`);
}
