# BLASTER BRAWL manual QA checklist

This checklist distinguishes checks already performed in the managed Preview from checks still suitable for a user-run browser/device pass. The game was not tested on a real phone or tablet.

## Verified in managed Preview / code checks

- [x] Dev Preview served `/` and `GET /manus-routes.json` as JSON with `{"routes":[{"path":"/","title":"BLASTER BRAWL"}]}` (HTTP 200).
- [x] Desktop menu rendered with the original title art, Play, Coming Soon entries, Custom Game and Options.
- [x] Keyboard navigation opened Custom Game; changing Mode from 1v1 to Free-for-All showed the default three-bot count.
- [x] Desktop (1280×720) and narrow portrait (375×812) Preview screenshots were captured. The game preserves its 16:9 canvas; portrait displays a small, letterboxed playfield.
- [x] Automated tests cover roster sizes for all four modes, Player 2 movement, weapons-off pickups, FFA elimination/winner data, respawn invulnerability and deterministic four-fighter simulations on Easy/Normal/Hard.
- [x] Automated replay coverage validates bounded/schema-safe clips, decodes both players by tick, and reproduces 30 recorded ticks with matching authoritative state hashes.
- [x] `corepack pnpm test` and `corepack pnpm build` pass in the current source tree (see `TEST_REPORT.md`).

## Remaining hands-on game checks

- [x] From Custom Game, start the FFA match; confirm four fighters, name/number/shape labels, per-fighter stocks and weapon/ammo cards, offscreen indicators, pickups and the pause control. The live Preview showed all four cards and the edge arrows.
- [x] Press Esc in the live FFA. The pause overlay displayed Resume, Restart Match and Main Menu; the timer still read 00:40 in the next screenshot about 12 seconds later.
- [ ] In the FFA match, verify knockbacks, three-stock ring-outs, respawns/flicker and the result screen's winner/elimination order. Use Replay, then Back to Menu.
- [ ] Start the Play 1v1 match in the browser; check A/D or arrows, W/Up double jump, J/Space fire, K weapon cycling, pause/resume/restart/menu, and replay/back transitions.
- [ ] Try each bot difficulty in Custom Game. Confirm Easy reacts more slowly/less accurately than Hard, while Hard still has reaction delay, imperfect aim and platform line-of-sight constraints.
- [ ] Choose Local 2 Player. Confirm P1 A/D, W, J/Space, K and P2 ←/→, ↑, Enter/Numpad0, Right Shift all work simultaneously; Esc pauses and resumes the whole match.
- [ ] Choose 2 Players + Bots; confirm all fighters compete in one free-for-all. Try both 1 and 3 bots, 1 and 5 stocks, and weapons on/off (unarmed contact shoves still permit ring-outs).
- [ ] Open Options; toggle sound, adjust shake, fighter color and hat. Reload and confirm settings persist.
- [ ] Replace `blaster-brawl-settings` in localStorage with malformed or older-version data; confirm safe defaults and no startup crash.
- [ ] Verify sound remains gated until the first pointer click, mute persists, and Fullscreen can be entered/exited.
- [ ] Verify mobile options for touch-control enablement, control size, opacity, handedness, haptics and AUTO/LOW/HIGH graphics settings.

## Mobile device QA (not run on physical devices)

Automated touch-state tests pass, but the checks below require real browsers/devices and remain intentionally unchecked.

- [ ] **iOS Safari:** landscape match controls, simultaneous joystick movement and shooting, Jump/Switch/Pause, audio unlock on first touch, vibration behavior, orientation pause/resume, dynamic browser chrome, and the Fullscreen-unavailable **Share → Add to Home Screen** hint.
- [ ] **Android Chrome:** same match-control pass; check keyboard/gamepad source switching and confirm touch controls return after the next touch.
- [ ] **Notched devices:** confirm all controls and utility buttons stay inside safe-area insets in both landscape directions and after fullscreen/home-indicator changes.
- [ ] **Orientation changes:** enter a match in landscape, rotate to portrait and verify the friendly overlay plus frozen match, then rotate back and verify a clean resume without catch-up movement.
- [ ] **Low-end phone:** measure the first two seconds; confirm AUTO lowers particles, shake and parallax below 50 FPS. Compare manual LOW and HIGH for stability and readability.
- [ ] **Offline mode:** load once online over HTTPS, wait for the service worker to control the page, close/reopen with network disabled and verify the game shell and assets still load.
- [ ] **Add to Home Screen:** install from Safari and Chrome where supported; verify the landscape/standalone manifest, artwork, launch behavior and offline mode.
- [ ] **Menus and multiplayer explanation:** tap through Menu, Custom Game and Options; confirm large menu targets work and keyboard-only local 2-player modes are clearly identified/blocked on touch.
- [ ] **Tunnel/deployment:** test HTTPS service-worker and fullscreen behavior, and inspect the deployed CSP plus other configured response headers.

## Release checks (not yet claimed)

- [ ] Publish `dist/` to Netlify or Vercel and inspect CSP, `frame-ancestors`, HSTS, X-Content-Type-Options, Referrer-Policy and Permissions-Policy on the deployed response.
- [ ] Confirm whether Manus wildcard subdomains are actually required for framing; if not, reduce `frame-ancestors` to the exact trusted origins or `'none'` before release.
- [ ] Keep Vite's development server off public tunnels. `dev:host`/`preview:host` are for trusted-LAN use; HTTPS tunnel testing must target the built static preview.
- [ ] Test on physical target devices and browsers if required. No Lighthouse run, publication or real-device check is claimed.
