#!/usr/bin/env python3
"""Generate a Hugo site from root-level *BQB folders; never edit source images."""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time
from urllib.parse import quote

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
EXTENSIONS = {".jpg", ".jpeg", ".jfif", ".png", ".gif", ".webp", ".avif", ".bmp"}
FORMATS = {"JPEG": "jpg", "PNG": "png", "GIF": "gif", "WEBP": "webp", "AVIF": "avif", "BMP": "bmp"}


def natural_key(value):
    return tuple((0, int(s)) if s.isdigit() else (1, s.casefold())
                 for s in re.split(r"(\d+)", str(value)))


def folders(root):
    return sorted((p for p in root.iterdir() if p.is_dir() and not p.is_symlink()
                   and not p.name.startswith(".") and p.name.lower().endswith("bqb")),
                  key=lambda p: natural_key(p.name), reverse=True)


def image_files(folder):
    return sorted((p for p in folder.rglob("*") if p.is_file() and not p.is_symlink()
                   and not any(part.startswith(".") for part in p.relative_to(folder).parts)
                   and not any((folder / parent).is_symlink() for parent in p.relative_to(folder).parents)
                   and p.suffix.lower() in EXTENSIONS),
                  key=lambda p: natural_key(p.relative_to(folder)))


def category_identity(name):
    # A compact internal data key; public URLs always use the complete folder name.
    match = re.match(r"^(\d+)", name)
    number = match.group(1) if match else ""
    slug = f"bqb-{number}" if number else "collection-" + hashlib.sha256(name.encode()).hexdigest()[:12]
    label = re.sub(r"BQB$", "", name, flags=re.IGNORECASE).strip("_ ")
    label = re.sub(r"^\d+[_ ]*", "", label)
    parts = re.split(r"[_ ]+", label)
    first_chinese = next((i for i, part in enumerate(parts) if re.search(r"[\u3400-\u9fff]", part)), None)
    if first_chinese is not None:
        # Only discard separate English prefix segments. Keep mixed names such as JOJO的奇妙冒险.
        label = " ".join(parts[first_chinese:])
    label = re.sub(r"[_ ]+", " ", label).strip() or name
    return slug, number, label


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


def page(path, metadata):
    path.parent.mkdir(parents=True, exist_ok=True)
    # JSON front matter handles quotes, emoji and punctuation in folder names.
    path.write_text(json.dumps(metadata, ensure_ascii=False) + "\n", encoding="utf-8")


def prepare_image(args):
    source, folder, output, cache = args
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    thumb = cache / f"{digest}.webp"
    with Image.open(source) as original:
        extension = FORMATS.get(original.format)
        if not extension:
            raise ValueError(f"Unsupported image format: {source}")
        animated = bool(getattr(original, "is_animated", False))
        width, height = original.size
        if not thumb.exists():
            preview = ImageOps.exif_transpose(original).convert("RGBA")
            preview.thumbnail((360, 300), Image.Resampling.LANCZOS)
            # Identical files can be processed concurrently; replace complete files atomically.
            import tempfile
            with tempfile.NamedTemporaryFile(dir=cache, suffix=".webp", delete=False) as tmp:
                temp = Path(tmp.name)
            try:
                preview.save(temp, "WEBP", quality=78, method=4)
                os.replace(temp, thumb)
            finally:
                temp.unlink(missing_ok=True)
    src = f"media/{digest}.{extension}"
    preview_src = f"thumbs/{digest}.webp"
    for origin, relative in ((source, src), (thumb, preview_src)):
        target = output / "static" / relative
        # Copy, not symlink/hardlink: Pages artifacts must contain regular files.
        if not target.exists():
            shutil.copyfile(origin, target)
    return {"id": hashlib.sha256(str(source.relative_to(folder)).encode()).hexdigest()[:20],
            "name": source.name, "path": source.relative_to(folder).as_posix(),
            "label": source.stem, "src": src, "thumb": preview_src,
            "width": width, "height": height, "animated": animated,
            "bytes": source.stat().st_size}


