#!/usr/bin/env python3
"""Labeled contact sheet for a grid atlas (nearest-neighbor, checkerboard).

The skill's `build_preview_sheet.py` takes one image per asset; an atlas is a
single file, so this variant slices it by cell and labels each row.

Usage:
  python3 build_atlas_contact_sheet.py <atlas.png> --out <sheet.png> \
      --cell 64 --zoom 3 --labels "idle 0-7,walk 8-15,attack 16-23,..."

Requires Pillow.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:  # pragma: no cover
    sys.exit("Pillow >= 10 required (pip3 install --user pillow)")

PAPER = (0xE8, 0xE3, 0xD4)
INK = (0x17, 0x18, 0x17)
CHECK_A = (0xC9, 0xC2, 0xAE)
CHECK_B = (0xEF, 0xEA, 0xDC)
LABEL_W = 104
PAD = 8


def checkerboard(size: tuple[int, int], tile: int = 12) -> Image.Image:
    img = Image.new("RGB", size, CHECK_A)
    draw = ImageDraw.Draw(img)
    for y in range(0, size[1], tile):
        for x in range(0, size[0], tile):
            if (x // tile + y // tile) % 2:
                draw.rectangle((x, y, x + tile - 1, y + tile - 1), fill=CHECK_B)
    return img


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("atlas", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--cell", type=int, default=64)
    ap.add_argument("--zoom", type=int, default=3)
    ap.add_argument("--labels", type=str, default="")
    args = ap.parse_args()

    atlas = Image.open(args.atlas).convert("RGBA")
    cell = args.cell
    cols, rows = atlas.width // cell, atlas.height // cell
    labels = [s.strip() for s in args.labels.split(",")] if args.labels else []
    if labels and len(labels) != rows:
        ap.error(f"--labels needs {rows} entries, got {len(labels)}")

    zoom = max(1, args.zoom)
    sheet = Image.new("RGB", (LABEL_W + cols * cell * zoom, rows * cell * zoom), PAPER)
    sheet.paste(checkerboard((cols * cell * zoom, rows * cell * zoom)), (LABEL_W, 0))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()

    for r in range(rows):
        y = r * cell * zoom
        if r < len(labels):
            draw.text((PAD, y + PAD), labels[r], fill=INK, font=font)
        draw.line((LABEL_W, y + cell * zoom - 1, sheet.width, y + cell * zoom - 1), fill=INK)
        for c in range(cols):
            tile = atlas.crop((c * cell, r * cell, (c + 1) * cell, (r + 1) * cell))
            tile = tile.resize((cell * zoom, cell * zoom), Image.NEAREST)
            # composite over the checkerboard using the sprite alpha as mask
            sheet.paste(tile, (LABEL_W + c * cell * zoom, y), tile)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.out)
    print(f"contact sheet -> {args.out} ({sheet.width}x{sheet.height})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
