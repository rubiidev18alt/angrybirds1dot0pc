#!/usr/bin/env python3
"""Build a release zip containing only the original Slingstone game files."""

from __future__ import annotations

import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "dist"
OUT_DIR.mkdir(exist_ok=True)
ZIP_PATH = OUT_DIR / "Slingstone-1.0.1.zip"

FILES = [
    "index.html",
    "style.css",
    "game.js",
    "LICENSE",
    "README.md",
    "NOTICE.md",
    "THIRD_PARTY_NOTICES.md",
    "docs/GAME_DESIGN.md",
    "docs/RELEASE_NOTES_SLINGSTONE.md",
]


def main() -> int:
    with zipfile.ZipFile(ZIP_PATH, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for rel in FILES:
            path = ROOT / rel
            if not path.is_file():
                raise SystemExit(f"Missing required release file: {path}")
            zf.write(path, f"Slingstone-1.0.1/{rel}")
    print(f"Wrote {ZIP_PATH} ({ZIP_PATH.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
