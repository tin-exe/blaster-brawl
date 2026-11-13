# Security Review — BLASTER BRAWL

**Review date:** 2026-11-14  
**Scope:** static TypeScript game, local-storage settings, PWA/service worker, Vite toolchain, CSP and Netlify/Vercel/static-host response-header configuration.  
**Verdict:** no known critical, high or moderate findings remain after the fixes listed below. This is a focused source/config review, not a penetration test or deployment certification.

## Summary

The game is a static, client-only application with no accounts, server-side authorization, secrets, analytics or third-party app requests. No confirmed XSS, unsafe navigation or cross-origin data flow was found in the reviewed app code. The dependency audit did find high/critical development-toolchain advisories in the original pinned versions; the toolchain was upgraded and the final audit reports **zero advisories**.

## Findings and remediation

### Resolved — High/Critical, vulnerable development dependencies

The original Vite 6.3.5 dependency was affected by Vite dev-server advisories, including arbitrary file read via the Vite dev-server WebSocket path; the original Vitest 3.2.4 dependency graph also included critical Vitest/Tinypool advisories. The versions are now Vite **6.4.5** and Vitest **4.1.12**, with the lockfile refreshed. A final `corepack pnpm audit` reported zero advisories. These findings were in development tooling, not a demonstrated compromise of the static game.

### Resolved — Low, storage getter could interrupt startup

`localStorage` was resolved before the previous `try` blocks, so a browser that throws while evaluating the `localStorage` property could prevent startup or interrupt saving. `resolveStorage()` now catches that access and falls back to defaults/no-op saves. A regression test covers both load and save behavior.

### Resolved — Minor hardening, unnecessary network/source exposure

The previous policy allowed `ws:` and `wss:` connections to any host even though the production game needs only same-origin requests. All three hosting policies now use `connect-src 'self'` and explicitly allow only same-origin workers/manifests. Production source maps are disabled. The normal `dev` command and Vite server configuration bind to `127.0.0.1`; `dev:host` and `preview:host` intentionally bind all interfaces for trusted-LAN testing. Documentation now says to tunnel only the built static preview, not Vite's development server.

## Positive controls observed

- CSP disallows inline scripts and `unsafe-eval`, blocks objects, restricts `base-uri` and form actions, constrains scripts/styles/images/fonts, and includes a frame-ancestor policy.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` and HSTS are configured for the supported static hosts.
- No `innerHTML`, `document.write`, `eval`, `new Function`, credential/token storage, external script, telemetry or user-controlled navigation sink was found in the inspected app code. Dynamic error text uses `textContent`; game text is drawn to Canvas.
- Stored settings are treated as untrusted: parsed values are checked for version, type and range and copied into a fresh object. The service worker limits handling to same-origin GET requests and manages only the `blaster-brawl-` cache namespace.
- PWA runtime inspection showed only same-origin loaded resources, zero inline scripts, an initialized Canvas and an activated root-scope service worker; the browser console had no output/errors.

## Remaining deployment-specific checks

1. **Frame embedding allowlist:** `frame-ancestors` permits self and wildcard subdomains under `manus.computer`, `manus.im` and `manus.com`. Retain those wildcards only if Manus embedding is required and those subdomains are trusted. Otherwise narrow to exact required origins or `frame-ancestors 'none'`.
2. **Provider headers:** the app has not been deployed. Verify the chosen host actually returns the configured CSP, HSTS and other headers over HTTPS; local preview does not prove provider behavior.
3. **Public exposure:** the explicit `dev:host` and `preview:host` scripts bind to all interfaces. Use them only on a trusted LAN; do not tunnel the Vite dev server.

## Verification evidence

`corepack pnpm audit`: 0 advisories. `corepack pnpm test`: 42 tests passed across 9 files. `corepack pnpm build`: passed, and no `.map` files were emitted into `dist/`. A browser runtime smoke test of the static production bundle confirmed same-origin resources, no inline script and an activated service worker. The browser request to the Vite preview's forwarded hostname was rejected by Vite's host check; that control was not weakened. A dedicated Chrome DevTools/CDP server was unavailable, so the live check used the built-in browser console/evaluation tools. No live response-header, offline-disconnect, physical-device or public-deployment test is claimed.
