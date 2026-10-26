#!/usr/bin/env python3
"""Native-scale context mock: player frames + one samurai on an 800x600 paper frame.

This is a review aid, not an in-engine capture. It checks scale, baseline and
silhouette contrast at the logical viewport size without booting the game.

Usage:
  python3 build_context_mock.py <player.png> <samurai.png> --out <png>

Requires Pillow.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:  # pragma: no cover
    sys.exit("Pillow >= 10 required (pip3 install --user pillow)")

W, H = 800, 600
CELL = 64
GROUND_Y = 500
PAPER = (232, 227, 212)
GROUND = (201, 194, 174)
INK = (23, 24, 23)


def frame(atlas: Image.Image, fid: int) -> Image.Image:
    x, y = (fid % 8) * CELL, (fid // 8) * CELL
    return atlas.crop((x, y, x + CELL, y + CELL))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("player", type=Path)
    ap.add_argument("samurai", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()

    img = Image.new("RGBA", (W, H), (*PAPER, 255))
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.rectangle((0, GROUND_Y, W, H), fill=(*GROUND, 255))
    # three low-contrast paper washes so the sprites are judged on real values
    for i, height in enumerate((70, 120, 170)):
        draw.ellipse((-120 + i * 50, GROUND_Y - height, 520 + i * 70, GROUND_Y + 20),
                     fill=(*INK, 14 + i * 5))
    draw.line((0, GROUND_Y, W, GROUND_Y), fill=(*INK, 70), width=2)
    img.alpha_composite(overlay)

    player = Image.open(args.player).convert("RGBA")
    samurai = Image.open(args.samurai).convert("RGBA")
    # idle / walk / fire, all anchored by the 64px cell bottom at GROUND_Y
    for fid, x in ((0, 250), (10, 340), (18, 430)):
        img.alpha_composite(frame(player, fid), (x, GROUND_Y - CELL))
    img.alpha_composite(frame(samurai, 0), (540, GROUND_Y - CELL))

    args.out.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(args.out)
    print(f"context mock -> {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
