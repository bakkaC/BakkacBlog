#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path
from urllib.parse import unquote


LINK_RE = re.compile(r"\(([^)]+)\)")
IMAGE_RE = re.compile(r"!\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))")
HTML_IMAGE_RE = re.compile(r"<img\b[^>]*\bsrc=[\"']([^\"']+)[\"']", re.IGNORECASE)
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
        temp_dir = tempfile.TemporaryDirectory(prefix="bakka-import-")
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


def image_references(markdown: str) -> list[str]:
    """Return local Markdown image targets (without optional angle brackets)."""
    refs: list[str] = []
    for match in IMAGE_RE.finditer(markdown):
        raw = (match.group(1) or match.group(2) or "").strip()
        if raw and not raw.startswith(SKIP_PREFIXES):
            refs.append(raw)
    for match in HTML_IMAGE_RE.finditer(markdown):
        raw = match.group(1).strip()
        if raw and not raw.startswith(SKIP_PREFIXES):
            refs.append(raw)
    return refs


def collect_assets(export_dir: Path, markdown_dir: Path, markdown: str) -> list[tuple[str, Path]]:
    """Resolve every referenced local image, including single files and nested dirs."""
    assets: list[tuple[str, Path]] = []
    seen: set[Path] = set()
    for raw in image_references(markdown):
        target = (markdown_dir / unquote(raw.split("#", 1)[0].split("?", 1)[0])).resolve()
        try:
            target.relative_to(export_dir.resolve())
        except ValueError:
            continue
        if not target.exists() or target in seen:
            continue
        seen.add(target)
        assets.append((raw, target))
    return assets


def rewrite_links(markdown: str, assets: list[tuple[str, Path]], export_dir: Path, docname_url: str) -> str:
    if not assets:
        return markdown

    export_root = export_dir.resolve()
    mapping = {
        raw: f"assets/{docname_url}/{target.relative_to(export_root).as_posix().replace(' ', '%20')}"
        for raw, target in assets
    }
    mapping.update({
        raw.split("#", 1)[0].split("?", 1)[0]: value
        for raw, value in list(mapping.items())
    })

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
        if raw in mapping:
            return f"({prefix}{mapping[raw]}{suffix})"
        return match.group(0)

    rewritten = LINK_RE.sub(repl, markdown)

    def html_repl(match: re.Match[str]) -> str:
        raw = match.group(1).strip()
        clean = raw.split("#", 1)[0].split("?", 1)[0]
        if clean not in mapping:
            return match.group(0)
        replacement = mapping[clean] + raw[len(clean) :]
        return match.group(0).replace(raw, replacement, 1)

    return HTML_IMAGE_RE.sub(html_repl, rewritten)


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

        dest_md = dest_root / f"{docname}.mdx"
        if dest_md.exists():
            fail(f"markdown already exists: {dest_md}")

        dest_assets_base = dest_root / "assets" / docname
        if dest_assets_base.exists():
            fail(f"assets folder already exists: {dest_assets_base}")
        dest_assets_base.mkdir(parents=True, exist_ok=False)

        markdown = md_path.read_text(encoding="utf-8")
        assets = collect_assets(export_dir, md_path.parent, markdown)

        shutil.copy2(md_path, dest_md)
        for raw, target in assets:
            destination = dest_assets_base / target.relative_to(export_dir.resolve())
            destination.parent.mkdir(parents=True, exist_ok=True)
            if target.is_dir():
                shutil.copytree(target, destination, dirs_exist_ok=True)
            else:
                shutil.copy2(target, destination)

        updated = rewrite_links(markdown, assets, export_dir, docname_url)
        dest_md.write_text(updated, encoding="utf-8")

        print("Imported:")
        print(f"- Markdown: {dest_md}")
        if assets:
            print(f"- Assets: {dest_assets_base}")
            print(f"- Asset files: {len(assets)}")
        else:
            print("- Assets: none detected")
    finally:
        if temp_dir is not None:
            temp_dir.cleanup()


if __name__ == "__main__":
    main()
