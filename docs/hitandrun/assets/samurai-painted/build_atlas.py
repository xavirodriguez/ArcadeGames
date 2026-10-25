#!/usr/bin/env python3
"""Build the painted-samurai candidate atlas from `assets/sprites/samurai1.png`.

The source is a key-pose sheet, not a production atlas: five loose rows with
different frame counts, mixed facing, baked blood and a detached slash VFX.
This script turns it into a deterministic, engine-shaped 512x320 atlas:

  * 8 columns x 5 rows, 64x64 cells, 40 frames
  * anchor (0.5, 0.94) -> feet baseline at cell y = 60
  * right-facing (attack/hurt/death source poses are mirrored)
  * straight-alpha PNG-32, no baked background
  * shared scale, shared baseline, per-frame torso centring

Frame ranges follow the engine contract used by
`src/games/hitandrun/rendering/SamuraiVisualAssets.ts`:

  idle   0-7    walk 8-15    attack 16-23
  hurt  24-29   empty 30-31  death 32-39

The source does not contain 8/8/8/6/8 distinct poses, so the map uses four
documented holds and reuses source poses across clips. See README.md §5.

Usage:
  python3 docs/hitandrun/assets/samurai-painted/build_atlas.py
  python3 docs/hitandrun/assets/samurai-painted/build_atlas.py --check
"""

from __future__ import annotations

import argparse
import json
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

_FONTS: dict[int, ImageFont.FreeTypeFont | ImageFont.ImageFont] = {}


def label_font(size: int = 13):
    """Scalable default font when Pillow supports it; bitmap fallback otherwise."""
    if size not in _FONTS:
        try:
            _FONTS[size] = ImageFont.load_default(size=size)
        except (AttributeError, TypeError):
            _FONTS[size] = ImageFont.load_default()
    return _FONTS[size]

# ---------------------------------------------------------------------------
# Contract
# ---------------------------------------------------------------------------
CELL = 64
COLS = 8
ROWS = 5
FRAMES = COLS * ROWS
SCALE = 0.40          # 140 px source height -> 56 px cell height
FEET_Y = 60           # cell y where the feet/shadow baseline lands
SAFE = 2              # documented safe area (see README for VFX exceptions)

SRC_SIZE = (1408, 768)

# Row bands and frame x-ranges verified by column-projection segmentation.
# Touching frames (VFX fused to the body) were merged by hand; the detector
# output is deliberately not trusted for row 3 because the slash arc connects
# several poses.
BANDS = [
    (20, 160),   # idle
    (178, 305),  # run
    (316, 462),  # attack + hurt
    (468, 602),  # run + hurt
    (612, 752),  # idle + hurt/death + splatter
]
RANGES = [
    [(49, 140), (185, 276), (325, 416), (459, 550), (589, 680), (723, 815)],
    [(37, 138), (171, 277), (313, 416), (449, 563), (591, 695), (725, 830),
     (863, 973), (1002, 1098), (1129, 1238)],
    [(39, 148), (188, 337), (336, 480), (479, 662), (661, 830), (877, 1014),
     (1044, 1141), (1157, 1271)],
    [(46, 156), (216, 326), (372, 478), (528, 634), (786, 877), (929, 1020),
     (1084, 1179), (1226, 1332)],
    [(44, 132), (181, 265), (319, 411), (456, 557), (592, 710), (755, 875),
     (910, 1028), (1069, 1193), (1209, 1370)],
]

# 40-cell map: (source_row_index, source_frame_index) or None for empty cells.
CLIP_MAP = {
    "idle": [
        (0, 0), (0, 1), (0, 2), (0, 3), (0, 4), (0, 5),
        (0, 4), (0, 5),                      # holds: source only has 6 idles
    ],
    "walk": [
        (1, 0), (1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7),
    ],                                        # source has 9 runs; frame 8 dropped
    "attack": [
        (2, 0), (2, 1), (2, 2), (2, 3), (2, 3), (2, 4), (2, 6), (2, 6),
    ],                                        # impact hold + guard recovery hold
    "hurt": [
        (3, 5), (3, 4), (2, 5), (4, 4), (2, 7), (2, 6),
    ],
    "empty": [None, None],
    "death": [
        (4, 4), (4, 5), (4, 6), (4, 7), (4, 7), (4, 7), (4, 7), (4, 7),
    ],                                        # fall + four-frame corpse hold
}
FLIPPED_CLIPS = {"attack", "hurt", "death"}
CLIP_ORDER = ["idle", "walk", "attack", "hurt", "empty", "death"]

