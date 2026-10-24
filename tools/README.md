# Porting tools

## `port_assets.py`

Generates a rights-gated inventory and reconciliation plan for an authorized IPA and PC base package.

### Plan only (safe default)

```bash
python3 tools/port_assets.py \
  --ipa "incoming/Angry Birds 1.0.ipa" \
  --base incoming/AngryBirds.zip \
  --plan-dir out
```

This writes `out/port-plan.json` and `out/port-plan.md`. The IPA is inventoried from the full extraction root; the detected `Payload/*.app` path is recorded in the plan so your mapping can strip it with `strip_prefix`. No game assets are copied in plan-only mode.

### Apply a mapping (requires rights confirmation)

```bash
python3 tools/port_assets.py \
  --ipa "incoming/Angry Birds 1.0.ipa" \
  --base incoming/AngryBirds.zip \
  --mapping incoming/asset_mapping.json \
  --license-file incoming/LICENSE-or-permission.txt \
  --i-have-rights \
  --apply \
  --out-dir out \
  --zip
```

The tool will refuse to copy anything unless `--i-have-rights` is supplied and the license file exists and is non-empty. Review `docs/RIGHTS_CHECKLIST.md` before running this command.

### Output

- `out/port-plan.json` — machine-readable reconciliation.
- `out/port-plan.md` — human-readable summary.
- `out/pc-port/` — rebuilt tree created only with `--apply`.
- `out/BUILD_MANIFEST.json` — build inputs, tool version, and mapping summary.
- `out/SHA256SUMS` — checksums for the rebuilt tree.
- `out/AngryBirds-PC-1.0.0.zip` — optional release archive when `--zip` is used.

## `test_game.js`

Headless regression tests for the Slingstone browser game. Runs the real game loop and the vendored Matter.js physics against a stub DOM/canvas, so no browser or `npm install` is required.

```bash
node tools/test_game.js
```

It verifies repeated shots, structure stability, out-of-stones handling, reachability and settling stability of all ten levels, destructible blocks, every shot ability (including the boss), star awards, camera/flyover/peek, and the sound toggle. Set `globalThis.__SLINGSTONE_TEST__ = true` before loading `game.js` to install the small test hook.

## `build_release.py`

Builds `dist/Slingstone-2.1.0.zip` from the original game files plus the vendored, MIT-licensed Matter.js build and its license text.

```bash
python3 tools/build_release.py
```
