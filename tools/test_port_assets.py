#!/usr/bin/env python3
"""Self-test for port_assets.py using synthetic, non-game placeholder files."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "tools" / "port_assets.py"


def make_zip(path: Path, files: dict[str, bytes]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for name, data in files.items():
            zf.writestr(name, data)


def run(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, *cmd],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=True,
    )


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="port-assets-test-") as tmp:
        tmp_path = Path(tmp)
        ipa = tmp_path / "TestGame.ipa"
        base = tmp_path / "TestBase.zip"
        license_file = tmp_path / "LICENSE.txt"
        mapping = tmp_path / "asset_mapping.json"
        out_dir = tmp_path / "out"

        make_zip(
            ipa,
            {
                "Payload/TestGame.app/Icon.png": b"fake-png-icon",
                "Payload/TestGame.app/audio/theme.wav": b"fake-wav-audio",
                "Payload/TestGame.app/levels/level1.xml": b"<level>1</level>",
                "Payload/TestGame.app/Info.plist": b"fake-plist",
                "iTunesMetadata.plist": b"metadata",
            },
        )
        make_zip(
            base,
            {
                # Same path as the IPA, same bytes -> "identical".
                "Payload/TestGame.app/audio/theme.wav": b"fake-wav-audio",
                # Same path as the IPA, different bytes -> "different".
                "Payload/TestGame.app/Icon.png": b"old-png-icon",
                # Base-only files.
                "TestBase/Game.exe": b"fake-exe",
                "TestBase/Resources/extra.dat": b"base-only-data",
            },
        )
        license_file.write_text(
            "Synthetic test authorization. Placeholder only.\n",
            encoding="utf-8",
        )
        mapping.write_text(
            json.dumps(
                {
                    "strip_prefix": "Payload/TestGame.app/",
                    "dest_prefix": "TestBase/Resources/",
                    "exact": {
                        "Payload/TestGame.app/Icon.png": "TestBase/Icon.png",
                        "iTunesMetadata.plist": "TestBase/Metadata/iTunesMetadata.plist",
                    },
                },
                indent=2,
            ),
            encoding="utf-8",
        )

        plan_run = run(
            [
                str(SCRIPT),
                "--ipa", str(ipa),
                "--base", str(base),
                "--out-dir", str(out_dir),
            ]
        )
        assert "Plan-only mode" in plan_run.stdout, plan_run.stdout

        plan_json = json.loads((out_dir / "port-plan.json").read_text(encoding="utf-8"))
        assert plan_json["summary"]["identical"] >= 1, plan_json["summary"]
        assert plan_json["summary"]["different"] >= 1, plan_json["summary"]
        assert plan_json["summary"]["ipa_only"] >= 1, plan_json["summary"]
        assert plan_json["summary"]["base_only"] >= 1, plan_json["summary"]
        assert not (out_dir / "pc-port").exists(), "plan-only mode must not copy assets"

        apply_run = run(
            [
                str(SCRIPT),
                "--ipa", str(ipa),
                "--base", str(base),
                "--out-dir", str(out_dir),
                "--mapping", str(mapping),
                "--license-file", str(license_file),
                "--i-have-rights",
                "--apply",
                "--zip",
            ]
        )
        assert "Applied 5 files" in apply_run.stdout, apply_run.stdout

        rebuilt = out_dir / "pc-port"
        assert (rebuilt / "TestBase" / "Icon.png").read_bytes() == b"fake-png-icon"
        assert (rebuilt / "TestBase" / "Resources" / "audio" / "theme.wav").read_bytes() == b"fake-wav-audio"
        assert (rebuilt / "TestBase" / "Resources" / "levels" / "level1.xml").read_bytes() == b"<level>1</level>"
        assert (rebuilt / "THIRD_PARTY_NOTICES.md").is_file()
        assert (out_dir / "AngryBirds-PC-1.0.0.zip").is_file()
        assert (out_dir / "BUILD_MANIFEST.json").is_file()
        assert (out_dir / "SHA256SUMS").is_file()

        manifest = json.loads((out_dir / "BUILD_MANIFEST.json").read_text(encoding="utf-8"))
        assert manifest["rights_confirmation_supplied"] is True
        assert manifest["applied_count"] == 5, manifest
        assert manifest["unmapped_count"] == 0, manifest

        denied = subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "--ipa", str(ipa),
                "--base", str(base),
                "--out-dir", str(tmp_path / "denied-out"),
                "--apply",
            ],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        assert denied.returncode != 0, "apply without rights must fail"
        assert "--i-have-rights" in denied.stderr, denied.stderr

        print("All synthetic port_assets.py tests passed.")
        return 0


if __name__ == "__main__":
    sys.exit(main())
