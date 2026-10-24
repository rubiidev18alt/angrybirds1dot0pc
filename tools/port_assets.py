#!/usr/bin/env python3
"""Rights-gated asset reconciliation for an authorized IPA and PC base package.

By default this tool only inventories and compares the two packages. It will
refuse to copy any game files unless the caller supplies an explicit rights
confirmation, a non-empty license file, and an asset mapping.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
import tempfile
import zipfile
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

TOOL_VERSION = "0.1.0"

IGNORED_DIR_NAMES = {"__MACOSX", ".git", "__pycache__", ".svn", ".hg"}
IGNORED_FILE_NAMES = {".DS_Store", "Thumbs.db"}

IMAGE_SUFFIXES = {
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tif", ".tiff", ".webp",
    ".pvr", ".ktx", ".dds", ".svg",
}
AUDIO_SUFFIXES = {
    ".wav", ".mp3", ".caf", ".aac", ".ogg", ".oga", ".m4a", ".aiff",
    ".aif", ".flac", ".mid", ".midi",
}
DATA_SUFFIXES = {
    ".xml", ".json", ".plist", ".dat", ".bin", ".lua", ".txt", ".csv",
    ".level", ".scene", ".physics", ".atlas", ".fnt", ".tmx", ".yaml",
    ".yml", ".ini", ".cfg", ".conf", ".res", ".pak",
}
BINARY_SUFFIXES = {
    ".exe", ".dll", ".so", ".dylib", ".o", ".a", ".lib", ".nib",
    ".storyboardc", ".mom", ".momd", ".framework", ".appex", ".ico",
}
ARCHIVE_SUFFIXES = {".zip", ".ipa", ".apk", ".jar", ".7z", ".tar", ".gz"}


@dataclass(frozen=True)
class FileRecord:
    path: str
    sha256: str
    size: int
    file_class: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def is_ignored(rel: Path) -> bool:
    if any(part in IGNORED_DIR_NAMES for part in rel.parts):
        return True
    if rel.name in IGNORED_FILE_NAMES:
        return True
    return False


def iter_files(root: Path) -> Iterable[tuple[Path, str]]:
    for path in sorted(root.rglob("*")):
        if path.is_symlink() or not path.is_file():
            continue
        rel = path.relative_to(root)
        if is_ignored(rel):
            continue
        yield path, rel.as_posix()


def classify_file(path: Path) -> str:
    name = path.name.lower()
    suffix = path.suffix.lower()

    if name.endswith(".pvr.ccz") or name.endswith(".pvr.gz"):
        return "image"
    if suffix in IMAGE_SUFFIXES:
        return "image"
    if suffix in AUDIO_SUFFIXES:
        return "audio"
    if suffix in DATA_SUFFIXES:
        return "data"
    if suffix in BINARY_SUFFIXES:
        return "binary"
    if suffix in ARCHIVE_SUFFIXES:
        return "archive"
    if suffix == "":
        return "binary?"
    return "other"


def build_inventory(root: Path) -> list[FileRecord]:
    records: list[FileRecord] = []
    for path, rel in iter_files(root):
        records.append(
            FileRecord(
                path=rel,
                sha256=sha256_file(path),
                size=path.stat().st_size,
                file_class=classify_file(path),
            )
        )
    return records


def safe_extract_zip(archive: Path, dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive) as zf:
        for member in zf.infolist():
            member_path = Path(member.filename)
            if member_path.is_absolute() or ".." in member_path.parts:
                raise ValueError(f"Unsafe path in archive: {member.filename!r}")

            target = dest / member_path
            if member.is_dir():
                target.mkdir(parents=True, exist_ok=True)
                continue

            target.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(member) as src, target.open("wb") as dst:
                shutil.copyfileobj(src, dst)

            unix_mode = (member.external_attr >> 16) & 0o777
            if unix_mode & 0o111:
                current = target.stat().st_mode
                target.chmod(current | (unix_mode & 0o111))


def find_app_bundle(root: Path) -> Path | None:
    direct = sorted(p for p in root.glob("Payload/*.app") if p.is_dir())
    if direct:
        return direct[0]

    nested = sorted(
        p for p in root.rglob("*.app")
        if p.is_dir() and not is_ignored(p.relative_to(root))
    )
    if nested:
        return nested[0]
    return None


def summarize(inventory: list[FileRecord]) -> dict[str, Any]:
    counts: Counter[str] = Counter(record.file_class for record in inventory)
    bytes_by_class: defaultdict[str, int] = defaultdict(int)
    for record in inventory:
        bytes_by_class[record.file_class] += record.size

    return {
        "files": len(inventory),
        "bytes": sum(record.size for record in inventory),
        "by_class": dict(sorted(counts.items())),
        "bytes_by_class": dict(sorted(bytes_by_class.items())),
    }


def reconcile(
    ipa_inventory: list[FileRecord],
    base_inventory: list[FileRecord],
) -> dict[str, Any]:
    ipa_by_path = {record.path: record for record in ipa_inventory}
    base_by_path = {record.path: record for record in base_inventory}
    ipa_paths = set(ipa_by_path)
    base_paths = set(base_by_path)

    common = sorted(ipa_paths & base_paths)
    identical = [
        {
            "path": path,
            "sha256": ipa_by_path[path].sha256,
            "size": ipa_by_path[path].size,
            "file_class": ipa_by_path[path].file_class,
        }
        for path in common
        if ipa_by_path[path].sha256 == base_by_path[path].sha256
    ]
    different = [
        {
            "path": path,
            "ipa_sha256": ipa_by_path[path].sha256,
            "base_sha256": base_by_path[path].sha256,
            "ipa_size": ipa_by_path[path].size,
            "base_size": base_by_path[path].size,
            "file_class": ipa_by_path[path].file_class,
        }
        for path in common
        if ipa_by_path[path].sha256 != base_by_path[path].sha256
    ]

    ipa_only = sorted(ipa_paths - base_paths)
    base_only = sorted(base_paths - ipa_paths)

    ipa_by_basename: defaultdict[str, list[FileRecord]] = defaultdict(list)
    base_by_basename: defaultdict[str, list[FileRecord]] = defaultdict(list)
    for record in ipa_inventory:
        ipa_by_basename[Path(record.path).name].append(record)
    for record in base_inventory:
        base_by_basename[Path(record.path).name].append(record)

    basename_matches: list[dict[str, Any]] = []
    existing_pairs: set[tuple[str, str]] = set()
    for basename in sorted(set(ipa_by_basename) & set(base_by_basename)):
        for ipa_record in ipa_by_basename[basename]:
            for base_record in base_by_basename[basename]:
                if ipa_record.path == base_record.path:
                    continue
                pair = (ipa_record.path, base_record.path)
                if pair in existing_pairs:
                    continue
                existing_pairs.add(pair)
                basename_matches.append(
                    {
                        "basename": basename,
                        "ipa_path": ipa_record.path,
                        "base_path": base_record.path,
                        "same_hash": ipa_record.sha256 == base_record.sha256,
                        "ipa_sha256": ipa_record.sha256,
                        "base_sha256": base_record.sha256,
                    }
                )

    return {
        "summary": {
            "ipa": summarize(ipa_inventory),
            "base": summarize(base_inventory),
            "identical": len(identical),
            "different": len(different),
            "ipa_only": len(ipa_only),
            "base_only": len(base_only),
            "basename_matches_different_paths": len(basename_matches),
        },
        "identical": identical,
        "different": different,
        "ipa_only": [
            ipa_by_path[path].to_dict() for path in ipa_only
        ],
        "base_only": [
            base_by_path[path].to_dict() for path in base_only
        ],
        "basename_matches": basename_matches,
    }


def write_plan_markdown(plan: dict[str, Any], inputs: dict[str, Any], path: Path) -> None:
    summary = plan["summary"]
    lines: list[str] = [
        "# Port reconciliation plan",
        "",
        f"- Generated: {plan['generated_at']}",
        f"- Tool version: {plan['tool_version']}",
        f"- IPA: `{inputs.get('ipa')}`",
        f"- PC base: `{inputs.get('base')}`",
        f"- IPA app bundle: `{inputs.get('ipa_app_bundle') or 'not found; inventoried whole IPA'}`",
        "",
        "## Summary",
        "",
        "| Metric | IPA | PC base |",
        "| --- | ---: | ---: |",
        f"| Files | {summary['ipa']['files']} | {summary['base']['files']} |",
        f"| Bytes | {summary['ipa']['bytes']} | {summary['base']['bytes']} |",
        "",
        "| Reconciliation | Count |",
        "| --- | ---: |",
        f"| Identical path + hash | {summary['identical']} |",
        f"| Same path, different hash | {summary['different']} |",
        f"| Only in IPA | {summary['ipa_only']} |",
        f"| Only in PC base | {summary['base_only']} |",
        f"| Same basename, different path | {summary['basename_matches_different_paths']} |",
        "",
    ]

    def add_section(title: str, items: list[Any], formatter: Any, limit: int = 50) -> None:
        lines.extend([f"## {title} ({len(items)})", ""])
        if not items:
            lines.extend(["_None._", ""])
            return
        for item in items[:limit]:
            lines.append(f"- {formatter(item)}")
        if len(items) > limit:
            lines.append(f"- … and {len(items) - limit} more (see JSON).")
        lines.append("")

    add_section(
        "Identical files",
        plan["identical"],
        lambda r: f"`{r['path']}` — `{r['sha256'][:12]}` ({r['size']} B, {r['file_class']})",
    )
    add_section(
        "Same path, different hash",
        plan["different"],
        lambda r: (
            f"`{r['path']}` — IPA `{r['ipa_sha256'][:12]}` ({r['ipa_size']} B) "
            f"vs base `{r['base_sha256'][:12]}` ({r['base_size']} B)"
        ),
    )
    add_section(
        "Only in IPA",
        plan["ipa_only"],
        lambda r: f"`{r['path']}` — `{r['sha256'][:12]}` ({r['size']} B, {r['file_class']})",
    )
    add_section(
        "Only in PC base",
        plan["base_only"],
        lambda r: f"`{r['path']}` — `{r['sha256'][:12]}` ({r['size']} B, {r['file_class']})",
    )
    add_section(
        "Same basename in different directories",
        plan["basename_matches"],
        lambda r: (
            f"`{r['ipa_path']}` ↔ `{r['base_path']}` "
            f"({'same hash' if r['same_hash'] else 'different hash'})"
        ),
    )

    path.write_text("\n".join(lines), encoding="utf-8")


@dataclass(frozen=True)
class AssetMapping:
    strip_prefix: str
    dest_prefix: str
    exact: dict[str, str]

    @classmethod
    def load(cls, path: Path) -> "AssetMapping":
        data = json.loads(path.read_text(encoding="utf-8"))
        strip_prefix = str(data.get("strip_prefix", "")).replace("\\", "/")
        dest_prefix = str(data.get("dest_prefix", "")).replace("\\", "/")
        if dest_prefix and not dest_prefix.endswith("/"):
            dest_prefix += "/"

        exact_raw = data.get("exact", {})
        if not isinstance(exact_raw, dict):
            raise ValueError("mapping 'exact' must be an object")
        exact = {
            str(key).replace("\\", "/"): str(value).replace("\\", "/")
            for key, value in exact_raw.items()
        }

        return cls(strip_prefix=strip_prefix, dest_prefix=dest_prefix, exact=exact)

    def destination_for(self, source: str) -> str | None:
        if source in self.exact:
            return self.exact[source]
        if self.strip_prefix and source.startswith(self.strip_prefix):
            relative = source[len(self.strip_prefix):].lstrip("/")
            return f"{self.dest_prefix}{relative}" if self.dest_prefix else relative
        return None

    def to_dict(self) -> dict[str, Any]:
        return {
            "strip_prefix": self.strip_prefix,
            "dest_prefix": self.dest_prefix,
            "exact": self.exact,
        }


def copy_tree_filtered(src: Path, dst: Path) -> None:
    if dst.exists():
        shutil.rmtree(dst)

    def ignore(_directory: str, names: list[str]) -> list[str]:
        return [
            name for name in names
            if name in IGNORED_DIR_NAMES or name in IGNORED_FILE_NAMES
        ]

    shutil.copytree(src, dst, ignore=ignore, dirs_exist_ok=True)


def write_checksums(out_dir: Path) -> Path:
    checksum_path = out_dir / "SHA256SUMS"
    lines: list[str] = []
    for path in sorted(out_dir.rglob("*")):
        if path.is_symlink() or not path.is_file() or path == checksum_path:
            continue
        rel = path.relative_to(out_dir).as_posix()
        lines.append(f"{sha256_file(path)}  {rel}")
    checksum_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return checksum_path


def apply_mapping(
    *,
    ipa_root: Path,
    base_root: Path,
    ipa_inventory: list[FileRecord],
    mapping: AssetMapping,
    license_file: Path,
    out_dir: Path,
    make_zip: bool,
    inputs: dict[str, Any],
    plan: dict[str, Any],
) -> dict[str, Any]:
    pc_port = out_dir / "pc-port"
    copy_tree_filtered(base_root, pc_port)

    license_text = license_file.read_text(encoding="utf-8", errors="replace").strip()
    notices = (
        "# Third-party notices\n\n"
        "The following authorization was supplied for this build.\n\n"
        "---\n\n"
        f"{license_text}\n"
    )
    (pc_port / "THIRD_PARTY_NOTICES.md").write_text(notices, encoding="utf-8")

    applied: list[dict[str, Any]] = []
    unmapped: list[str] = []
    for record in ipa_inventory:
        source_path = ipa_root / record.path
        if not source_path.is_file():
            unmapped.append(record.path)
            continue

        destination = mapping.destination_for(record.path)
        if destination is None:
            unmapped.append(record.path)
            continue

        target = pc_port / destination
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_path, target)

        if sha256_file(target) != record.sha256:
            raise RuntimeError(f"Hash mismatch after copy: {record.path} -> {destination}")

        applied.append(
            {
                "from": record.path,
                "to": destination,
                "sha256": record.sha256,
                "size": record.size,
                "file_class": record.file_class,
            }
        )

    manifest: dict[str, Any] = {
        "tool_version": TOOL_VERSION,
        "generated_at": utc_now(),
        "rights_confirmation_supplied": True,
        "license_file": str(license_file),
        "license_sha256": sha256_file(license_file),
        "mapping": mapping.to_dict(),
        "inputs": inputs,
        "plan_summary": plan["summary"],
        "applied_count": len(applied),
        "unmapped_count": len(unmapped),
        "applied": applied,
        "unmapped": unmapped,
        "output_tree": str(pc_port),
    }
    (out_dir / "BUILD_MANIFEST.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    if make_zip:
        zip_path = out_dir / "AngryBirds-PC-1.0.0.zip"
        if zip_path.exists():
            zip_path.unlink()
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            for path in sorted(pc_port.rglob("*")):
                if path.is_symlink() or not path.is_file():
                    continue
                zf.write(path, path.relative_to(pc_port).as_posix())

    write_checksums(out_dir)
    return manifest


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Inventory and reconcile an authorized IPA against a PC base package.",
    )
    parser.add_argument("--ipa", required=True, type=Path, help="Path to the authorized .ipa file.")
    parser.add_argument("--base", required=True, type=Path, help="Path to the PC base .zip or extracted directory.")
    parser.add_argument("--out-dir", default=Path("out"), type=Path, help="Directory for plans, manifests, and builds.")
    parser.add_argument("--plan-dir", dest="plan_dir", type=Path, default=None, help="Deprecated alias for --out-dir.")
    parser.add_argument("--mapping", type=Path, help="JSON mapping required for --apply.")
    parser.add_argument("--license-file", type=Path, help="Written authorization/license text required for --apply.")
    parser.add_argument("--i-have-rights", action="store_true", help="Confirm you have rights to copy and redistribute the inputs.")
    parser.add_argument("--apply", action="store_true", help="Copy mapped IPA assets into a rebuilt PC tree.")
    parser.add_argument("--zip", action="store_true", help="With --apply, also create AngryBirds-PC-1.0.0.zip.")
    parser.add_argument("--dry-run", action="store_true", help="Force plan-only mode even if --apply is present.")
    return parser.parse_args(argv)


def validate_apply_args(args: argparse.Namespace) -> None:
    if not args.i_have_rights:
        raise SystemExit("ERROR: --apply requires --i-have-rights. See docs/RIGHTS_CHECKLIST.md.")
    if args.mapping is None:
        raise SystemExit("ERROR: --apply requires --mapping.")
    if not args.mapping.is_file():
        raise SystemExit(f"ERROR: mapping file not found: {args.mapping}")
    if args.license_file is None:
        raise SystemExit("ERROR: --apply requires --license-file.")
    if not args.license_file.is_file():
        raise SystemExit(f"ERROR: license file not found: {args.license_file}")
    if args.license_file.stat().st_size == 0:
        raise SystemExit("ERROR: license file is empty.")
    if args.zip and not args.apply:
        raise SystemExit("ERROR: --zip requires --apply.")


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    out_dir = args.plan_dir or args.out_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    if not args.ipa.is_file():
        raise SystemExit(f"ERROR: IPA not found: {args.ipa}")
    if not args.base.exists():
        raise SystemExit(f"ERROR: PC base not found: {args.base}")

    do_apply = args.apply and not args.dry_run
    if do_apply:
        validate_apply_args(args)

    with tempfile.TemporaryDirectory(prefix="port-assets-") as tmp:
        tmp_root = Path(tmp)
        ipa_extract = tmp_root / "ipa"
        safe_extract_zip(args.ipa, ipa_extract)
        app_bundle = find_app_bundle(ipa_extract)
        # Inventory the full IPA extraction so paths line up with the PC base
        # archive. The detected bundle is recorded in the inputs metadata and
        # can be stripped via the mapping's `strip_prefix`.
        ipa_source_root = ipa_extract

        if args.base.is_dir():
            base_root = args.base.resolve()
        else:
            base_root = tmp_root / "base"
            safe_extract_zip(args.base, base_root)

        ipa_inventory = build_inventory(ipa_source_root)
        base_inventory = build_inventory(base_root)
        plan = reconcile(ipa_inventory, base_inventory)

        inputs: dict[str, Any] = {
            "ipa": str(args.ipa),
            "base": str(args.base),
            "ipa_app_bundle": (
                str(app_bundle.relative_to(ipa_extract).as_posix())
                if app_bundle is not None
                else None
            ),
            "base_is_directory": args.base.is_dir(),
        }
        plan_with_meta = {
            "tool_version": TOOL_VERSION,
            "generated_at": utc_now(),
            "inputs": inputs,
            **plan,
        }

        plan_json = out_dir / "port-plan.json"
        plan_md = out_dir / "port-plan.md"
        plan_json.write_text(
            json.dumps(plan_with_meta, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        write_plan_markdown(plan_with_meta, inputs, plan_md)

        print(f"Wrote {plan_json}")
        print(f"Wrote {plan_md}")
        print(
            "Plan summary: "
            f"identical={plan['summary']['identical']}, "
            f"different={plan['summary']['different']}, "
            f"ipa_only={plan['summary']['ipa_only']}, "
            f"base_only={plan['summary']['base_only']}"
        )

        if do_apply:
            mapping = AssetMapping.load(args.mapping)
            manifest = apply_mapping(
                ipa_root=ipa_source_root,
                base_root=base_root,
                ipa_inventory=ipa_inventory,
                mapping=mapping,
                license_file=args.license_file,
                out_dir=out_dir,
                make_zip=args.zip,
                inputs=inputs,
                plan=plan,
            )
            print(
                f"Applied {manifest['applied_count']} files; "
                f"{manifest['unmapped_count']} unmapped; "
                f"output: {manifest['output_tree']}"
            )
            if args.zip:
                print(f"Created {out_dir / 'AngryBirds-PC-1.0.0.zip'}")
            print(f"Wrote {out_dir / 'BUILD_MANIFEST.json'}")
            print(f"Wrote {out_dir / 'SHA256SUMS'}")
        elif args.apply and args.dry_run:
            print("Dry run: --apply was supplied but --dry-run forced plan-only mode.")
        else:
            print("Plan-only mode. Supply --apply, --i-have-rights, --license-file, and --mapping to rebuild.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
