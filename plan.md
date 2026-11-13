# BLASTER BRAWL — Phase 2 Plan (continuing Phase 1)

## Implementation approach

Build a self-contained static browser game with pinned TypeScript, Vite, and Vitest dependencies; use an original custom HTML5 Canvas engine and no Phaser. Keep all gameplay and presentation tuning, including the title, in `src/config.ts`. Use a fixed 60 Hz simulation with a variable render frame, and reuse bullet and particle objects through pools. No server or database is needed; browser settings are locally versioned and validated before use. Web Audio sounds are synthesized only after the user's first click.

The engine is organized around a small scene state machine (`loading`, `menu`, `match`, `result`, and pause overlay), with focused modules for fighters, bot decisions, weapon behavior, world geometry, particles, audio, settings, menus, HUD, and Canvas rendering. A single 16:9 logical playfield scales to fit the responsive viewport; fullscreen is optional. Play moves from the menu to a best-of-three-stock ring-out match, respawns until a fighter has no stocks, presents victory/defeat with replay and menu actions, and handles pause without advancing simulation.

Art and sound are procedural only. Canvas drawing creates the floating grass-and-rock platforms, layered mountains, huts and acacia silhouettes, outlined round-headed fighters, hats, pickups, effects and chunky riveted lettering. The fixed game title and every adjustable value belong in `src/config.ts`. A static Netlify deployment file and Vercel deployment file accompany the static build; `README.md`, `TEST_REPORT.md`, and a manual QA checklist document setup and verification.

## Project structure

- `src/config.ts` — title, palette, dimensions, movement/combat/bot/world/pickup/effect/audio/UI/settings defaults and input mappings.
- `src/main.ts` — boot, canvas sizing, input wiring, fixed-step loop, global error state, scene transitions and lifecycle.
- `src/engine/` — keyboard/pointer input, math and collision helpers, and object pooling; `src/main.ts` owns the fixed 60 Hz simulation loop.
- `src/scenes/` — match simulation plus focused match lifecycle tests; pause/result transitions are orchestrated by `src/main.ts` and rendered by `src/render/renderer.ts`.
- `src/entities/` — fighters, bot logic, platforms, pickups, projectiles, particles, and damage/knockback rules.
- `src/weapons/` — weapon definitions and pistol, shotgun, rocket firing/update behavior.
- `src/render/renderer.ts` and `index.html` — Canvas menu/HUD/options/result drawing plus accessible mute, fullscreen, loading and error controls.
- `src/audio/` — user-gesture-gated Web Audio sound synthesis and mute persistence.
- `src/storage/` — versioned settings schema, validation, safe localStorage parsing and defaults.
- `src/render/` — procedural vector-like Canvas world, character, weapon, particle and UI drawing.
- `src/entities/gameplay.test.ts`, `src/scenes/match.test.ts`, `src/storage/settings.test.ts`, `src/weapons/fire.test.ts` — Vitest coverage for knockback, bot helpers, match lifecycle, settings and weapons.
- `public/manus-routes.json`, `public/blaster-brawl-logo.svg`, `public/_headers` — route declaration, original SVG wordmark and static-host security policy.
- `netlify.toml`, `vercel.json` — static build and deployment configuration for either provider.

## Phase 2 implementation plan

Continue the existing TypeScript/Vite Canvas project without replacing its renderer, style, pooling, fixed-step loop or procedural assets. No new dependency or backend is needed. Keep gameplay and balance values in `src/config.ts` and the existing build/test commands.

- Add typed `MatchConfig` and mode/difficulty data: 1v1 versus bot, one-player FFA (default three bots), local two-player, and two players plus configurable bots; support 1–3 bots, Easy/Normal/Hard, 1–5 stocks, and weapons on/off.
- Add `src/ai/` pure decision helpers and per-bot controller memory for target/pickup selection, reaction delay, aim error, burst/spray discipline, projectile dodge, double-jump recovery toward the nearest platform, and stuck fallback. Difficulty ranges and timing/probability values live in config; observations are visibility/line-of-sight bounded and aim remains imperfect.
- Generalize `src/scenes/match.ts`, fighter/projectile identity and respawn from the fixed human/bot pair to a roster; preserve player-owned projectiles, three-weapon behavior, all-versus-all ring-outs, elimination order, farthest-safe spawn choice, and fighter-count-scaled pickups. Local P1 remains A/D, W, J, K; P2 uses arrows, Up, Enter or Numpad0, and Right Shift; Escape pauses all players.
- Wire Custom Game into the existing right-aligned menu. Add mode, bot count, difficulty, stocks and weapons selectors; keep menu navigation keyboard-first and reuse the current visual style.
- Expand the existing Canvas HUD with per-fighter name, number/shape marker, stocks, weapon/ammo and offscreen arrows; show elimination order and a clear FFA winner. Keep respawn flicker and use adaptive particle reduction if frames fall behind.
- Test helpers and lifecycle with Vitest, including all four match modes, respawn invulnerability, FFA ordering/winner, valid difficulty ranges, and deterministic headless bot-vs-bot runs for all three difficulties; update README, report and changed-files list.

### Phase 2 project structure additions

- `src/ai/` — difficulty profiles, pure tactical helpers, stateful controller memory and deterministic simulation support.
- `src/game/match-config.ts` — MatchConfig types, presets and validation shared by the setup screen and match constructor.
- Extend `src/types.ts`, `src/engine/input.ts`, `src/entities/fighter.ts`, `src/entities/projectiles.ts`, `src/scenes/match.ts`, `src/render/renderer.ts` and `src/main.ts` only where roster/mode support requires it.
- `src/ai/**/*.test.ts`, `src/scenes/match.test.ts` and existing Vitest files — decision, difficulty, mode, lifecycle and simulation coverage.

