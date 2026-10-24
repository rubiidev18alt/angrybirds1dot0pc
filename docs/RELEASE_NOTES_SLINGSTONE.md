# Slingstone 1.0.1

Bug-fix release of **Slingstone**, an original open-source slingshot physics game for PC browsers.

## Fixed in 1.0.1

- **Slingshot power.** Maximum launch speed was `100 px * 5.2 = 520 px/s`, which gives a ballistic range of only about 300 px while the targets sit 430–500 px away. It was mathematically impossible to reach them with a normal shot. Launch power is now `120 px * 8.0 = 960 px/s`, the pull radius is larger, and a **power gauge** (in the HUD and on the canvas) shows how hard you are pulling. The aim trajectory preview was updated to match.
- **Only one shot worked.** A spent stone was never removed from game state. `beginDrag()` rejects a new drag whenever a stone object exists, so after the first shot every later drag was silently ignored. Stones now retire automatically once they come to rest or after 3.5 seconds, and the next stone loads on its own.
- **Crate stacks drifted upward and popped orbs by themselves.** Overlap resolution added a `+0.5 px` nudge every frame, which slowly levitated stacked crates. Resolution now moves each crate by exactly half the penetration, crates snap onto their support surface, and they only sleep at near-zero velocity. Loss detection also waits for crates to settle before declaring "out of stones".
- Crate knockback is capped and crates stay inside the playfield, so a fast stone no longer launches them off-screen.
- Stone impact audio/particles are rate-limited to avoid a buzz when a stone grinds against a crate.
- The drag point is clamped to the visible play area so a full-power pull cannot disappear below the ground.

## Added

- `tools/test_game.js` — headless Node regression tests that run the real game loop against a stub canvas. Verifies repeated shots, idle stack stability, out-of-stones handling, and that all three levels are reachable.
- These tests now run in the validate and release GitHub Actions workflows.

## What's included

- `Slingstone-1.0.1.zip` — the complete original game.
- `index.html`, `style.css`, `game.js` — playable browser game.
- `LICENSE`, `NOTICE.md`, `THIRD_PARTY_NOTICES.md`, and `docs/GAME_DESIGN.md`.

## Features

- Three handcrafted levels.
- Mouse and touch slingshot controls with power gauge and trajectory preview.
- Custom gravity, collision, and crate-stacking physics.
- Procedural Canvas graphics.
- Synthesized Web Audio sound effects.
- Score, shot counter, restart, and next-level controls.

## How to play

1. Extract the zip.
2. Serve the folder with `python3 -m http.server 8000 --bind 0.0.0.0`, or open `index.html` in a modern browser.
3. Drag the stone back and release to pop every glowing orb. Pull farther back for more power; a new stone loads automatically after each shot.

## Rights

Slingstone contains only original code, procedural art, and synthesized audio. It does **not** include any Angry Birds binaries, artwork, audio, level data, or trademarks. It is an independent game and is not affiliated with Rovio Entertainment Ltd.

## Verification

```bash
unzip -t Slingstone-1.0.1.zip
sha256sum Slingstone-1.0.1.zip
```
