# Third-party notices

## Matter.js (used by Slingstone)

- **Package:** `matter-js` 0.20.0
- **Project:** https://brm.io/matter-js/ · https://github.com/liabru/matter-js
- **License:** MIT
- **Copyright:** (c) Liam Brummitt and contributors
- **Vendored file:** `vendor/matter.min.js`
- **Full license text:** [`vendor/MATTER_LICENSE.txt`](vendor/MATTER_LICENSE.txt)

Matter.js is a general-purpose 2D rigid-body physics engine. It is used by Slingstone for
gravity, collision detection, rigid-body stacking, and impulse response. It is included
unmodified as a minified browser build. The MIT license text is shipped alongside it in
this repository and inside every Slingstone release archive.

## No third-party game assets

The Slingstone game and its release archive contain **no third-party game assets**: no
third-party images, sprites, audio, fonts, characters, level data, or binaries.

All artwork is drawn procedurally with the Canvas 2D API at runtime. All sound effects are
synthesized with the Web Audio API. The two preview JPEGs under `docs/` are screenshots of
the original game itself, not third-party material.

Slingstone takes inspiration from *genre mechanics* common to slingshot puzzle games (a
slingshot, breakable structures, tappable shot abilities, star ratings). Those mechanics are
implemented in original code with original art. It does not copy, and does not include,
any Angry Birds artwork, audio, characters, level layouts, binaries, or trademarks.
