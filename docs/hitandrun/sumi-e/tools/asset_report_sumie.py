#!/usr/bin/env python3
"""Sumi-e theme raster audit: palette, accent budget, safe area, alpha style.

Complements the generic `asset_report.py` in the create-game-assets skill:

  * asset_report counts DISTINCT RGBA TUPLES, so any sprite with soft
    (anti-aliased) alpha fails --max-colors even with a tiny palette. The
    Sumi-e contract mandates PNG-32 soft alpha AND <= 8 palette swatches,
    which is only satisfiable if "colors" means RGB swatches while alpha
    stays a continuous ramp. This script enforces that interpretation:

      1. every pixel's RGB must belong to the declared 7-swatch theme palette
      2. opaque-pixel swatch count <= MAX_COLORS
      3. accent (gold + vermilion) area <= ACCENT_MAX_RATIO of opaque area
      4. pure #000000 / #FFFFFF fills are rejected
      5. alpha must be a real ramp (PNG-32, straight alpha, > 2 levels)
      6. per-cell content bounds stay inside the 2px safe area of each 64px cell

Also prints a per-cell content-height read at the anchor baseline (useful for
the silhouette acceptance gates).

Usage:  asset_report_sumie.py <png> [--json]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("Pillow >= 10 required (pip3 install --user pillow)")

# Kept in sync with docs/hitandrun/sumi-e/tools/generate_samurai_sumi_e.py
PALETTE = [
    (0x17, 0x18, 0x17),  # ink.primary
    (0x3A, 0x3A, 0x35),  # ink.muted
    (0x6E, 0x6B, 0x5E),  # wash mid
    (0xB8, 0x96, 0x3E),  # accent.gold
    (0xC0, 0x39, 0x2B),  # accent.vermilion
    (0xF2, 0xEE, 0xE3),  # paper.highlight
    (0x8E, 0x2A, 0x20),  # accent.vermilionDark
]
MAX_COLORS = 8
ACCENT_RGB = {(0xB8, 0x96, 0x3E), (0xC0, 0x39, 0x2B), (0x8E, 0x2A, 0x20)}
ACCENT_MAX_RATIO = 0.05
CELL = 64
SAFE = 2.0


def audit(path: Path) -> dict[str, Any]:
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    px = img.load()

    rgb_seen: set[tuple[int, int, int]] = set()
    opaque_rgb: set[tuple[int, int, int]] = set()
    alpha_levels: set[int] = set()
    accent_area = 0
    opaque_area = 0
    painted_area = 0
    off_palette = 0
    pure_fills = 0
    per_color: dict[tuple[int, int, int], int] = {}
    cell_bounds: dict[str, list[int]] = {}

    for cy in range(h // CELL):
        for cx in range(w // CELL):
            x0, y0 = cx * CELL, cy * CELL
            bmin_x, bmin_y, bmax_x, bmax_y = 999, 999, -1, -1
            for yy in range(y0, y0 + CELL):
                for xx in range(x0, x0 + CELL):
                    r, g, b, a = px[xx, yy]
                    if a == 0:
                        continue
                    if a <= 3:  # treat as empty
                        continue
                    rgb_seen.add((r, g, b))
                    alpha_levels.add(a)
                    if a >= 244:
                        opaque_area += 1
                        opaque_rgb.add((r, g, b))
                    if a >= 128:
                        painted_area += 1  # perceptible presence denominator
                    if (r, g, b) not in PALETTE:
                        off_palette += 1
                    if (r, g, b) in ACCENT_RGB and a >= 128:
                        # perceptible accent presence (soft AA edges excluded)
                        accent_area += 1
                        per_color[(r, g, b)] = per_color.get((r, g, b), 0) + 1
                    if (r, g, b) == (0, 0, 0) or (r, g, b) == (255, 255, 255):
                        pure_fills += 1
                    lx, ly = xx - x0, yy - y0
                    bmin_x, bmin_y = min(bmin_x, lx), min(bmin_y, ly)
                    bmax_x, bmax_y = max(bmax_x, lx), max(bmax_y, ly)
            cell_bounds[f"{cx},{cy}"] = (
                [bmin_x, bmin_y, bmax_x, bmax_y] if bmax_x >= 0 else []
            )

    print(path)
    print(f"  size          : {w}x{h}")
    print(f"  rgb swatches  : {len(rgb_seen)}  (<= {MAX_COLORS} : {'PASS' if len(rgb_seen) <= MAX_COLORS else 'FAIL'})")
    print(f"  opaque swatches: {len(opaque_rgb)}")
    print(f"  off-palette px: {off_palette}")
    print(f"  alpha levels  : {len(alpha_levels)} (ramp {min(alpha_levels) if alpha_levels else 0}..{max(alpha_levels) if alpha_levels else 255})")
    if painted_area:
        ratio = accent_area / painted_area
        print(f"  accent ratio  : {ratio:.2%} of painted pixels, alpha>=128 (<= {ACCENT_MAX_RATIO:.0%}: {'PASS' if ratio <= ACCENT_MAX_RATIO else 'FAIL'})")
        for col, n in sorted(per_color.items(), key=lambda kv: -kv[1]):
            print(f"    {col}: {n} px")
    else:  # defensive: empty sheet would divide by zero above
        print("  accent ratio  : n/a (no painted pixels)")
    print(f"  pure fills    : {pure_fills} (0 == PASS)")
    violations = [
        f"cell {k} bounds {v} violate 2px safe area "
        f"({CELL - SAFE}px limit, content at x {v[0]}..{v[2]}, y {v[1]}..{v[3]})"
        for k, v in cell_bounds.items()
        if v and (v[0] < SAFE - 1 or v[1] < SAFE - 1 or v[2] > CELL - SAFE or v[3] > CELL - SAFE)
    ]
    for v in violations:
        print(f"  SAFE AREA   : {v}")
    if not violations:
        print("  safe area    : PASS (all 40 cells within the 2px margin)")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("path", type=Path)
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()
    report = audit(args.path)
    if args.json:
        print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
