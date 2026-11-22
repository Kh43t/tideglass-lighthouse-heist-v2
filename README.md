[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/Kh43t/tideglass-lighthouse-heist-v2/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/Kh43t/tideglass-lighthouse-heist-v2/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

# Tideglass II — 5 heists, 17 guards, 32 treasures, 3 gadgets

[![make.fun](https://make.fun/badge.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

A top-down stealth game that runs entirely from static files — no network, no libraries, no build step. Open `game/index.html` in desktop Chrome and play.

**The job:** steal the relic on each of five lighthouse floors — Boathouse, Lamp Gallery, Lantern Room, Cistern Vault, Beacon Crown — then reach the exit unseen. 17 wardens patrol the floors; 32 treasures are optional; 3 gadgets get you out of trouble.

## How to play

- **WASD / arrows** — move. **Shift** — sprint (fast, noisy, drains stamina). **C** — sneak (slow, quiet).
- **Click / Q** — throw a pebble: the clatter lures a guard to investigate.
- **E** — smoke puff: a cloud that breaks line of sight for a few seconds.
- **R** — ring the bell: every guard in earshot marches to the far corner.
- **M** — mute.

## The stealth systems

- **Vision cones with raycast** — walls, crates and tables cut every guard's cone. A cone that touches you fills the suspicion meter over your head; half-full and the guard comes to look; full and the chase is on. Caught only on touch — a near miss is a story, not a fail.
- **Cover you can read at a glance** — sea-grass hides you completely, shadow pools halve detection, lamplight raises it 1.7×.
- **Guard AI** — patrol (pausing at waypoints) → suspicious → investigate → alert/chase → search → return to patrol.
- **The lighthouse beam** (floors 2–5) — a rotating searchlight. Stand in it too long and every warden converges on you.
- **Noise** — sprinting is loud, pebbles and bells pull guards around the map.
- **Scoring** — 50 per treasure, 500 per relic, +300 ghost bonus per floor with no alert, plus a time bonus against each floor's par.

## Sound

Procedural WebAudio, no audio files: ocean ambience, footsteps panned by position, alarm stings, pickup chimes.

## Structure

- `game/index.html` — the page (1280×800 canvas)
- `game/src/config.js` — tuning constants
- `game/src/levels.js` — the five heists as data
- `game/src/vision.js` — raycast, cones, line of sight, beam test
- `game/src/guard.js` — guard AI state machine
- `game/src/player.js` — movement, stamina, gadgets
- `game/src/engine.js` — the DOM-free core: one tick advances a heist
- `game/src/audio.js` — procedural WebAudio
- `game/src/input.js` — keyboard + mouse
- `game/src/render.js` — canvas drawing, HUD, screens
- `game/src/shots.js` — staged scenes for screenshots (`?shot=`)
- `game/src/main.js` — game loop and screens
- `tools/sim-test.mjs` — deterministic Node simulation: a bot plays all five floors (BFS pathfinding, cone-aware stepping, grass hides, smoke escapes)

## Run it

```sh
node serve.ts          # then open http://localhost:8080
node tools/sim-test.mjs   # headless bot plays every floor
```

Built for the [make.fun best stealth game bounty](https://make.fun/bounty/best-stealth-game-20261121-1759). MIT licensed.
