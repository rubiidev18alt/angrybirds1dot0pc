# Slingstone 2.0.0 — Matter.js edition

A major rebuild of **Slingstone**, the original open-source slingshot physics game for PC browsers.

## Highlights

- **Replaced the custom physics loop with [Matter.js](https://brm.io/matter-js/) 0.20.0** (MIT, vendored locally). Rigid bodies now stack, topple, tumble, and transfer momentum realistically; sleeping bodies keep settled structures stable.
- **Destructible wood, glass, and stone.** Each material has its own density, hit points, and break effect. Blocks crack progressively as damage accumulates, then shatter into debris.
- **Four stone types with mid-flight abilities** — click, tap, or press **Space** while a shot is airborne:
  - **Pebble** — reliable, no ability.
  - **Bolt** ⚡ — *Surge*: burst of extra speed.
  - **Bomber** ✸ — *Blast*: radial shockwave and area damage.
  - **Splitter** ✦ — *Scatter*: splits into three stones.
- **Camera and level flyover.** The world is wider than the viewport. Each level opens with a short pan across the targets, the camera follows shots in flight, and **Peek at targets** (hold the button or press **V**) looks at the far end.
- **Star ratings and saved progress.** Up to three stars per level based on stones left, plus a leftover-stone score bonus. Best stars persist in `localStorage`.
- **Complete graphics remake.** Layered parallax sunset sky, drifting clouds, twinkling stars, a glowing sun, three procedural mountain ranges, textured soil and grass, gradient-shaded planks/stone/glass with grain and nails, glowing wisps with orbit rings and sparks, debris, shockwaves, screen shake, floating score popups, shot trails, and a vignette.
- **New UI.** Stone queue, power gauge, trajectory preview, ability prompts, sound toggle, and a star-rated result overlay for both wins and losses.
- **Three redesigned levels:** *First Flight*, *Timber Yard*, and *Sky Keep*.

## Controls

| Action | Input |
| --- | --- |
| Aim and launch | Drag the stone back, release |
| Use ability | Click / tap canvas, or **Space**, mid-flight |
| Peek at targets | Hold **Peek at targets**, or **V** |
| Restart / Next | **R** / **N** (or the buttons) |
| Sound | **M** (or the button) |

## What's included

- `Slingstone-2.0.0.zip` — the complete original game.
- `index.html`, `style.css`, `game.js` — playable browser game.
- `vendor/matter.min.js` and `vendor/MATTER_LICENSE.txt` — the MIT-licensed physics engine.
- `LICENSE`, `NOTICE.md`, `THIRD_PARTY_NOTICES.md`, `docs/GAME_DESIGN.md`, and two preview images.

## Testing

45 headless assertions in `tools/test_game.js` run the real game loop and Matter.js physics against a stub canvas in Node. They cover repeated shots, structure stability, out-of-stones handling, reachability of all three levels, destructible blocks, every ability, star awards, camera/flyover/peek, and the sound toggle. These run in both the validation and release workflows.

## Rights

Slingstone contains only original code, procedural art, synthesized audio, and the MIT-licensed Matter.js engine. It takes inspiration only from *genre mechanics* common to slingshot puzzle games. It does **not** include any Angry Birds binaries, artwork, audio, characters, level data, or trademarks, and is not affiliated with Rovio Entertainment Ltd.

## Verification

```bash
unzip -t Slingstone-2.0.0.zip
sha256sum Slingstone-2.0.0.zip
```
