# Slingstone 2.1.0 — more levels, a boss, and three new stones

An expansion of **Slingstone**, the original open-source slingshot physics game for PC browsers.

## New in 2.1.0

- **Ten levels.** Seven new levels (4–10) with pillars, glass towers, turrets and stacked fortresses: *Bubble Bath*, *Heavy Metal*, *Split Decision*, *Up, Up & Away*, *The Big Squeeze*, *Fortress Fall*, and *The Wisp King*.
- **Boss fight on level 10 — "The Wisp King."** A large crowned, armored wisp with its own **HP bar**. It anchors in place (static body), shrugs off the Bubble lift, and needs multiple hits to defeat. Land heavy strikes or chain explosions to bring it down — worth 2,500 points.
- **Three new stones:**
  - **Bubble (pink)** ◎ — *Uplift*: releases a rising column of bubbles that floats nearby blocks and wisps up and off the top of the world.
  - **Inflator (orange)** ◉ — *Inflate*: swells into a giant ball. It gains real mass as it grows (via `Body.scale`), so it crushes structures and hits far harder.
  - **Boulder** ◆ — a big, heavy, strong stone. No ability, but high density and a large radius translate into huge impact damage.
- Added a boss HP bar, boss crown/armor/eyes art, buoyant bubble particles, explosion damage against the static boss, and a boss-battle intro message.

## From 2.0.0 (Matter.js edition)

- **Matter.js 0.20.0** (MIT, vendored locally) rigid-body physics with a fixed timestep and sleeping bodies.
- **Destructible wood, glass, and stone** with progressive cracks and debris.
- Four original abilities — Bolt *Surge*, Bomber *Blast*, Splitter *Scatter*, Pebble (basic).
- **Camera flyover, shot-follow pan, and Peek**, plus star ratings with `localStorage` progress.
- Full procedural art pass, synthesized audio, result overlay, stone queue, power gauge, trajectory preview, and sound toggle.

## Controls

| Action | Input |
| --- | --- |
| Aim and launch | Drag the stone back, release |
| Use ability | Click / tap canvas, or **Space**, mid-flight |
| Peek at targets | Hold **Peek at targets**, or **V** |
| Restart / Next | **R** / **N** (or the buttons) |
| Sound | **M** (or the button) |

## What's included

- `Slingstone-2.1.0.zip` — the complete original game.
- `index.html`, `style.css`, `game.js` — playable browser game.
- `vendor/matter.min.js` and `vendor/MATTER_LICENSE.txt` — the MIT-licensed physics engine.
- `LICENSE`, `NOTICE.md`, `THIRD_PARTY_NOTICES.md`, `docs/GAME_DESIGN.md`, and preview images (gameplay, level 3, boss, inflator, bubble).

## Testing

101 headless assertions in `tools/test_game.js` run the real game loop and Matter.js physics against a stub canvas in Node. They cover repeated shots, per-level stability, out-of-stones, reachability of all ten levels, destructible blocks, every ability (including the boss), star awards, camera, and the sound toggle. These run in the validation and release workflows.

## Rights

Slingstone contains only original code, procedural art, synthesized audio, and the MIT-licensed Matter.js engine. It takes inspiration only from *genre mechanics* common to slingshot puzzle games. It does **not** include any Angry Birds binaries, artwork, audio, characters, level data, or trademarks, and is not affiliated with Rovio Entertainment Ltd.

## Verification

```bash
unzip -t Slingstone-2.1.0.zip
sha256sum Slingstone-2.1.0.zip
```
