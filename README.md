# BLASTER BRAWL

BLASTER BRAWL is an original, child-friendly 2D browser platform fighter built with TypeScript, Vite and a custom HTML5 Canvas engine. It has no Phaser or other game framework, no external art/audio files, no server and no database. Fighters have no health bars: hits apply knockback and ring-outs consume stocks. The last fighter with stocks wins.

## Requirements and setup

- Node.js 20 or newer with Corepack enabled.
- `pnpm@10.12.4` is pinned in `package.json`; dependencies are exact-version pinned in `package.json` and `pnpm-lock.yaml`.

```sh
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

Vite serves the game at `http://localhost:3000`. No API keys or backend services are required.

## Commands

```sh
corepack pnpm test   # Vitest unit, lifecycle and deterministic match simulations
corepack pnpm build  # strict TypeScript check and optimized static output in dist/
corepack pnpm dev:host # Vite bound to all interfaces for local-network phone testing
corepack pnpm preview:host # preview the production build on the local network
```

## Match modes and setup

Select **Play** for a direct 1v1 match against one bot. **Custom Game** provides five configurations:

- **1v1 vs Bot** — one human and one bot.
- **Free-for-All** — one human and 1–3 bots; the default is three bots.
- **Local 2 Player** — two people on the same keyboard and no bots.
- **2 Players + Bots** — two humans and 1–3 bots, all competing in the same free-for-all.
- **Survival Waves** — one player faces escalating waves; each wave adds enemies up to the selected cap, with higher bot difficulty later in the run.

The setup screen also selects Easy/Normal/Hard bot difficulty, 1–5 stocks, and weapons on/off. Survival opponents have distinct Rusher, Sniper, and Bruiser spacing behavior. When weapons are off, pickups and firing are disabled; fighter contact provides a short cooldown-based shove so ring-outs are still possible. Matches rotate among Meadow, Scrapyard, and Sky Bridges layouts. Ring-outs cost a stock, eliminated fighters leave the match, respawning fighters briefly flicker with invulnerability, and the last contender wins. FFA results list elimination order and the winner.

## Controls

| Action | Player 1 | Player 2 (local matches) |
| --- | --- | --- |
| Move | A / D (or ← / → in 1-player mode) | ← / → |
| Jump / double jump | W (or ↑ in 1-player mode) | ↑ |
| Shoot | J or Space | Enter or Numpad 0 |
| Switch weapon | K | Right Shift |
| Pause / resume | Esc (pauses both players) | Esc (pauses both players) |

Use ↑/↓ or W/S to navigate menus, Enter/Space to activate, and ←/→ to change a selected Custom Game or Options value. Matches use the pistol, shotgun, rocket launcher, and piercing railgun, each with different cadence, force, recoil and ammunition. Weapon pickups respawn, while eliminated bots can drop temporary Shield or Overdrive power-ups.

An attached gamepad also controls Player 1: left stick/D-pad to move, A (button 0) to jump/confirm, right trigger or X to shoot, Y to switch weapon, Start to pause, and B to go back. Keyboard or gamepad input hides the touch overlay; the next touch restores it on touch-capable devices.

The browser also shows Sound and Fullscreen buttons. Procedural Web Audio starts only after the first user gesture. Mute, shake intensity, fighter color and hat are stored as versioned, schema-validated settings in localStorage.

## Mobile support

BLASTER BRAWL is landscape-first on phones and tablets. In portrait, play pauses and a rotate-device message appears. The responsive 16:9 playfield follows dynamic viewport sizing, caps canvas pixel density at 2, and respects notched-device safe areas. Large touch targets sit over the match: left-side virtual joystick, Jump, Shoot, Switch Weapon and Pause. Pointer IDs are tracked independently, so movement and shooting can happen together. Touch controls are hidden when keyboard or gamepad input takes over; **Options** can enable them manually. Touch play is single-player: Local 2 Player and 2 Players + Bots are marked keyboard-only and blocked on touch devices.

Touch **Options** include control size, opacity, left-handed layout, optional vibration, and **AUTO / LOW / HIGH** graphics quality. AUTO averages the opening two seconds and reduces particles, shake and parallax if the match runs below 50 FPS. LOW/HIGH are available as overrides. The game pauses on tab hiding or focus loss and restores the audio context when the page becomes visible. On iOS Safari, use **Share → Add to Home Screen** for a standalone full-screen launch; Safari does not expose the standard Fullscreen API.