def generate(root=ROOT):
    output = root / ".hugo-generated"
    cache = root / ".hugo-cache" / "thumbs-v1"
    cache.mkdir(parents=True, exist_ok=True)
    # Only this generator's disposable output is removed, including deleted/renamed categories.
    if output.exists():
        shutil.rmtree(output)
    for name in ("media", "thumbs", "catalog"):
        (output / "static" / name).mkdir(parents=True, exist_ok=True)
    categories, all_images, seen, routes = [], [], set(), set()
    for folder in folders(root):
        slug, number, title = category_identity(folder.name)
        if slug in seen:
            raise ValueError(f"重复的分类编号 {number}：请为每个 BQB 文件夹使用不同编号。")
        seen.add(slug)
        route_name = folder.name.lower()
        if route_name in routes:
            raise ValueError(f"分类路径重复：{route_name}")
        routes.add(route_name)
        category_url = quote(route_name, safe="") + "/"
        files = image_files(folder)
        with ThreadPoolExecutor(max_workers=min(8, os.cpu_count() or 2)) as executor:
            images = list(executor.map(prepare_image, ((f, folder, output, cache) for f in files)))
        # Keep empty categories visible, so folder management has predictable results.
        cover = next((i for i in images if re.fullmatch(r"0*" + re.escape(number), Path(i["name"]).stem)
                      and number), images[0] if images else None)
        category = {"slug": slug, "number": number, "title": title, "folder": folder.name,
                    "count": len(images), "cover": cover, "url": category_url,
                    "bytes": sum(i["bytes"] for i in images)}
        categories.append(category)
        write_json(output / "data" / "galleries" / f"{slug}.json", images)
        write_json(output / "static" / "catalog" / f"{slug}.json", images)
        page(output / "content" / slug / "index.md",
             {"title": title, "type": "gallery", "slug": slug, "category": slug,
              "url": f"/{route_name}/",
              "description": f"{title}，共 {len(images)} 张表情包。在线预览、保存原图或打包下载。"})
        all_images.extend(dict(i, category=slug, categoryUrl=category_url,
                               categoryTitle=title, folder=folder.name) for i in images)
    # Highest numeric prefix first, then named community collections.
    categories.sort(key=lambda c: (bool(c["number"]), int(c["number"] or 0)), reverse=True)
    catalog = {"categories": categories, "total": len(all_images),
               "animated": sum(i["animated"] for i in all_images)}
    write_json(output / "data" / "catalog.json", catalog)
    write_json(output / "static" / "catalog" / "index.json", catalog)
    write_json(output / "static" / "catalog" / "search.json", all_images)
    page(output / "content" / "_index.md", {"title": "中国人的表情包"})
    page(output / "content" / "search.md", {"title": "搜索表情包", "layout": "search"})
    (output / "static" / ".nojekyll").touch()
    print(f"已生成 {len(categories)} 个分类、{len(all_images)} 张图片（{catalog['animated']} 张动图）。", flush=True)
    return catalog


def build(root=ROOT, base_url=None):
    generate(root)
    destination = root / "public-hugo"
    if destination.exists():
        shutil.rmtree(destination)
    command = ["hugo", "--source", str(root), "--minify", "--gc", "--noBuildLock",
               "--cacheDir", str(root / ".hugo-cache" / "hugo")]
    if base_url:
        command += ["--baseURL", base_url]
    subprocess.run(command, check=True)
    size = sum(p.stat().st_size for p in destination.rglob("*") if p.is_file())
    print(f"发布目录：{destination}（{size / 1024**2:.1f} MiB）", flush=True)
    if size >= 1_000_000_000:
        raise ValueError("站点超过 GitHub Pages 1 GB 限制，请先减少图片体积。")


def snapshot(root):
    paths = [p for d in folders(root) for p in image_files(d)]
    paths += [p for p in (root / "site").rglob("*") if p.is_file()]
    paths += [root / "hugo.toml"]
    return tuple((str(p.relative_to(root)), p.stat().st_mtime_ns, p.stat().st_size) for p in sorted(paths)), tuple(p.name for p in folders(root))


def serve(port):
    # Hugo serves the exact project subpath; the watcher regenerates folder metadata too.
    generate()
    proc = subprocess.Popen(["hugo", "server", "--bind", "127.0.0.1", "--port", str(port),
                             "--baseURL", f"http://localhost:{port}/ChineseBQB/", "--renderToMemory",
                             "--noBuildLock", "--disableFastRender", "--cacheDir",
                             str(ROOT / ".hugo-cache" / "hugo")], cwd=ROOT)
    state = snapshot(ROOT)
    try:
        while proc.poll() is None:
            time.sleep(1)
            current = snapshot(ROOT)
            if current != state:
                print("检测到目录或内容变化，正在重新生成…", flush=True)
                generate()
                state = current
    except KeyboardInterrupt:
        pass
    finally:
        proc.terminate()
        proc.wait()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["generate", "build", "serve"], nargs="?", default="build")
    parser.add_argument("--base-url")
    parser.add_argument("--port", type=int, default=1313)
    args = parser.parse_args()
    try:
        if args.command == "serve":
            serve(args.port)
        elif args.command == "generate":
            generate()
        else:
            build(base_url=args.base_url)
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        sys.exit(f"构建失败：{error}")
