# BLASTER BRAWL — mobile support and security review files changed

This delivery continues the supplied TypeScript/Vite game; it does not replace the game systems.

## Mobile input and game lifecycle

- `src/ui/touch/` — virtual joystick math, per-pointer actions, source switching, control overlay, and multi-touch tests.
- `src/engine/input.ts` — keyboard/gamepad input and hot-path cleanup.
- `src/main.ts`, `src/audio/audio.ts` — touch merge, mobile options, orientation/lifecycle pause, audio resume and PWA registration.
- `src/game/quality.ts`, `src/entities/effects.ts`, `src/scenes/match.ts` — automatic quality decision and bounded pooled-particle cap.
- `src/render/renderer.ts`, `src/style.css`, `index.html` — canvas options/tap navigation, landscape touch UI, safe areas and rotation overlay.
- `src/config.ts`, `src/storage/settings.ts` — validated preferences; storage getter failures fall back safely.

## PWA, security hardening and validation

- `public/manifest.webmanifest`, `public/sw.js`, `public/icons/` — install metadata, same-origin offline cache and PNG artwork.
- `public/_headers`, `netlify.toml`, `vercel.json` — aligned same-origin CSP worker/manifest directives and restricted `connect-src`.
- `vite.config.ts`, `package.json`, `pnpm-lock.yaml` — patched Vite 6.4.5 and Vitest 4.1.12; dev server defaults to loopback; production source maps disabled.
- `src/storage/settings.test.ts`, touch/quality/effects tests — 42 passing tests across 9 files.
- `README.md`, `QA_CHECKLIST.md`, `TEST_REPORT.md`, `SECURITY_REVIEW.md`, `TODO.md`, `plan.md` — testing, deployment guidance, security findings and residual manual checks.