The installable PWA requests landscape orientation and standalone display. Its same-origin service worker uses a versioned cache, precaches the app shell and built assets, and caches static assets for subsequent offline launches. Open the game online once before trying it offline. The service worker and fullscreen APIs need HTTPS except on browser-trusted local origins such as `localhost`.

### Test on a phone

1. Connect the computer and phone/tablet to the same trusted Wi-Fi. Run `corepack pnpm dev:host`, find the computer's LAN IPv4 address, and open `http://<computer-lan-ip>:3000` on the device. This is useful for touch play, but plain LAN HTTP does **not** provide service-worker/offline installation or reliable fullscreen support. The ordinary `pnpm dev` command binds to localhost only.
2. For HTTPS/PWA testing, build first (`corepack pnpm build`), run the static production preview (`corepack pnpm preview:host`), and tunnel that preview with a free HTTPS tunnel such as Cloudflare Quick Tunnel (`cloudflared tunnel --url http://localhost:3000`). Do not tunnel the Vite development server; the temporary preview URL is public while active. A free ngrok tunnel is another option if already configured.
3. For a stable URL, deploy the built static site to Netlify, Vercel or Cloudflare Pages over HTTPS. For the production build locally, run `corepack pnpm build` then `corepack pnpm preview:host`; preview it on the LAN or through an HTTPS tunnel.

Use the manual mobile checklist in [`QA_CHECKLIST.md`](./QA_CHECKLIST.md). No real iOS or Android device testing is claimed by this source change.

## Configuration and structure

`src/config.ts` is the sole gameplay/presentation tuning source: title, dimensions, controls, arena/spawns, stocks, movement, weapons, pickups, bot difficulty values, particles, audio synthesis, performance thresholds, UI copy and settings defaults. In particular, each AI profile exposes reaction delay, imperfect aim/error, burst/spray cadence, bullet/rocket dodge probability, pickup priority, perception range and stuck timeout. Do not scatter balance values across systems.

- `src/main.ts` — loading/error handling, menu/custom/options/result states, touch and keyboard inputs, fixed 60 Hz simulation, lifecycle handling and adaptive graphics quality.
- `src/engine/` — keyboard/pointer input, math helpers and fixed-capacity object pooling.
- `src/ui/touch/` — virtual joystick math, per-pointer touch tracking, source switching and touch-control overlay.
- `src/game/match-config.ts` — shared MatchConfig presets, bounds and validation.
- `src/ai/` — difficulty profiles, visibility/line-of-sight target selection, projectile dodge, pickup choice, recovery, stuck fallback, controller memory and tests.
- `src/scenes/match.ts` and `src/entities/` — multi-fighter simulation, safe spawns/respawns, all-versus-all projectiles, pickups, effects, knockback and ring-outs.
- `src/weapons/` — weapon definitions and firing behavior.
- `src/render/renderer.ts` — procedural arena, fighters, labels/shape markers, roster HUD, offscreen arrows and menus.
- `src/audio/` and `src/storage/` — user-gesture-gated Web Audio and validated settings persistence.
- `src/**/*.test.ts` — Vitest checks for settings, weapon behavior, AI decisions, configurations, match outcomes and seeded bot simulations.

`public/manifest.webmanifest`, `public/sw.js` and `public/icons/` provide install metadata, offline shell caching and maskable PWA artwork. The supplied SVG icons reuse the game's original logo.

## Static deployment

`netlify.toml` and `vercel.json` configure the static build from `dist/` and the requested security headers. Choose a provider, connect this repository, and deploy the default static output. This project has **not** been deployed. For another static host, publish `dist/` and copy the policy in `public/_headers` into that provider's settings.

## Security and persistence

The app has no inline scripts, `eval` or `new Function` calls. Local settings are untrusted: version, shape, types and ranges are checked, malformed or unavailable storage safely falls back to defaults, and settings stay in this browser. The static game has no account system, backend or telemetry. The default Vite development command binds only to `127.0.0.1`; `dev:host` and `preview:host` intentionally expose to the LAN for testing—use only on a trusted network, and tunnel only the built static preview, never the Vite development server. Production builds omit source maps.
