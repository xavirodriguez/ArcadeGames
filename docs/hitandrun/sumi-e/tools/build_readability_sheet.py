#!/usr/bin/env python3
"""Stack a character atlas over three reading environments.

Panels (top to bottom), each one atlas-sized:
  1. washi paper  #E8E3D4  (the normal gameplay ground)
  2. solid ink    #171817  (the stress test: does the silhouette survive?)
  3. grayscale of panel 1  (value structure with no hue help)

This is a review artifact, not a shipped asset. Usage:

  python3 build_readability_sheet.py <atlas.png> --out <sheet.png>

Requires Pillow.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("Pillow >= 10 required (pip3 install --user pillow)")

PAPER = (0xE8, 0xE3, 0xD4)
INK = (0x17, 0x18, 0x17)
GAP = 8


def panel(atlas: Image.Image, bg: tuple[int, int, int]) -> Image.Image:
    out = Image.new("RGB", atlas.size, bg)
    out.paste(atlas, (0, 0), atlas)
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("atlas", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()

    atlas = Image.open(args.atlas).convert("RGBA")
    w, h = atlas.size
    on_paper = panel(atlas, PAPER)
    on_ink = panel(atlas, INK)
    gray = on_paper.convert("L").convert("RGB")

    sheet = Image.new("RGB", (w, h * 3 + GAP * 2), PAPER)
    for row, p in enumerate((on_paper, on_ink, gray)):
        sheet.paste(p, (0, row * (h + GAP)))

    args.out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.out)
    print(f"readability -> {args.out} ({w}x{sheet.height})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
