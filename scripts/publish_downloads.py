#!/usr/bin/env python3
"""Publish generated ZIP assets and remove unused generated assets after deployment."""
import argparse
import base64
from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time

MANAGED_NAME = re.compile(r"(?:bqb-\d+|collection-[0-9a-f]{12})-[0-9a-f]{16}\.zip\Z")


def gh(*args):
    return subprocess.run(["gh", *args], check=True, capture_output=True, text=True).stdout


def api(endpoint):
    return json.loads(gh("api", endpoint))


def list_assets(repo, release_id):
    result, page = {}, 1
    while True:
        batch = api(f"repos/{repo}/releases/{release_id}/assets?per_page=100&page={page}")
        result.update((asset["name"], asset) for asset in batch)
        if len(batch) < 100:
            return result
        page += 1


def matches(remote, expected):
    return (remote is not None and remote.get("state") == "uploaded"
            and remote.get("size") == expected["size"]
            and remote.get("digest") == "sha256:" + expected["sha256"]
            and remote.get("browser_download_url") == expected["url"])


def publish(manifest, directory):
    repo, tag = manifest["repository"], manifest["tag"]
    try:
        release = api(f"repos/{repo}/releases/tags/{tag}")
    except subprocess.CalledProcessError as error:
        if "HTTP 404" not in error.stderr:
            raise
        notes = directory / "release-notes.md"
        notes.write_text("各 BQB 文件夹的 ZIP 合集由程序自动生成。\n\n"
                         "README 中的“直链下载”可直接下载对应合集，包含原始图片和文件名。\n",
                         encoding="utf-8")
        revision = os.environ.get("GITHUB_SHA") or subprocess.check_output(
            ["git", "rev-parse", "HEAD"], text=True).strip()
        gh("release", "create", tag, "--repo", repo, "--target", revision,
           "--title", "ChineseBQB 表情包 ZIP 下载", "--notes-file", str(notes), "--latest=false")
        release = api(f"repos/{repo}/releases/tags/{tag}")
    existing = list_assets(repo, release["id"])

    def upload(asset):
        remote = existing.get(asset["name"])
        if remote:
            if not matches(remote, asset):
                raise ValueError(f"已存在的 ZIP 与校验值不同：{asset['name']}")
            if remote.get("label") != asset["label"]:
                gh("api", "--method", "PATCH", f"repos/{repo}/releases/assets/{remote['id']}",
                   "-f", "label=" + asset["label"])
            return
        for attempt in range(3):
            try:
                gh("release", "upload", tag, str(directory / asset["name"]) + "#" + asset["label"],
                   "--repo", repo)
                print(f"已上传：{asset['label']}", flush=True)
                return
            except subprocess.CalledProcessError:
                # An upload may have succeeded despite an interrupted response.
                if matches(list_assets(repo, release["id"]).get(asset["name"]), asset):
                    return
                if attempt == 2:
                    raise
                time.sleep(2)

    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(upload, manifest["assets"]))
    uploaded = list_assets(repo, release["id"])
    for asset in manifest["assets"]:
        if not matches(uploaded.get(asset["name"]), asset):
            raise ValueError(f"ZIP 上传校验失败：{asset['name']}")
    print(f"{len(manifest['assets'])} 个 ZIP 直链已就绪，大小及 SHA-256 均一致。")


def prune(manifest):
    repo, tag = manifest["repository"], manifest["tag"]
    release = api(f"repos/{repo}/releases/tags/{tag}")
    # Keep everything referenced by either the just-deployed site or current README.
    # This also protects README when a newer source commit delayed its update.
    readme = base64.b64decode(api(f"repos/{repo}/readme")["content"]).decode()
    prefix = f"https://github.com/{repo}/releases/download/{tag}/"
    keep = {asset["name"] for asset in manifest["assets"]}
    keep.update(re.findall(re.escape(prefix) + r"([^\s)\"<>]+)", readme))
    removed = 0
    for name, asset in list_assets(repo, release["id"]).items():
        if MANAGED_NAME.fullmatch(name) and name not in keep:
            gh("api", "--method", "DELETE", f"repos/{repo}/releases/assets/{asset['id']}")
            removed += 1
    print(f"清理了 {removed} 个已不再引用的自动生成 ZIP。")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["publish", "prune"])
    parser.add_argument("--manifest", type=Path, required=True)
    args = parser.parse_args()
    try:
        manifest = json.loads(args.manifest.read_text())
        if not re.fullmatch(r"[\w.-]+/[\w.-]+", manifest["repository"]) or manifest["tag"] != "bqb-downloads":
            raise ValueError("无效的 ZIP 发布目标")
        if any(not MANAGED_NAME.fullmatch(asset["name"]) for asset in manifest["assets"]):
            raise ValueError("无效的自动生成 ZIP 文件名")
        if args.command == "publish":
            publish(manifest, args.manifest.parent)
        else:
            prune(manifest)
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        sys.exit(getattr(error, "stderr", None) or str(error))
