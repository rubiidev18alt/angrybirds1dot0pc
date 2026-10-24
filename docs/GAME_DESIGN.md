# Slingstone design notes

## Overview

**Slingstone** is an original, open-source physics puzzle game for PC browsers. It is inspired by the classic slingshot/launch genre, but it uses entirely original code, procedural graphics, and synthesized audio. No Angry Birds assets, characters, names, or trademarks are used.

## Gameplay

- Drag the stone back from the slingshot anchor.
- Release to launch it toward stacks of crates and glowing orbs.
- Pop every orb to complete the level.
- Each level has a limited number of stones.
- Crates can be knocked around and can also pop orbs.

## Technical design

- **Rendering:** HTML5 Canvas 2D. All art is drawn procedurally.
- **Physics:** Custom lightweight 2D physics with gravity, circle/AABB collision, impulse transfer, and simple crate separation.
- **Audio:** Web Audio API oscillators; no audio files.
- **Input:** Mouse and touch/pointer events. Drag distance sets launch speed (`MAX_DRAG * LAUNCH_POWER` = 960 px/s maximum), shown by a power gauge.
- **Stone lifecycle:** A launched stone retires once it comes to rest or after 3.5 s, then the next stone loads automatically. This is what makes repeated shots possible.
- **Crate stacking:** Crates snap onto their support surface (ground or another crate) and only sleep when velocity is near zero. Overlap resolution moves crates by exactly half the penetration, with no per-frame fudge factor, so stacks do not drift upward on their own.
- **State:** Three handcrafted levels defined in `game.js`.
- **License:** Original code is MIT-licensed. See `LICENSE`.

## Why this is not a port

This repository was originally created for a proposed Angry Birds 1.0 PC port. That effort is paused pending written permission from the rights holder. Slingstone is a separate, lawful deliverable that does not include or require any third-party game files.

## Running locally

```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

Then open the provided preview URL or `http://localhost:8000`.

## Building the release zip

```bash
python3 tools/build_release.py
```

This creates `dist/Slingstone-1.0.1.zip` containing only the original game files.

## Regression tests

```bash
node tools/test_game.js
```

Runs the actual game loop against a stub DOM/canvas in Node, so physics and input bugs are caught without a browser.
