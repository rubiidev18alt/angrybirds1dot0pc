# Technical port plan

## Observed constraints (updated after intake)

- The supplied IPA was found on `origin/master` and copied locally to the gitignored `incoming/` directory. Its inventory is recorded in [IPA_INVENTORY.md](IPA_INVENTORY.md). It is **not** committed and must not be published until the rights checklist passes.
- The build sandbox can reach GitHub and the archive.org metadata/listing pages through the page-fetch tool, but direct `curl`/`wget` downloads from `archive.org` and its storage subdomains fail. The 36.7 MB `AngryBirds.zip` binary has therefore **not** been downloaded. Metadata and the ZIP's internal listing are recorded in [PC_BASE_METADATA.md](PC_BASE_METADATA.md) and [PC_BASE_KEY_FILES.md](PC_BASE_KEY_FILES.md).
- The archive.org item's user reviews contain malware/DRM warnings. Do not execute `AngryBirds.exe` or `AppUpWrapper.dll` until provenance and safety are verified.
- A truly 100% accurate PC port requires the original asset bundle and, ideally, the original source or a compatible PC runtime. If only compiled binaries are supplied, exact behavioral parity cannot be guaranteed. The PC base is already a distinct Windows build with different script sizes and many more level packs than the IPA, so "accurate iOS 1.0 parity" requires explicit reconciliation, not a simple copy.
- Encrypted or DRM-protected IPA payloads may not be directly usable. Use only a payload that the rights holder is authorized and technically able to provide. The supplied IPA shows no `SC_Info`/`_CodeSignature` entries in its zip listing.

## Pipeline

### 1. Intake

Place authorized files in the gitignored `incoming/` directory:

```text
incoming/
  Angry Birds 1.0.ipa
  AngryBirds.zip
  LICENSE-or-permission.txt
  asset_mapping.json   # optional
```

### 2. Inventory

`tools/port_assets.py` extracts both packages into temporary directories, walks them, and records:

- relative path,
- SHA-256 hash,
- byte size,
- file class (image, audio, level/data, plist, binary, other).

The tool inventories the full IPA extraction and records the detected `Payload/*.app` bundle in the plan metadata. Mappings can use `strip_prefix` to remove that bundle prefix when copying into the PC base layout.

### 3. Reconciliation

The tool writes `port-plan.json` and `port-plan.md` describing:

- files present in both packages with identical hashes,
- same-path files with different hashes,
- same-basename files in different directories,
- files only in the IPA,
- files only in the PC base,
- aggregate counts and byte totals by class.

This plan is reviewed before any copying occurs.

### 4. Mapping

Copying requires an explicit mapping. A minimal mapping looks like this:

```json
{
  "strip_prefix": "Payload/Angry Birds.app/",
  "dest_prefix": "AngryBirds/Resources/",
  "exact": {
    "Payload/Angry Birds.app/Icon.png": "AngryBirds/Icon.png"
  }
}
```

Rules are applied in this order:

1. `exact[source]` if present,
2. otherwise `dest_prefix + source-without-strip_prefix`,
3. otherwise the file is skipped and listed as unmapped.

### 5. Rebuild

With `--apply`, `--i-have-rights`, and `--license-file`, the tool:

1. copies the extracted PC base to `out/pc-port/`,
2. copies the supplied license text to `out/pc-port/THIRD_PARTY_NOTICES.md`,
3. copies mapped IPA assets into the destination tree,
4. writes `BUILD_MANIFEST.json` and `SHA256SUMS`,
5. optionally creates a zip of the rebuilt tree.

Without those flags, the tool only produces the plan and never copies game files.

### 6. Validation

- Compare the rebuilt asset inventory against the plan.
- Verify that every mapped file exists and matches the recorded hash.
- Run the PC base smoke test if one is supplied.
- Record known differences in `COMPATIBILITY.md` rather than claiming unsupported parity.

### 7. Release

Only after the rights checklist passes:

```bash
git tag -a v1.0.0-pc -m "PC port v1.0.0"
git push origin arena/e2faf217-angrybirds1dot0pc --follow-tags
gh release create v1.0.0-pc \
  out/AngryBirds-PC-1.0.0.zip \
  out/SHA256SUMS \
  --title "Angry Birds 1.0 — PC port" \
  --notes-file docs/RELEASE_NOTES_TEMPLATE.md
```

If the authorization does not allow public distribution, the release step is skipped and the build is delivered privately to the rights holder.

## Accuracy targets

- **Asset parity:** identical licensed images, audio, and level data where permitted.
- **Behavioral parity:** match launch parameters, save paths, input mapping, and window behavior of the PC base.
- **Transparency:** document any unavoidable differences instead of overstating accuracy.
