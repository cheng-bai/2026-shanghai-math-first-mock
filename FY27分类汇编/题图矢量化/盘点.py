#!/usr/bin/env python3
import csv
import hashlib
import json
import re
from collections import defaultdict
from pathlib import Path
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parents[2]
SCAN_ROOT = ROOT / "FY27分类汇编"
OUT_DIR = ROOT / "FY27分类汇编" / "题图矢量化"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".svg", ".gif", ".webp"}
IMAGE_URL = re.compile(r"""https?://[^\s"')]+""", re.I)


def relative(path):
    return path.resolve().relative_to(ROOT).as_posix()


def normalized_url(value):
    value = html_unescape(value.strip())
    if not value or value.startswith(("data:", "javascript:", "#")):
        return None
    if value.startswith(("http://", "https://", "//")):
        parsed = urlparse(value if not value.startswith("//") else "https:" + value)
        return unquote(parsed.path).lstrip("/")
    return unquote(value.split("?", 1)[0].split("#", 1)[0])


def html_unescape(value):
    return (
        value.replace("&amp;", "&")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
    )


def resolve_reference(source, value):
    target = normalized_url(value)
    if not target:
        return None
    candidate = (source.parent / target).resolve()
    try:
        return candidate.relative_to(ROOT).as_posix()
    except ValueError:
        return None


def extract_sources(text):
    sources = []
    for match in re.finditer(r"""<img\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1""", text, re.I | re.S):
        sources.append(("img", match.group(2)))
    for match in re.finditer(r"""url\(\s*(["']?)(.*?)\1\s*\)""", text, re.I | re.S):
        sources.append(("css", match.group(2)))
    for match in re.finditer(r"""["']([^"']+\.(?:jpe?g|png|svg|gif|webp)(?:\?[^"']*)?)["']""", text, re.I):
        if match.group(1).startswith(("./", "../", "/")):
            sources.append(("script", match.group(1)))
    for match in IMAGE_URL.finditer(text):
        sources.append(("remote", match.group(0)))
    return sources


def image_kind(path):
    name = Path(path).name.lower()
    if Path(path).suffix.lower() == ".svg":
        return "已矢量"
    if "解析" in name or "solution" in name:
        return "解析图候选"
    return "题图候选"


def page_kind(path):
    name = Path(path).name
    if "学生版" in name:
        return "学生版"
    if "教师版" in name or "教师" in name:
        return "教师版"
    if path.endswith(".js") or path.endswith(".css"):
        return "共享资源"
    return "解析页"


def question_from_context(text, position):
    before = text[:position]
    ids = re.findall(r"""\bid\s*=\s*["']q(\d+)["']""", before, re.I)
    return "q" + ids[-1] if ids else ""


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()[:16]


def dimensions(path):
    try:
        from PIL import Image

        with Image.open(path) as image:
            return f"{image.width}x{image.height}"
    except Exception:
        return ""


