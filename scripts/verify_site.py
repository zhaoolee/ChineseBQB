#!/usr/bin/env python3
"""Check the built project subpath, category lifecycle, and every local asset."""
from html.parser import HTMLParser
import json
from pathlib import Path
import sys
from urllib.parse import unquote, urljoin, urlsplit

ROOT = Path(__file__).resolve().parents[1]


def verify(public=ROOT / "public-hugo", base="https://zhaoolee.com/ChineseBQB/"):
    base_url = urlsplit(base)
    references = set()
    errors = []

    def check(value, page_url=base):
        if not value or value.startswith(("#", "data:", "blob:", "mailto:", "tel:")):
            return
        url = urlsplit(urljoin(page_url, value))
        if url.netloc != base_url.netloc:
            return
        if not url.path.startswith(base_url.path):
            # The author homepage is an intentional external navigation link.
            if url.path != "/":
                errors.append(f"Subpath escaped: {value}")
            return
        relative = unquote(url.path[len(base_url.path):])
        path = public / relative
        if url.path.endswith("/"):
            path /= "index.html"
        references.add(path)
        if not path.is_file():
            errors.append(f"Missing: {path.relative_to(public)} (from {page_url})")

    class Links(HTMLParser):
        def __init__(self, url):
            super().__init__()
            self.url = url

        def handle_starttag(self, tag, attrs):
            for key, value in attrs:
                if key in {"src", "href", "action", "data-src"}:
                    check(value, self.url)

    pages = list(public.rglob("*.html"))
    if not pages:
        raise ValueError("没有生成 HTML 页面")
    for path in pages:
        Links(urljoin(base, path.relative_to(public).as_posix())).feed(path.read_text(encoding="utf-8"))
    import re
    for path in public.rglob("*.css"):
        for match in re.findall(r"url\(['\"]?([^)'\"]+)", path.read_text(encoding="utf-8")):
            check(match, urljoin(base, path.relative_to(public).as_posix()))
    catalog = json.loads((public / "catalog/index.json").read_text())
    count = 0
    for category in catalog["categories"]:
        check(category["url"])
        if (public / "categories" / category["slug"]).exists():
            errors.append(f"Unexpected obsolete short route: {category['slug']}")
        images = json.loads((public / "catalog" / f"{category['slug']}.json").read_text())
        if len(images) != category["count"]:
            errors.append(f"Incorrect count: {category['slug']}")
        count += len(images)
        for image in images:
            check(image["src"])
            check(image["thumb"])
    search = json.loads((public / "catalog/search.json").read_text())
    for image in search:
        check(image["categoryUrl"])
    if count != catalog["total"] or len(search) != count:
        errors.append("Search index and category counts differ")
    if (public / "CNAME").exists():
        errors.append("Project site must inherit the account domain; do not publish a CNAME")
    if any(path.is_symlink() for path in public.rglob("*")):
        errors.append("Pages artifact contains symlinks")
    if errors:
        raise ValueError("\n".join(errors[:30]))
    print(f"验证通过：{len(pages)} 个 HTML 页面、{len(catalog['categories'])} 个分类、{count} 张图片、{len(references)} 个本地引用。")


if __name__ == "__main__":
    try:
        verify()
    except (ValueError, OSError) as error:
        sys.exit(str(error))
