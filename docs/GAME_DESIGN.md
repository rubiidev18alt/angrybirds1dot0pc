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
- **Input:** Mouse and touch/pointer events.
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

This creates `dist/Slingstone-1.0.0.zip` containing only the original game files.