### Phase 2 implementation notes

- `weaponsEnabled: false` disables firing and pickups but retains a short-cooldown unarmed contact shove, so the ring-out objective remains possible.
- The default 1v1 spawn is close enough to remain inside every difficulty's configured perception range. Longer sight is still constrained by platform line-of-sight; aim always has configured nonzero error.
- The 60 Hz fixed-step simulation is independent of rendering. Repeated slow-frame observations lower new particle emissions; sustained fast frames restore full quality. This is a mitigation, not a measured device-FPS claim.
- Browser Preview validation completed title-to-Custom-Game navigation and the mode selector (1v1 → FFA, default three bots), plus desktop and narrow viewport captures. The complete interactive mode/results matrix and physical-device testing remain open in `QA_CHECKLIST.md`.

## Design

### Design Movement

Use the user's specified bright cartoon flat-vector look, with thick black outlines, playful character silhouettes and a floating savanna arena. Keep combat non-graphic and readable at a glance.

### Core Principles

1. **Readable ring-outs:** strong fighter silhouettes, directional knockback, clear platform edges and unobscured stocks make the goal obvious.
2. **Procedural charm:** handmade-looking shapes, small expressive poses, rivets, dust and sparks replace imported artwork.
3. **Quick playful feedback:** squash, recoil, screen shake and clear audio transients make hits feel impactful without blood or realistic weapon cues.
4. **Keyboard-first clarity:** large outlined labels, visible focus, and consistent movement/shoot/switch/pause hints keep the game easy to learn.

### Color Philosophy

Use airy sky blues and warm cream for breathing room, deep ink outlines for clarity, bright grass green and ochre for the arena, and vivid cyan/coral/yellow accents to separate fighters, ammunition, pickups and effects. Reserve the strongest contrasts for interactive elements and match-critical feedback.

### Layout Paradigm

The game world fills the viewport and remains visible behind interface overlays. The title is oversized and slightly angled at the top-left while the right-aligned option stack sits in a dark outlined panel at the right. During play, stocks and weapon/ammo status hug the upper corners, leaving the center open for movement. Menu options use a vertical list instead of a card grid.

### Signature Elements

- A chunky, riveted metal BLASTER BRAWL wordmark with a bolt/star badge.
- Floating turf ledges with layered brown rock strata and tiny grass tufts.
- Rounded, black-outlined fighters with swappable color and a customizable hat silhouette.

### Interaction Philosophy

Menus support arrow/W/S navigation and Enter/Space activation, with a visible selection marker and the requested right alignment. Escape pauses or resumes. Settings respond immediately and remain saved only after schema validation. First pointer/keyboard activation unlocks procedural sound; a persistent mute control stays available.

### Animation

Use restrained frame-independent animation driven by simulation time: two-step run bob, short anticipatory jump compression, clear jump/fall leg poses, brief muzzle flash and recoil, hit squash/flash, and a fall tumble. Particles have short lifetimes and pooled storage; explosions add one bounded shake impulse. Keep motion crisp and readable, not photorealistic.

### Typography System

Use a bold condensed system sans stack for the display title and menu labels, with a neutral system sans for help text and HUD. Construct the wordmark with Canvas text, heavy strokes, offset shadow and simple rivet circles so no external font or asset is needed.

### Brand Essence

A fast, friendly ring-out showdown for players who want readable chaos instead of health bars. Personality: punchy, playful, scrappy.

### Brand Voice

Short, energetic instructions with clear verbs. Example lines: “Three stocks. One last fighter.” and “Pick a blaster. Hold your ground.”

### Wordmark & Logo

An original metal-plate wordmark: stacked “BLASTER / BRAWL” in heavy outlined caps, a riveted frame, and a tiny four-point spark mark. Recreate in Canvas/SVG without external art.

### Signature Brand Color

**Bolt Coral** — a vivid warm coral used for the selected menu marker, player accent and hit sparks, offset by ink-black outlines.


## Phase 3 — mobile support continuation

Continue the original TypeScript/Vite Canvas game in place; preserve its match simulation, procedural cartoon art, existing storage key and static deployment model. Reuse the Phase 2 bright outlined-cartoon visual language, extending it with safe-area-aware translucent touch controls rather than replacing the game UI. Keep the implementation dependency-free: a focused `src/ui/touch/` module owns joystick math, pointer-ID state, settings-driven presentation and input-source visibility; `src/main.ts` combines that source with keyboard/gamepad input and owns viewport, pause, quality and service-worker lifecycle; `src/game/quality.ts` isolates the startup frame-time decision; the existing pooled effects system gains a configurable active-particle ceiling. `index.html` and `src/style.css` own the accessible controls, 100dvh landscape layout and portrait overlay. The static `public/manifest.webmanifest`, `public/sw.js` and `public/icons/` add install/offline behavior without inline scripts or server/database dependencies.

The requested mobile behavior is implemented as touch-pointer controls with simultaneous independent pointers; 48px-or-larger action targets, safe-area positioning and saved size/opacity/handedness/haptics preferences; touch-vs-keyboard/gamepad visibility switching; keyboard-only local multiplayer messaging; portrait pause/rotation resume; DPR capped at 2; first-two-second AUTO quality sampling against 50 FPS plus LOW/HIGH overrides; visibility/blur pause and audio-context recovery; and versioned cache-first PWA assets. README and the manual QA checklist cover same-Wi-Fi testing, free HTTPS tunnels and static deployment. Automated tests target joystick math, independent pointer tracking, source switching, quality thresholds, settings migration and particle caps. Real-device, deployed-HTTPS and offline-install verification remain manual and are not represented as completed by source/build checks.
