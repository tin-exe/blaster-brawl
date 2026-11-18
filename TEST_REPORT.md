# BLASTER BRAWL — security review verification

**Result:** no known critical, high or moderate security findings remain in the reviewed source/dependency graph after the hardening changes below. This is a focused code/configuration review, not a penetration test or a certification of an unpublished deployment.

## Verification

- `corepack pnpm audit` — **0 advisories** after updating Vite to 6.4.5 and Vitest to 4.1.12 (lockfile updated).
- `corepack pnpm test` — **42 tests passed across 9 files**, including settings schema/malformed-storage and blocked-`localStorage` access coverage.
- `corepack pnpm build` — **passed** with strict TypeScript and Vite 6.4.5; production output contains no `.map` source-map files.
- Browser runtime check of the built static bundle — Canvas initialized; one same-origin external module script and zero inline scripts; observed resources were same-origin; the root-scope service worker reached `activated`; the browser console had no output/errors.
- The Vite preview itself correctly rejected the forwarded browser hostname under its host check. That protection was not weakened; browser runtime inspection used a read-only static server pointed only at `dist/` instead.

## Hardening applied during review

The previous dependency graph was pinned to Vite 6.3.5 and Vitest 3.2.4; the live package audit identified high/critical advisories in that development toolchain (including the Vite dev-server arbitrary-file-read advisory and Vitest/Tinypool issues). Versions were upgraded to patched releases; a fresh audit now reports zero advisories. The ordinary `dev` command and Vite config now bind to loopback. Explicit `dev:host`/`preview:host` remain for trusted-LAN testing, and README instructions direct HTTPS tunneling to the built static preview, not the Vite dev server.

Production source maps were disabled to avoid shipping embedded source unnecessarily. CSP `connect-src` was reduced from unrestricted `ws:`/`wss:` schemes to `'self'`; same-origin worker and manifest directives are explicit and aligned across `_headers`, Netlify and Vercel policies. Settings storage lookup now catches browsers where reading the `localStorage` property itself throws, with a regression test.

## Review observations

Positive controls: CSP disallows inline script and `unsafe-eval`, disallows objects, constrains base/form sources, and uses a frame-ancestor policy; `nosniff`, `Referrer-Policy`, `Permissions-Policy` and HSTS are configured. App code uses `textContent` for error messages, Canvas for game text, schema/range validation for local settings, no user-controlled navigation target, and no third-party telemetry. The service worker only handles same-origin GET requests and deletes only its own cache-prefix versions. This game is static/client-only: no credentials, accounts or backend authorization are in scope.

## Residual deployment checks

## Current continuation verification

- `pnpm test` — **86 tests passed across 19 files**, including pointer-capture interruption recovery, bounded replay validation, match-config validation, per-tick replay decoding, and a 30-tick deterministic playback/state-hash comparison.
- `pnpm typecheck` and `pnpm build` — passed.
- Secret-pattern scan and bundle budgets — passed; JavaScript 110,455 bytes of 250,000 and CSS 6,827 bytes of 100,000.
- `pnpm run test:cross-browser` — **passed**; six fixed-seed checkpoints matched across Node, Chromium, Firefox, and WebKit after installing the required browser runtimes and Linux dependencies.
- Replay playback remains a tested deterministic foundation, not an in-game viewer. Physical-device share sheets, iOS/Android behavior, and public-host headers remain unverified.

- **Conditional framing policy:** deployment CSP allows framing by `*.manus.computer`, `*.manus.im` and `*.manus.com` as well as self. Keep that only if Manus embedding is required; otherwise narrow it to the exact trusted origin(s) or `frame-ancestors 'none'`.
- **Live response headers:** no public deployment exists in this review. Confirm the chosen host actually returns the configured CSP, HSTS and other headers over HTTPS; local Vite/Python preview does not prove provider behavior.
- `dev:host` and `preview:host` bind all interfaces by design. Use on a trusted LAN only. Never expose the development server through a public tunnel.

**Verdict:** approve the reviewed source after the applied fixes, subject to the two deployment-specific checks above. No real iOS/Android or public hosting security test is claimed.
