# Slingstone

An original open-source slingshot physics game for PC browsers. Built with HTML5 Canvas, custom lightweight physics, procedural graphics, and synthesized audio. **No third-party game assets are used.**

> This repository was originally created for a proposed Angry Birds 1.0 PC port. That work is paused pending written permission from the rights holder. Slingstone is a separate, lawful deliverable and does not include or require any Angry Birds binaries, artwork, audio, level data, or trademarks.

## Play

Run a local server:

```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

Then open the preview URL shown by Arena, or `http://localhost:8000`.

You can also open `index.html` directly in a modern browser, though a local server is recommended.

## Controls

- Click/touch and drag the stone back from the slingshot.
- Pull farther for more power — the HUD and an on-canvas gauge show the charge.
- Release to launch. A new stone loads automatically once the previous one settles.
- Pop every glowing orb to complete the level.
- Press **Restart** to retry the current level.
- Press **Next Level** after completing a level.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Game page and UI |
| `style.css` | Layout and styling |
| `game.js` | Original game logic, physics, rendering, and audio |
| `docs/GAME_DESIGN.md` | Design notes |
| `tools/build_release.py` | Builds the release zip |
| `tools/test_game.js` | Headless gameplay regression tests |

The legacy rights-gated porting tooling remains in `tools/port_assets.py`, `tools/test_port_assets.py`, and the other documents under `docs/`. See [docs/PERMISSION_DOCUMENTS_INDEX.md](docs/PERMISSION_DOCUMENTS_INDEX.md) for the draft permission/agreement documents. Nothing from the paused port attempt is included in the Slingstone release.

## Build the release archive

```bash
python3 tools/build_release.py
```

This creates `dist/Slingstone-1.0.1.zip` containing only the original game files.

## Validation

```bash
node --check game.js
node tools/test_game.js
python3 tools/build_release.py
python3 tools/test_port_assets.py
```

`tools/test_game.js` runs the real game loop against a stub canvas in Node. It checks that multiple shots can be fired, that crate stacks stay stable at rest, that running out of stones ends the level, and that every level's targets are reachable.

GitHub Actions runs these checks on pushes and pull requests.

## License

Original game code and documentation are licensed under the MIT License. See [LICENSE](LICENSE).

Slingstone is an independent original game. It is not affiliated with, endorsed by, or sponsored by Rovio Entertainment Ltd. or any other game publisher.

*This repository is maintained by the project owner; this document is not legal advice.*
