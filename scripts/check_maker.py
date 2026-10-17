#!/usr/bin/env python3
"""Check that Maker was copied into the Pages artifact and the whole site stays under 1 GB."""
from html.parser import HTMLParser
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urljoin, urlsplit

ROOT = Path(__file__).resolve().parents[1]
LIMIT = 1_000_000_000
MODEL_FILES = (
    "models/PP-OCRv5_mobile_det_onnx_infer.tar",
    "models/PP-OCRv5_mobile_rec_onnx_infer.tar",
)
ASSET_RE = re.compile(r"""(?P<quote>['"])(?P<path>(?:/|\./|\.\./)[^"'\\\s]+?\.(?:js|css|wasm|mjs|onnx|json|svg|png|webp))(?P=quote)""")


def check(public=ROOT / "public-hugo", limit=LIMIT, base="https://zhaoolee.com/ChineseBQB/"):
    errors = []
    index = public / "maker" / "index.html"
    if not index.is_file():
        errors.append("Missing: maker/index.html")
    else:
        html = index.read_text(encoding="utf-8")
        if re.search(r"""(?:src|href)=['"]/assets/""", html):
            errors.append("Maker HTML references /assets outside /ChineseBQB/maker/")
        for relative in MODEL_FILES:
            if not (public / "maker" / relative).is_file():
                errors.append(f"Missing maker model: {relative}")
        seen = set()
        walk(index, public, base, seen, errors)
    if (public / "CNAME").exists():
        errors.append("Project site must inherit the account domain; do not publish a CNAME")
    if public.exists() and any(path.is_symlink() for path in public.rglob("*")):
        errors.append("Pages artifact contains symlinks")
    size = sum(path.stat().st_size for path in public.rglob("*") if path.is_file()) if public.exists() else 0
    if size >= limit:
        errors.append(f"public-hugo is {size} bytes, at or above the {limit} byte Pages limit")
    if errors:
        unique = list(dict.fromkeys(errors))
        raise ValueError("\n".join(unique))
    print(f"Maker 产物检查通过：public-hugo {size / 1024 ** 2:.1f} MiB，已包含 maker/index.html。")
    return size


def walk(path, public, base, seen, errors):
    if path in seen or not path.is_file():
        return
    if path.suffix.lower() not in {".html", ".css", ".js", ".mjs"}:
        return
    seen.add(path)
    text = path.read_text(encoding="utf-8", errors="ignore")
    page_url = urljoin(base, path.relative_to(public).as_posix())
    refs = []
    if path.suffix.lower() == ".html":
        class Refs(HTMLParser):
            def handle_starttag(self, tag, attrs):
                for key, value in attrs:
                    if key in {"src", "href"} and value:
                        refs.append(value)
        Refs().feed(text)
    for match in ASSET_RE.finditer(text):
        refs.append(match.group("path"))
    for value in refs:
        if not value or value.startswith(("#", "data:", "blob:", "mailto:")):
            continue
        if value.startswith(("http://", "https://")):
            continue
        url = urlsplit(urljoin(page_url, value))
        site = urlsplit(base)
        if url.netloc and url.netloc != site.netloc:
            continue
        if not url.path.startswith(site.path):
            errors.append(f"Maker asset escaped the site path: {value}")
            continue
        relative = unquote(url.path[len(site.path):]).split("?", 1)[0]
        if relative.endswith("/"):
            continue
        target = public / relative
        if not target.is_file():
            errors.append(f"Missing maker asset: {relative}")
            continue
        if target.suffix.lower() in {".html", ".css", ".js", ".mjs"}:
            walk(target, public, base, seen, errors)


if __name__ == "__main__":
    try:
        check()
    except (ValueError, OSError) as error:
        sys.exit(str(error))
