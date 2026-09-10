#!/usr/bin/env python3
"""Render the README directory from the published catalog, or apply that directory."""
import argparse
from html import escape
import json
from pathlib import Path
import re
import sys
from urllib.parse import quote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
START = "<!-- BQB-DIRECTORY:START -->"
END = "<!-- BQB-DIRECTORY:END -->"


def markdown_text(value):
    value = escape(value).replace("|", "&#124;").replace("\n", " ").replace("\r", " ")
    return re.sub(r"([\\`*_\[\]])", r"\\\1", value)


def render_directory(catalog, base_url):
    base = urlsplit(base_url)
    if base.scheme != "https" or not base.netloc or base.query or base.fragment:
        raise ValueError("README 必须使用正式 HTTPS 网站地址。")
    base_url = base_url.rstrip("/") + "/"
    categories = catalog["categories"]
    if sum(c["count"] for c in categories) != catalog["total"]:
        raise ValueError("README 分类数量与网站总数不一致。")
    lines = [
        f"## 表情包目录（共收录 {catalog['total']} 张表情包） / Sticker directory",
        "",
        f"> 根据 BQB 文件夹自动更新，共 {len(categories)} 个分类。点击“直链下载”即可获取该分类的 ZIP 合集。",
        "",
        "| 示例 / Preview | 分类入口 / Browse | 下载 / Download |",
        "| :---: | :---: | :---: |",
    ]
    for category in categories:
        if category["url"] != quote(category["folder"].lower(), safe="") + "/":
            raise ValueError(f"分类路由与完整文件夹名不符：{category['folder']}")
        url = base_url + category["url"]
        cover = category["cover"]
        preview = (f'<img src="{escape(base_url + cover["thumb"], quote=True)}" '
                   f'height="100" alt="{escape(category["title"], quote=True).replace("|", "&#124;")}" />'
                   if cover else "暂无图片")
        label = markdown_text(category["folder"])
        download = f"[直链下载]({category['download']})" if category["count"] else "暂无图片"
        lines.append(f"| {preview} | [{label}（{category['count']} 张）]({url}) | {download} |")
    return "\n".join(lines) + "\n"


def apply_directory(readme, directory):
    if readme.count(START) != 1 or readme.count(END) != 1:
        raise ValueError("README 必须且只能包含一组 BQB-DIRECTORY 标记。")
    start, end = readme.index(START) + len(START), readme.index(END)
    if start > end or START in directory or END in directory:
        raise ValueError("README 自动目录边界无效。")
    return readme[:start] + "\n\n" + directory.strip() + "\n\n" + readme[end:]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["generate", "apply"])
    parser.add_argument("--catalog", type=Path, default=ROOT / "public-hugo/catalog/index.json")
    parser.add_argument("--directory", type=Path, default=ROOT / ".hugo-generated/readme-directory.md")
    parser.add_argument("--readme", type=Path, default=ROOT / "README.md")
    parser.add_argument("--base-url")
    args = parser.parse_args()
    if args.command == "generate":
        if not args.base_url:
            parser.error("generate 需要 --base-url，使用 hugo.toml 的正式网站地址")
        directory = render_directory(json.loads(args.catalog.read_text(encoding="utf-8")), args.base_url)
        # Check the boundary before publishing, while preserving manually written sections.
        apply_directory(args.readme.read_text(encoding="utf-8"), directory)
        args.directory.parent.mkdir(parents=True, exist_ok=True)
        args.directory.write_text(directory, encoding="utf-8")
        print(f"已生成 README 自动目录：{args.directory}")
    else:
        previous = args.readme.read_text(encoding="utf-8")
        updated = apply_directory(previous, args.directory.read_text(encoding="utf-8"))
        if updated != previous:
            args.readme.write_text(updated, encoding="utf-8")
            print("README 分类目录已更新。")
        else:
            print("README 分类目录已是最新，无需更新。")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError) as error:
        sys.exit(f"README 更新失败：{error}")
