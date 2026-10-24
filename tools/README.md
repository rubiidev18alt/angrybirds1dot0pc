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
