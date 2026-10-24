# Angry Birds 1.0 PC port workspace

This repository is being prepared for a PC port of the legacy iOS game. **No third-party game binaries, artwork, audio, or level data are included yet.**

> **Legal gate:** Angry Birds 1.0 and its associated assets are proprietary. Public availability on archive.org does not, by itself, grant redistribution rights. This project will only incorporate those materials after the repository owner supplies verifiable written permission or a suitable license. See [docs/RIGHTS_CHECKLIST.md](docs/RIGHTS_CHECKLIST.md).

## Current status

- GitHub remote: <https://github.com/rubiidev18alt/angrybirds1dot0pc>
- Working branch: `arena/e2faf217-angrybirds1dot0pc`
- archive.org downloads are blocked from this build sandbox, so the source packages must be supplied by the rights holder.
- A rights-gated inventory/reconciliation tool is available in [`tools/port_assets.py`](tools/port_assets.py).
- The repository currently has **no release**, because the required files and rights verification are still pending.

## What I need next

Please provide:

1. The original `Angry Birds 1.0.ipa` package, in a form you are authorized to use and redistribute.
2. The `AngryBirds.zip` PC base archive, or its extracted source/build tree.
3. Written permission or a license that explicitly covers public redistribution of the game binaries and assets on GitHub Releases.
4. Optional: an asset-mapping file if the PC base uses different paths or filenames than the IPA.

You can upload these as chat attachments, or push them to a private GitHub repository and grant `rubiidev18alt` access. Large binaries should preferably stay out of Git until the rights check passes; see `.gitignore`.

## Planned workflow

1. Verify the rights and license scope.
2. Inventory and hash the contents of both packages.
3. Generate a reconciliation plan: identical, missing, extra, and mismatched assets.
4. Apply an authorized mapping to rebuild the PC package.
5. Add build metadata, checksums, and a reproducible release script.
6. Tag the release and upload the PC build — **only if the supplied license permits public distribution**.

See [docs/PORTING_PLAN.md](docs/PORTING_PLAN.md) for the technical approach, [docs/RIGHTS_CHECKLIST.md](docs/RIGHTS_CHECKLIST.md) for the publication gate, [docs/PERMISSION_REQUEST_TEMPLATE.md](docs/PERMISSION_REQUEST_TEMPLATE.md) if you still need to obtain written authorization, and [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) for known differences.

## Validation

The rights-gated tooling has a synthetic self-test that never uses real game files:

```bash
python3 tools/test_port_assets.py
```

It is also run in GitHub Actions on pushes and pull requests.

*This repository is maintained by the project owner; this document is not legal advice.*
