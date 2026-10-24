# Angry Birds 1.0 PC port workspace

This repository is being prepared for a PC port of the legacy iOS game. **No third-party game binaries, artwork, audio, or level data are included yet.**

> **Legal gate:** Angry Birds 1.0 and its associated assets are proprietary. Public availability on archive.org does not, by itself, grant redistribution rights. This project will only incorporate those materials after the repository owner supplies verifiable written permission or a suitable license. See [docs/RIGHTS_CHECKLIST.md](docs/RIGHTS_CHECKLIST.md).

## Current status

- GitHub remote: <https://github.com/rubiidev18alt/angrybirds1dot0pc>
- Working branch: `arena/e2faf217-angrybirds1dot0pc`
- The IPA was uploaded to `origin/master` (commit `8363b44`) and has been inventoried locally in the gitignored `incoming/` directory. It is **not** committed to this branch and is **not** published.
- archive.org metadata and the PC ZIP's internal listing are reachable through the page-fetch tool, but the 36.7 MB `AngryBirds.zip` binary cannot be downloaded from this sandbox with `curl`/`wget`. It still needs to be uploaded to the repo or attached in chat.
- A rights-gated inventory/reconciliation tool is available in [`tools/port_assets.py`](tools/port_assets.py).
- Written permission/license allowing public redistribution is still missing.
- The repository currently has **no release**, because the PC base file and rights verification are still pending.

See [docs/IPA_INVENTORY.md](docs/IPA_INVENTORY.md), [docs/PC_BASE_METADATA.md](docs/PC_BASE_METADATA.md), and [docs/PC_BASE_KEY_FILES.md](docs/PC_BASE_KEY_FILES.md) for the intake findings.

## What I need next

The IPA has been received and inventoried locally (see [docs/IPA_INVENTORY.md](docs/IPA_INVENTORY.md)). Still needed:

1. The `AngryBirds.zip` PC base archive (36.7 MB), uploaded to this repo or attached in chat. The sandbox cannot download it from archive.org directly, despite being able to read the item metadata and ZIP listing.
2. Written permission or a license that explicitly covers public redistribution of the game binaries and assets on GitHub Releases.
3. Optional: an asset-mapping file if the PC base uses different paths or filenames than the IPA.

You can upload these as chat attachments, or push them to this repository and tell me the branch/commit. Large binaries should preferably stay out of Git until the rights check passes; see `.gitignore`.

## Planned workflow

1. Verify the rights and license scope.
2. Inventory and hash the contents of both packages.
3. Generate a reconciliation plan: identical, missing, extra, and mismatched assets.
4. Apply an authorized mapping to rebuild the PC package.
5. Add build metadata, checksums, and a reproducible release script.
6. Tag the release and upload the PC build — **only if the supplied license permits public distribution**.

See [docs/PORTING_PLAN.md](docs/PORTING_PLAN.md) for the technical approach, [docs/RIGHTS_CHECKLIST.md](docs/RIGHTS_CHECKLIST.md) for the publication gate, [docs/PERMISSION_DOCUMENTS_INDEX.md](docs/PERMISSION_DOCUMENTS_INDEX.md) for the draft permission/agreement documents (Markdown and PDF), and [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) for known differences.

## Validation

The rights-gated tooling has a synthetic self-test that never uses real game files:

```bash
python3 tools/test_port_assets.py
```

It is also run in GitHub Actions on pushes and pull requests.

*This repository is maintained by the project owner; this document is not legal advice.*