def main():
    pages = sorted(
        path
        for path in SCAN_ROOT.rglob("*")
        if path.is_file() and path.suffix.lower() in {".html", ".js", ".css"}
    )
    image_files = sorted(
        path
        for path in SCAN_ROOT.rglob("*")
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    )
    image_paths = {relative(path) for path in image_files}
    references = []
    by_image = defaultdict(list)
    by_ext = defaultdict(int)
    by_page_kind = defaultdict(int)

    for page in pages:
        text = page.read_text(encoding="utf-8", errors="replace")
        page_rel = relative(page)
        for source_kind, value in extract_sources(text):
            target = resolve_reference(page, value)
            if not target or Path(target).suffix.lower() not in IMAGE_EXTENSIONS:
                continue
            position = text.find(value)
            item = {
                "page": page_rel,
                "source_kind": source_kind,
                "reference": value.strip(),
                "image": target,
                "question": question_from_context(text, position) if position >= 0 else "",
                "page_kind": page_kind(page_rel),
            }
            references.append(item)
            by_image[target].append(item)

        if page_rel.endswith("阅读模板/阅读.js"):
            script_dir = SCAN_ROOT / "images"
            for source_path, target_name in re.findall(
                r"""['"]([^'"]+\.(?:jpe?g|png))['"]\s*:\s*['"]([^'"]+\.svg)['"]""", text, re.I
            ):
                original = resolve_reference(page, "../images/" + source_path)
                replacement = resolve_reference(page, "../images/" + target_name)
                for target, role in ((original, "动态原图"), (replacement, "动态替换")):
                    if not target:
                        continue
                    references.append(
                        {
                            "page": page_rel,
                            "source_kind": role,
                            "reference": source_path if target == original else target_name,
                            "image": target,
                            "question": "q15",
                            "page_kind": "共享资源",
                        }
                    )
                    by_image[target].append(references[-1])

    file_data = {}
    for path in image_files:
        rel = relative(path)
        file_data[rel] = {
            "path": rel,
            "format": path.suffix.lower().lstrip("."),
            "sha256": sha256(path),
            "dimensions": dimensions(path),
            "referenced": "是" if rel in by_image else "否",
            "reference_count": len(by_image.get(rel, [])),
            "kind": image_kind(rel),
        }
        by_ext[file_data[rel]["format"]] += len(by_image.get(rel, []))

    for item in references:
        by_page_kind[item["page_kind"]] += 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with (OUT_DIR / "图片文件盘点.csv").open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["图片路径", "格式", "SHA256", "尺寸", "分类", "被引用", "引用次数"],
        )
        writer.writeheader()
        for rel, data in sorted(file_data.items()):
            writer.writerow(
                {
                    "图片路径": rel,
                    "格式": data["format"],
                    "SHA256": data["sha256"],
                    "尺寸": data["dimensions"],
                    "分类": data["kind"],
                    "被引用": data["referenced"],
                    "引用次数": data["reference_count"],
                }
            )

    with (OUT_DIR / "清单.csv").open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "原图路径",
                "使用页面",
                "题号",
                "引用来源",
                "引用值",
                "题干或解析",
                "教师版或学生版",
                "图形类型",
                "是否已是矢量",
                "目标SVG",
                "SHA256",
                "尺寸",
                "存在",
                "引用说明",
                "处理和核验状态",
                "问题说明",
            ],
        )
        writer.writeheader()
        for rel in sorted(by_image):
            data = file_data.get(rel)
            if data is None:
                path = ROOT / rel
                data = {
                    "format": path.suffix.lower().lstrip("."),
                    "sha256": sha256(path) if path.exists() else "",
                    "dimensions": dimensions(path) if path.exists() else "",
                    "kind": "" if path.exists() else "引用缺失",
                }
            for item in sorted(by_image[rel], key=lambda row: (row["page"], row["question"])):
                writer.writerow(
                    {
                        "原图路径": rel,
                        "使用页面": item["page"],
                        "题号": item["question"],
                        "引用来源": item["source_kind"],
                        "引用值": item["reference"],
                        "题干或解析": "解析图候选" if "解析" in data["kind"] else "题图候选",
                        "教师版或学生版": item["page_kind"],
                        "图形类型": "待分类",
                        "是否已是矢量": "是" if data["format"] == "svg" else "否",
                        "目标SVG": "",
                        "SHA256": data["sha256"],
                        "尺寸": data["dimensions"],
                        "存在": "是" if path.exists() else "否",
                        "引用说明": "相对路径",
                        "处理和核验状态": "已矢量化" if data["format"] == "svg" else "待盘点",
                        "问题说明": "" if path.exists() else "引用目标不存在",
                    }
                )

    summary = {
        "pages": len(pages),
        "references": len(references),
        "unique_referenced": len(by_image),
        "missing": sorted(set(item["image"] for item in references) - image_paths),
        "all_image_files": len(image_files),
        "unreferenced_image_files": len(image_paths - set(by_image)),
        "by_ext": dict(by_ext),
        "by_pagekind": dict(by_page_kind),
        "source_kinds": {
            kind: sum(1 for item in references if item["source_kind"] == kind)
            for kind in sorted({item["source_kind"] for item in references})
        },
    }
    (OUT_DIR / "盘点汇总.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