ANIMATIONS = {
    "idle": {"frames": list(range(0, 8)), "frameRate": 8, "loop": True},
    "walk": {"frames": list(range(8, 16)), "frameRate": 10, "loop": True},
    "attack": {"frames": list(range(16, 24)), "frameRate": 14, "loop": False},
    "hurt": {"frames": list(range(24, 30)), "frameRate": 16, "loop": False},
    "death": {"frames": list(range(32, 40)), "frameRate": 10, "loop": False},
}
ANCHOR = {"x": 0.5, "y": 0.94}


# ---------------------------------------------------------------------------
# Small deterministic raster helpers (Pillow only; no numpy/scipy dependency)
# ---------------------------------------------------------------------------
def premultiplied_resize(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Resize RGBA without pulling the transparent (near-black) background into edges."""
    src = image.convert("RGBA")
    rgba = list(src.getdata())
    premul = [
        (
            round(r * a / 255),
            round(g * a / 255),
            round(b * a / 255),
            a,
        )
        for r, g, b, a in rgba
    ]
    pm = Image.new("RGBA", src.size)
    pm.putdata(premul)
    pm = pm.resize(size, Image.LANCZOS)
    out = []
    for r, g, b, a in pm.getdata():
        if a == 0:
            out.append((0, 0, 0, 0))
        else:
            out.append(
                (
                    max(0, min(255, round(r * 255 / a))),
                    max(0, min(255, round(g * 255 / a))),
                    max(0, min(255, round(b * 255 / a))),
                    a,
                )
            )
    result = Image.new("RGBA", size)
    result.putdata(out)
    return result


def largest_component_mask(image: Image.Image) -> Image.Image:
    """Mask of the largest alpha component, dilated by 1 px to keep soft edges.

    Drops detached shadows, slash-arc tails, blood specks and neighbouring
    frame fragments without hardening the brush edge.
    """
    alpha = image.getchannel("A")
    width, height = image.size
    pixels = alpha.load()
    solid = [[pixels[x, y] > 64 for x in range(width)] for y in range(height)]
    seen = [[False] * width for _ in range(height)]
    best: list[tuple[int, int]] = []

    for y in range(height):
        for x in range(width):
            if not solid[y][x] or seen[y][x]:
                continue
            queue = deque([(y, x)])
            seen[y][x] = True
            points: list[tuple[int, int]] = []
            while queue:
                cy, cx = queue.popleft()
                points.append((cy, cx))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = cy + dy, cx + dx
                        if (
                            0 <= ny < height
                            and 0 <= nx < width
                            and solid[ny][nx]
                            and not seen[ny][nx]
                        ):
                            seen[ny][nx] = True
                            queue.append((ny, nx))
            if len(points) > len(best):
                best = points

    mask = Image.new("L", (width, height), 0)
    mask_px = mask.load()
    for y, x in best:
        mask_px[x, y] = 255
    return mask.filter(ImageFilter.MaxFilter(3))


def source_bbox(row: int, frame: int, alpha: Image.Image) -> tuple[int, int, int, int]:
    """Tight content bbox for one source frame, restricted to its row band."""
    x0, x1 = RANGES[row][frame]
    y0, y1 = BANDS[row]
    crop = alpha.crop((x0, y0, x1 + 1, y1 + 1))
    bbox = crop.getbbox()
    if bbox is None:
        raise ValueError(f"source row {row} frame {frame} is empty")
    return (x0 + bbox[0], y0 + bbox[1], x0 + bbox[2], y0 + bbox[3])


def head_anchor(image: Image.Image) -> float:
    """Median x of the top 18 % opaque band; used for the lunging attack poses."""
    alpha = image.getchannel("A")
    width, height = image.size
    band_h = max(4, int(height * 0.18))
    xs = [
        x
        for y in range(band_h)
        for x in range(width)
        if alpha.getpixel((x, y)) > 128
    ]
    if len(xs) < 6:
        return width / 2
    xs.sort()
    return float(xs[len(xs) // 2])


def margins(alpha: Image.Image, threshold: int = 64) -> dict[str, int] | None:
    crop = alpha.point(lambda v: 255 if v > threshold else 0)
    bbox = crop.getbbox()
    if bbox is None:
        return None
    x0, y0, x1, y1 = bbox
    return {"left": x0, "top": y0, "right": CELL - x1, "bottom": CELL - y1}


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
def build(src_path: Path) -> tuple[Image.Image, list[dict]]:
    source = Image.open(src_path).convert("RGBA")
    if source.size != SRC_SIZE:
        raise SystemExit(
            f"unexpected source size {source.size}; this frame map was verified "
            f"against {SRC_SIZE}. Refusing to build."
        )

    atlas = Image.new("RGBA", (COLS * CELL, ROWS * CELL), (0, 0, 0, 0))
    cells: list[dict] = []
    seen_sources: dict[tuple[int, int, bool], int] = {}
    seen_in_clip: dict[tuple[str, int, int, bool], int] = {}
    index = 0

    for clip in CLIP_ORDER:
        for clip_frame, source_ref in enumerate(CLIP_MAP[clip]):
            if source_ref is None:
                cells.append({"index": index, "clip": clip, "source": None})
                index += 1
                continue

            row, frame = source_ref
            flip = clip in FLIPPED_CLIPS
            bbox = source_bbox(row, frame, source.getchannel("A"))
            crop = source.crop(bbox)

            mask = largest_component_mask(crop)
            crop.putalpha(
                Image.composite(
                    crop.getchannel("A"), Image.new("L", crop.size, 0), mask
                )
            )
            masked_bbox = crop.getbbox()
            if masked_bbox is None:
                raise SystemExit(f"masking removed all content: row {row} frame {frame}")
            crop = crop.crop(masked_bbox)

            sw, sh = crop.size
            nw = max(1, round(sw * SCALE))
            nh = max(1, round(sh * SCALE))
            cell_image = premultiplied_resize(crop, (nw, nh))
            if flip:
                cell_image = cell_image.transpose(Image.FLIP_LEFT_RIGHT)

            # Attack poses lunge; anchoring the head keeps the body from
            # swimming while the fused slash arc changes width. Every other
            # clip is centred on its masked silhouette.
            anchor_x = head_anchor(cell_image) if clip == "attack" else nw / 2
            offset_x = round(CELL / 2 - anchor_x)
            offset_y = FEET_Y - nh
            if offset_y < 0:
                raise SystemExit(
                    f"frame {clip}[{clip_frame}] is {nh}px tall; exceeds the 60px "
                    "usable height. Reduce SCALE."
                )

            cell = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
            cell.alpha_composite(cell_image, (offset_x, offset_y))
            atlas.alpha_composite(cell, ((index % COLS) * CELL, (index // COLS) * CELL))

            key = (row, frame, flip)
            clip_key = (clip, row, frame, flip)
            duplicate_of = seen_sources.get(key)
            hold_of = seen_in_clip.get(clip_key)
            if duplicate_of is None:
                seen_sources[key] = index
            if hold_of is None:
                seen_in_clip[clip_key] = index

            cells.append(
                {
                    "index": index,
                    "clip": clip,
                    "clip_frame": clip_frame,
                    "source": {"row": row + 1, "frame": frame, "bbox": list(bbox)},
                    "masked_bbox": list(masked_bbox),
                    "flip_x": flip,
                    "size": [nw, nh],
                    "offset": [offset_x, offset_y],
                    "duplicate_of": duplicate_of,
                    "hold_of": hold_of,
                }
            )
            index += 1

    if index != FRAMES:
        raise SystemExit(f"frame map produced {index} cells, expected {FRAMES}")
    return atlas, cells


# ---------------------------------------------------------------------------
# Metadata
# ---------------------------------------------------------------------------
def source_inventory(source: Image.Image, cells: list[dict]) -> list[dict]:
    """Every source segment (used and unused), so the selection is auditable."""
    used: dict[tuple[int, int], list[int]] = {}
    for cell in cells:
        if not cell.get("source"):
            continue
        key = (cell["source"]["row"], cell["source"]["frame"])
        used.setdefault(key, []).append(cell["index"])

    alpha = source.getchannel("A")
    inventory = []
    for row, ranges in enumerate(RANGES):
        for frame in range(len(ranges)):
            bbox = source_bbox(row, frame, alpha)
            inventory.append(
                {
                    "row": row + 1,
                    "frame": frame,
                    "bbox": list(bbox),
                    "used_by": used.get((row + 1, frame), []),
                }
            )
    return inventory


def frame_rect(index: int) -> dict[str, int]:
    return {
        "x": (index % COLS) * CELL,
        "y": (index // COLS) * CELL,
        "w": CELL,
        "h": CELL,
    }


def atlas_json() -> dict:
    frames = {}
    for clip in CLIP_ORDER:
        if clip == "empty":
            for i in (30, 31):
                frames[f"empty_{i}.png"] = atlas_entry(i)
            continue
        for i in ANIMATIONS[clip]['frames']:
            frames[f"{clip}_{i - ANIMATIONS[clip]['frames'][0]:02d}.png"] = atlas_entry(i)
    return {
        "meta": {
            "image": "samurai-painted.png",
            "format": "RGBA8888",
            "size": {"w": COLS * CELL, "h": ROWS * CELL},
            "scale": "1",
            "cellSize": CELL,
            "columns": COLS,
            "rows": ROWS,
            "pivot": ANCHOR,
            "generator": "docs/hitandrun/assets/samurai-painted/build_atlas.py",
            "status": "candidate",
        },
        "frames": frames,
    }


def atlas_entry(index: int) -> dict:
    rect = frame_rect(index)
    return {
        "frame": rect,
        "rotated": False,
        "trimmed": False,
        "spriteSourceSize": {"x": 0, "y": 0, "w": CELL, "h": CELL},
        "sourceSize": {"w": CELL, "h": CELL},
        "pivot": ANCHOR,
    }


def animations_json() -> dict:
    order = []
    for clip in CLIP_ORDER:
        if clip == "empty":
            order += ["empty_30.png", "empty_31.png"]
            continue
        start = ANIMATIONS[clip]["frames"][0]
        order += [f"{clip}_{i - start:02d}.png" for i in ANIMATIONS[clip]["frames"]]
    return {
        "cellSize": CELL,
        "columns": COLS,
        "rows": ROWS,
        "anchor": ANCHOR,
        "animations": ANIMATIONS,
        "frameOrder": order,
    }


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


# ---------------------------------------------------------------------------
# Previews
# ---------------------------------------------------------------------------
PAPER = (232, 227, 212, 255)
INK = (23, 24, 23, 255)
GRAY = (128, 128, 128, 255)


def on_background(atlas: Image.Image, color: tuple[int, int, int, int]) -> Image.Image:
    base = Image.new("RGBA", atlas.size, color)
    base.alpha_composite(atlas)
    return base.convert("RGB")


def contact_sheet(atlas: Image.Image, path: Path, zoom: int = 3) -> None:
    label_h = 28
    width = COLS * CELL * zoom
    height = ROWS * CELL * zoom + label_h
    sheet = Image.new("RGB", (width, height), PAPER[:3])
    draw = ImageDraw.Draw(sheet)

    enlarged = on_background(atlas, PAPER).resize(
        (width, ROWS * CELL * zoom), Image.NEAREST
    )
    sheet.paste(enlarged, (0, label_h))

    for index in range(FRAMES):
        cx = (index % COLS) * CELL * zoom
        cy = (index // COLS) * CELL * zoom + label_h
        draw.rectangle(
            [cx, cy, cx + CELL * zoom - 1, cy + CELL * zoom - 1],
            outline=(190, 180, 160),
        )
        draw.text((cx + 3, cy + 2), f"{index}", fill=(150, 30, 30), font=label_font(11))

    draw.text(
        (6, 7),
        "samurai-painted candidate | 512x320 | 8x5 | 64px cells | facing right | "
        "idle 0-7  walk 8-15  attack 16-23  hurt 24-29  empty 30-31  death 32-39",
        fill=(40, 40, 40),
        font=label_font(12),
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(path)


def context_mock(atlas: Image.Image, path: Path) -> None:
    """Synthetic 800x600 context, not an engine capture.

    Shows the 64px sprites at 1:1 on paper, over a wash horizon and on a solid
    ink mass. It is a review aid, not evidence of an in-engine check.
    """
    width, height = 800, 600
    # RGBA draws on an RGBA image replace pixels instead of blending, and the
    # later convert("RGB") would then drop alpha. Keep the canvas RGB and paste
    # sprites through their own alpha mask instead.
    canvas = Image.new("RGB", (width, height), PAPER)
    draw = ImageDraw.Draw(canvas, "RGBA")

    # Distant ink washes.
    draw.polygon(
        [(0, 300), (110, 210), (210, 285), (330, 175), (470, 270), (610, 195),
         (800, 280), (800, 360), (0, 360)],
        fill=(23, 24, 23, 16),
    )
    draw.polygon(
        [(0, 360), (150, 300), (300, 345), (470, 270), (650, 330), (800, 300),
         (800, 390), (0, 390)],
        fill=(23, 24, 23, 28),
    )
    draw.polygon(
        [(0, 420), (180, 370), (360, 410), (560, 360), (800, 400), (800, 470), (0, 470)],
        fill=(23, 24, 23, 44),
    )

    # Ground band.
    draw.rectangle([0, 470, width, height], fill=(220, 214, 194, 255))
    draw.line([0, 470, width, 470], fill=(58, 58, 53, 120), width=2)

    # Torn ink mass on the right third, tall enough to sit *behind* the two
    # contrast sprites (their heads reach ~y=410 at 1:1).
    draw.polygon(
        [(492, 600), (492, 386), (520, 372), (556, 392), (594, 368), (628, 388),
         (668, 370), (706, 390), (748, 374), (800, 392), (800, 600)],
        fill=(23, 24, 23, 238),
    )

    def place(cell: int, cx: int, feet: int) -> None:
        # Soft contact shadow so 1:1 sprites read as grounded.
        draw.ellipse(
            [cx - 19, feet - 3, cx + 19, feet + 4],
            fill=(23, 24, 23, 46),
        )
        sprite = atlas.crop(
            ((cell % COLS) * CELL, (cell // COLS) * CELL,
             (cell % COLS) * CELL + CELL, (cell // COLS) * CELL + CELL)
        )
        canvas.paste(sprite, (cx - CELL // 2, feet - FEET_Y + 4), sprite)

    # Sheet order: idle 0, walk 10, attack 19, idle on ink, death on ink.
    place(0, 170, 470)
    place(10, 310, 470)
    place(19, 450, 470)
    place(0, 620, 470)
    place(35, 720, 470)

    draw.rectangle([0, 0, width, 34], fill=(232, 227, 212, 210))
    draw.text(
        (12, 10),
        "SYNTHETIC CONTEXT 800x600 - 1:1 sprite scale - NOT an in-engine capture",
        fill=(30, 30, 28),
        font=label_font(14),
    )
    # Paper caption strip so the footer stays legible over both paper and ink.
    draw.rectangle([0, 568, width, height], fill=(232, 227, 212, 245))
    draw.line([0, 568, width, 568], fill=(58, 58, 53, 60), width=1)
    draw.text(
        (12, 578),
        "paper -> run -> attack | right third: same idle and death over solid ink",
        fill=(30, 30, 28),
        font=label_font(13),
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(path)


def readability(atlas: Image.Image, path: Path) -> None:
    """Paper / ink / grayscale reads, plus a native 1:1 strip."""
    label_h = 28
    big = [
        ("2x paper #E8E3D4", on_background(atlas, PAPER)),
        ("2x ink #171817", on_background(atlas, INK)),
        ("2x gray 50%", on_background(atlas, GRAY)),
    ]
    native = [
        ("1:1 paper", on_background(atlas, PAPER)),
        ("1:1 ink", on_background(atlas, INK)),
    ]

    width = atlas.width * 2
    height = sum(label_h + atlas.height * 2 for _ in big) + label_h + atlas.height
    sheet = Image.new("RGB", (width, height), (24, 24, 24))
    draw = ImageDraw.Draw(sheet)

    y = 0
    for label, panel in big:
        draw.text((6, y + 6), label, fill=(240, 240, 240), font=label_font(14))
        sheet.paste(panel.resize((width, atlas.height * 2), Image.NEAREST), (0, y + label_h))
        y += label_h + atlas.height * 2

    draw.text((6, y + 6), "1:1 native reads (paper | ink)", fill=(240, 240, 240), font=label_font(14))
    y += label_h
    for i, (_, panel) in enumerate(native):
        sheet.paste(panel, (i * atlas.width, y))

    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(path)


# ---------------------------------------------------------------------------
# QA
# ---------------------------------------------------------------------------
def qa_report(atlas: Image.Image, cells: list[dict], png_path: Path) -> dict:
    rgba = atlas.convert("RGBA")
    opaque = [
        (r, g, b)
        for r, g, b, a in rgba.getdata()
        if a >= 244
    ]
    pure_black = sum(1 for p in opaque if p == (0, 0, 0))
    pure_white = sum(1 for p in opaque if p == (255, 255, 255))
    alpha_levels = len(set(rgba.getchannel("A").getdata()))

    cell_reports = []
    for cell in cells:
        index = cell["index"]
        box = (
            (index % COLS) * CELL,
            (index // COLS) * CELL,
            (index % COLS) * CELL + CELL,
            (index // COLS) * CELL + CELL,
        )
        cell_alpha = rgba.crop(box).getchannel("A")
        cell_margins = margins(cell_alpha)
        cell_reports.append(
            {
                **{k: cell[k] for k in ("index", "clip", "source", "flip_x", "size", "offset", "duplicate_of", "hold_of") if k in cell},
                "margins": cell_margins,
                "safe_area_ok": bool(
                    cell_margins
                    and min(cell_margins.values()) >= SAFE
                ),
            }
        )

    safe_failures = [c["index"] for c in cell_reports if c["margins"] and not c["safe_area_ok"]]
    return {
        "atlas": {
            "path": png_path.as_posix(),
            "bytes": png_path.stat().st_size if png_path.exists() else None,
            "width": rgba.width,
            "height": rgba.height,
            "mode": "RGBA",
            "alpha_levels": alpha_levels,
            "opaque_rgb_swatches": len(set(opaque)),
            "pure_black_opaque_pixels": pure_black,
            "pure_white_opaque_pixels": pure_white,
            "transparent_pixels": sum(1 for a in rgba.getchannel("A").getdata() if a == 0),
        },
        "cells": cell_reports,
        "safe_area_failures": safe_failures,
        "safe_area_note": (
            "Failures are the fused slash arc / sword tip of attack cell 21 "
            "(and its detachable neighbours). The body itself stays inside the "
            "cell; the VFX is clipped at the boundary."
        ),
        "clips": {
            clip: {
                "cells": ANIMATIONS[clip]["frames"],
                "unique_source_frames": len(
                    {(c["source"]["row"], c["source"]["frame"]) for c in cell_reports
                     if c["clip"] == clip and c["source"]}
                ),
                "holds": sum(1 for c in cell_reports if c["clip"] == clip and c.get("hold_of") is not None),
                "reused_across_clips": sum(
                    1
                    for c in cell_reports
                    if c["clip"] == clip
                    and c.get("duplicate_of") is not None
                    and c.get("hold_of") is None
                ),
            }
            for clip in ANIMATIONS
        },
        "source_map": "samurai-painted.frames.json",
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


def main() -> int:
    root = repo_root()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--src",
        type=Path,
        default=root / "assets/sprites/samurai1.png",
        help="source key-pose sheet (default: assets/sprites/samurai1.png)",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=root / "src/games/hitandrun/assets/candidates/samurai-painted",
        help="output folder for the atlas and JSON",
    )
    parser.add_argument(
        "--docs",
        type=Path,
        default=root / "docs/hitandrun/assets/samurai-painted",
        help="output folder for previews and QA",
    )
    parser.add_argument("--check", action="store_true", help="build and validate without writing")
    args = parser.parse_args()

    if not args.src.is_file():
        raise SystemExit(f"source not found: {args.src}")

    atlas, cells = build(args.src)
    png_path = args.out / "samurai-painted.png"

    if args.check:
        payload = qa_report(atlas, cells, png_path)
        print(json.dumps(payload, indent=2))
        return 0

    args.out.mkdir(parents=True, exist_ok=True)
    args.docs.mkdir(parents=True, exist_ok=True)
    atlas.save(png_path, optimize=True)

    try:
        source_display = args.src.resolve().relative_to(root).as_posix()
    except ValueError:
        source_display = args.src.resolve().as_posix()

    write_json(args.out / "samurai-painted.atlas.json", atlas_json())
    write_json(args.out / "samurai-painted.animations.json", animations_json())
    write_json(
        args.out / "samurai-painted.frames.json",
        {
            "source": source_display,
            "source_size": list(SRC_SIZE),
            "scale": SCALE,
            "feet_y": FEET_Y,
            "safe_area_px": SAFE,
            "cells": cells,
            "source_inventory": source_inventory(
                Image.open(args.src).convert("RGBA"), cells
            ),
        },
    )

    contact_sheet(atlas, args.docs / "contact-sheet.png")
    readability(atlas, args.docs / "readability.png")
    context_mock(atlas, args.docs / "context-mock.png")

    report = qa_report(atlas, cells, png_path)
    write_json(args.docs / "build-report.json", report)

    print(f"atlas   : {png_path} ({png_path.stat().st_size} bytes)")
    print(f"previews: {args.docs / 'contact-sheet.png'}")
    print(f"          {args.docs / 'readability.png'}")
    print(f"report  : {args.docs / 'build-report.json'}")
    print(
        f"cells   : {FRAMES} total, "
        f"{sum(1 for c in cells if c['source'] is None)} empty, "
        f"safe-area flags: {report['safe_area_failures'] or 'none'}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
