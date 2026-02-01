#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path


LINK_RE = re.compile(r"\(([^)]+)\)")
SKIP_PREFIXES = ("http://", "https://", "mailto:", "data:", "#")


def fail(message: str) -> None:
    print(f"Error: {message}", file=sys.stderr)
    raise SystemExit(1)


def pick_export_dir(root: Path) -> Path:
    entries = [p for p in root.iterdir() if p.name != ".DS_Store"]
    if len(entries) == 1 and entries[0].is_dir():
        return entries[0]
    return root


def extract_source(source: Path) -> tuple[Path, tempfile.TemporaryDirectory | None]:
    if source.is_dir():
        return source, None
    if source.is_file() and source.suffix.lower() == ".zip":
        temp_dir = tempfile.TemporaryDirectory(prefix="candycore-import-")
        with zipfile.ZipFile(source, "r") as zip_ref:
            zip_ref.extractall(temp_dir.name)
        export_dir = pick_export_dir(Path(temp_dir.name))
        return export_dir, temp_dir
    fail(f"source not found or unsupported: {source}")
    return source, None


def find_single_md(export_dir: Path) -> Path:
    md_files = [p for p in export_dir.rglob("*.md") if p.is_file()]
    if len(md_files) != 1:
        hint = "\n".join(str(p) for p in md_files[:10])
        fail(
            "expected exactly 1 markdown file; found "
            f"{len(md_files)}.\n{hint}"
        )
    return md_files[0]


def collect_asset_dirs(export_dir: Path, markdown: str) -> list[str]:
    candidates: set[str] = set()
    for match in LINK_RE.finditer(markdown):
        raw = match.group(1).strip()
        if not raw:
            continue
        if raw.startswith("<") and raw.endswith(">"):
            raw = raw[1:-1].strip()
        if raw.startswith(SKIP_PREFIXES):
            continue
        if raw.startswith("./"):
            raw = raw[2:]
        head = raw.split("/", 1)[0]
        if head:
            candidates.add(head)
    asset_dirs = [d for d in candidates if (export_dir / d).is_dir()]
    return sorted(asset_dirs)


def rewrite_links(markdown: str, asset_dirs: list[str], docname_url: str) -> str:
    if not asset_dirs:
        return markdown

    def repl(match: re.Match[str]) -> str:
        raw = match.group(1).strip()
        if not raw:
            return match.group(0)
        prefix = suffix = ""
        if raw.startswith("<") and raw.endswith(">"):
            raw = raw[1:-1].strip()
            prefix, suffix = "<", ">"
        if raw.startswith(SKIP_PREFIXES):
            return match.group(0)
        if raw.startswith("./"):
            raw = raw[2:]
        for seg in asset_dirs:
            if raw.startswith(seg + "/"):
                new_url = f"assets/{docname_url}/{raw}"
                return f"({prefix}{new_url}{suffix})"
        return match.group(0)

    return LINK_RE.sub(repl, markdown)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Import a single-note export into src/content/{notes|blogs|thoughts}."
    )
    parser.add_argument("source", help="Export folder or zip file")
    parser.add_argument(
        "--to",
        choices=["notes", "blogs", "thoughts"],
        default="notes",
        help="Destination collection (default: notes)",
    )
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    dest_root = repo_root / "src" / "content" / args.to
    if not dest_root.is_dir():
        fail(f"destination not found: {dest_root}")

    export_dir, temp_dir = extract_source(Path(args.source).expanduser())
    try:
        md_path = find_single_md(export_dir)
        docname = md_path.stem
        docname_url = docname.replace(" ", "%20")

        dest_md = dest_root / f"{docname}.md"
        if dest_md.exists():
            fail(f"markdown already exists: {dest_md}")

        dest_assets_base = dest_root / "assets" / docname
        if dest_assets_base.exists():
            fail(f"assets folder already exists: {dest_assets_base}")
        dest_assets_base.mkdir(parents=True, exist_ok=False)

        markdown = md_path.read_text(encoding="utf-8")
        asset_dirs = collect_asset_dirs(export_dir, markdown)

        shutil.copy2(md_path, dest_md)
        for asset_dir in asset_dirs:
            shutil.copytree(export_dir / asset_dir, dest_assets_base / asset_dir)

        updated = rewrite_links(markdown, asset_dirs, docname_url)
        dest_md.write_text(updated, encoding="utf-8")

        print("Imported:")
        print(f"- Markdown: {dest_md}")
        if asset_dirs:
            print(f"- Assets: {dest_assets_base}")
            print(f"- Asset folders: {', '.join(asset_dirs)}")
        else:
            print("- Assets: none detected")
    finally:
        if temp_dir is not None:
            temp_dir.cleanup()


if __name__ == "__main__":
    main()
