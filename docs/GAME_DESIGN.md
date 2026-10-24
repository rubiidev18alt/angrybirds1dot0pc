# Slingstone design notes

## Overview

**Slingstone** is an original, open-source physics puzzle game for PC browsers. It takes inspiration from genre mechanics common to slingshot puzzle games, but uses entirely original code, procedural graphics, and synthesized audio. No Angry Birds assets, characters, names, level layouts, or trademarks are used.

Since v2.0 the game runs on [Matter.js](https://brm.io/matter-js/) 0.20.0 (MIT), vendored at `vendor/matter.min.js`. The physics engine is included locally so the game and the release archive work offline and in CI without a package install.

## Gameplay

- Drag the stone back from the slingshot anchor and release to launch it.
- Pull farther for more power; the HUD and an on-canvas gauge show the charge, and a dotted trajectory preview shows the arc.
- Pop every glowing wisp to complete the level. Wisps can be hit directly, crushed by falling blocks, blasted, or knocked off the world.
- Structures are built from **wood**, **glass**, and **stone**, each with different density, hit points, and break effects. Blocks visibly crack before shattering.
- Each level has a fixed queue of stones. Some have abilities you trigger **mid-flight** by clicking/tapping or pressing Space:
  - **Pebble** — balanced, no ability.
  - **Bolt** — *Surge*: multiplies current speed by 1.75 with a slight lift.
  - **Bomber** — *Blast*: detonates, applying a radial impulse and area damage to nearby bodies.
  - **Splitter** — *Scatter*: replaces itself with three smaller stones spread across a narrow arc.
- Leftover stones award a score bonus and determine a **1–3 star** rating. Best stars persist in `localStorage`.

## Technical design

- **Physics:** Matter.js `Engine` with `enableSleeping: true`, gravity scale `0.0009`, 8 position and 8 velocity iterations. The game loop uses a fixed `1000/60` ms timestep with an accumulator (max 5 substeps per frame) so physics is deterministic regardless of refresh rate.
- **Bodies:** static ground and walls; dynamic rectangle blocks; dynamic circle wisps; dynamic circle projectiles. Custom metadata is attached to each body (`body.game`) rather than maintained in a parallel structure.
- **Damage:** the `collisionStart` event computes relative velocity and effective mass, then applies `rel² · mass · factor` damage. The factor is higher for player-stone impacts and lower for structure-on-structure or ground contacts. Blocks are removed from the world when hit points reach zero.
- **Wisps:** pop on a direct stone strike, on a hard impact (`rel > 5.2`), inside a blast radius, or when they fall off the world.
- **Shot lifecycle:** the active shot retires when it comes to rest, leaves the world, or exceeds 4.5 s. A short reload delay then loads the next stone. This is what makes repeated shots work.
- **Camera:** the world is 1520 px wide against a 960 px viewport. On load a flyover pans out to the targets and back; during flight the camera tracks the shot; **Peek** (hold button or `V`) pans to the far end. World rendering is translated by `-camera`, while sky/cloud layers use fractional parallax factors.
- **Rendering:** HTML5 Canvas 2D only. Three procedurally generated hill layers, drifting clouds, twinkling stars, a gradient sun with halo, textured soil and grass tufts, gradient-shaded materials with grain/speckle/nail details, damage cracks, glowing wisps with dashed orbit rings and orbiting sparks, debris chunks, spark particles, expanding shockwaves, floating score text, a shot trail, and a vignette. `ctx.save/translate/rotate/restore` is used for rotated bodies.
- **Audio:** Web Audio API oscillators and a generated noise buffer. No audio files. Sounds cover launch, thud, wood/glass/stone breakage, wisp pop, blast, surge, split, win fanfare, and failure. A mute toggle is provided.
- **State:** three handcrafted levels (`First Flight`, `Timber Yard`, `Sky Keep`) defined declaratively in `game.js` with top-left block coordinates converted to Matter's center-based rectangles.

## Why this is not a port

This repository was originally created for a proposed Angry Birds 1.0 PC port. That effort is paused pending written permission from the rights holder. Slingstone is a separate, lawful deliverable that does not include or require any third-party game files. The v2.0 features are original implementations of widely used genre conventions, not copied expression.

## Running locally

```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

Then open the provided preview URL or `http://localhost:8000`.

## Building the release zip

```bash
python3 tools/build_release.py
```

This creates `dist/Slingstone-2.0.0.zip` containing the game, the vendored Matter.js build and its license, notices, docs, and preview images.

## Regression tests

```bash
node tools/test_game.js
```

Runs the actual game loop and Matter.js physics against a stub DOM/canvas in Node, so physics and input bugs are caught without a browser. An opt-in `globalThis.__SLINGSTONE_TEST__` flag exposes a small read-only hook used by the tests; in a normal browser page the hook is not installed.
