# Slingstone 1.0.0

First public release of **Slingstone**, an original open-source slingshot physics game for PC browsers.

## What's included

- `Slingstone-1.0.0.zip` — the complete original game.
- `index.html`, `style.css`, `game.js` — playable browser game.
- `LICENSE`, `NOTICE.md`, `THIRD_PARTY_NOTICES.md`, and `docs/GAME_DESIGN.md`.

## Features

- Three handcrafted levels.
- Mouse and touch slingshot controls.
- Custom gravity and collision physics.
- Procedural Canvas graphics.
- Synthesized Web Audio sound effects.
- Score, shot counter, restart, and next-level controls.

## How to play

1. Extract the zip.
2. Serve the folder with `python3 -m http.server 8000 --bind 0.0.0.0`, or open `index.html` in a modern browser.
3. Drag the stone back and release to pop every glowing orb.

## Rights

Slingstone contains only original code, procedural art, and synthesized audio. It does **not** include any Angry Birds binaries, artwork, audio, level data, or trademarks. It is an independent game and is not affiliated with Rovio Entertainment Ltd.

## Verification

```bash
unzip -t Slingstone-1.0.0.zip
sha256sum Slingstone-1.0.0.zip
```
