# Performance baseline (pre-optimization)

**Recorded:** 2026-11-16. **Source:** `main` at `78765ac` (`Improve Phase 1 combat feedback and touch controls`). **Purpose:** repeatable host-side baseline before simulation/performance changes; not a release or device-performance claim.

## Build and bundle

Command: `corepack pnpm build` (Vite production build, source maps disabled).

| Output | Raw bytes | Gzip |
| --- | ---: | ---: |
| Main JavaScript asset | 85,511 | 27,600 |
| CSS | 6,827 | 2,180 |
| Entire `dist/` tree | 140,498 | — |

Viewport assumptions in the source are a 960×540 logical canvas, responsive CSS scaling, and device-pixel-ratio capped at 2. A match has a maximum of four fighters, 76 pooled projectiles, 340 pooled particles and 5 pooled pickups.

## Repeatable simulation proxy

Run `corepack pnpm perf:baseline`. The script warms the engine for 1,200 fixed ticks, then times three 6,000-tick runs of the largest current match (four-fighter FFA, Hard bots, weapons enabled, 5 stocks). All fighters are temporarily invulnerable so the stress path continues instead of ending early. It reports update throughput and approximate heap delta; heap deltas are noisy and are not an allocation profile.

Repeatable-script baseline on Node v22.23.4, Linux x86_64, Intel Xeon Processor @ 2.50 GHz:

| Run | 6,000 ticks | ms/tick | Simulated ticks/s | Approx. heap delta |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 113.936 ms | 0.018989 | 52,661 | +1.7 MiB |
| 2 | 78.257 ms | 0.013043 | 76,670 | −4.2 MiB |
| 3 | 80.974 ms | 0.013496 | 74,098 | −1.1 MiB |

The first run includes additional JIT/warm-up noise; compare repeated runs and medians on the same host rather than interpreting this as a phone FPS figure. The median measured cost was 0.013496 ms per simulated tick (about 74,098 ticks/s), but this is not equivalent to rendering frames.

## Verification limits

Dependencies installed from the pinned lockfile. Baseline suite: 53/53 tests passed. Strict TypeScript/production build passed. `pnpm audit --audit-level=moderate` reported no known vulnerabilities. A tracked-source credential-pattern scan found no matches; no dedicated secret scanner was installed.

No low-end physical phone, browser CPU-throttled frame profile, long-session memory profile, browser allocation trace, or Firefox/WebKit test was available in this baseline. The existing `QA_CHECKLIST.md` records mobile and deployed-header follow-ups. Capture these on representative devices before setting a user-facing FPS guarantee. Browser-facing output must not be inferred from the Node throughput results.


## Post-refactor comparison

To reduce host/JIT noise and keep the workload identical, the same `scripts/performance-baseline.mjs` was run once against a clean detached worktree of the pre-refactor source commit `78765ac` and once against the refactor, using Node v22.23.4 on the same Linux x86_64 / Intel Xeon @ 2.50 GHz host. Each run warmed 1,200 ticks and timed three independent 6,000-tick matches:

| Source | Run times (ms per 6,000 ticks) | Median ms/tick | Approx. ticks/s |
| --- | --- | ---: | ---: |
| Pre-refactor commit `78765ac` | 10.829 / 8.321 / 16.385 | 0.001805 | 554,017 |
| Refactored working tree | 7.577 / 5.718 / 14.630 | 0.001263 | 791,766 |

On this synthetic host workload, the measured median tick cost is 30.03% lower (1.429× throughput). Run-to-run timing and heap deltas remain noisy; this is not a mobile/browser frame-rate claim. The original pre-optimization baseline above was captured before the code changes; these clean-worktree measurements provide a more comparable same-script control.

The final production build emitted 94,343 bytes of JavaScript (30,050 gzip), 6,827 bytes of CSS (2,180 gzip), and 147,100 total bytes under `dist/`. CI budgets are 250,000 JavaScript bytes, 100,000 CSS bytes, and 350,000 total output bytes.

The deterministic fixture was also run in Node, Chromium, Firefox, and WebKit: all engines matched the same six checkpoint hashes at 120-tick intervals for seed `0x51a7` (decimal 20,903). This verifies simulation hashes for that scenario only; it does not establish visual parity, Safari-on-device behavior, or low-end phone performance.
