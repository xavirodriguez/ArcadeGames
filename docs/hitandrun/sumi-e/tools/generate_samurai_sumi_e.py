#!/usr/bin/env python3
"""Generate the Sumi-e samurai character atlas for Hit & Run.

Deterministic procedural painter: every frame is rendered from a fixed seed
chain, so re-running the script reproduces the exact same PNG bytes.

Contract (see docs/hitandrun/sumi-e/ART_DIRECTION_BRIEF.md section 3):
  - atlas 512x320, grid 8x5, cell 64x64, 40 frames
  - frame ranges: idle[0-7] walk[8-15] attack[16-23] hurt[24-29]
                  empty[30-31] death[32-39]
  - anchor (0.5, 0.94) -> feet baseline at cell y approx 60
  - facing RIGHT (the renderer flips X when the entity turns)
  - PNG-32 RGBA (straight alpha), palette-snapped to <= 8 RGB swatches
  - no text, no logos, no baked background (soft ink ground shadow only)

Usage:
  python3 generate_samurai_sumi_e.py --atlas <out.png> [--json-dir <dir>]
  python3 generate_samurai_sumi_e.py --frames idle:0,attack:3 --out-sheet <png>

Requires Pillow (save/preview only; rasterization is dependency-free).
"""

from __future__ import annotations

import argparse
import json
import math
import random
import zlib
from pathlib import Path

# ---------------------------------------------------------------------------
# Palette (ART_DIRECTION_BRIEF.md section 2.4). Exactly these RGB swatches;
# edge softness lives in alpha, never in blended RGB colors.
# ---------------------------------------------------------------------------
PAL_INK = (0x17, 0x18, 0x17)      # ink.primary   - main mass, outline
PAL_MUTED = (0x3A, 0x3A, 0x35)    # ink.muted     - inner lines, tsuka wrap
PAL_WASH = (0x6E, 0x6B, 0x5E)     # aguada media  - soft intermediate tone
PAL_GOLD = (0xB8, 0x96, 0x3E)     # accent.gold   - maedate, armor bands, spark
PAL_VERM = (0xC0, 0x39, 0x2B)     # accent.vermilion - obi knot, dried blood
PAL_PAPER = (0xF2, 0xEE, 0xE3)    # paper.highlight - blade edge, eye slit
PAL_VERMD = (0x8E, 0x2A, 0x20)    # accent.vermilionDark - death stain only

PALETTE = [PAL_INK, PAL_MUTED, PAL_WASH, PAL_GOLD, PAL_VERM, PAL_PAPER, PAL_VERMD]
# Blends between strokes may only resolve into the ink family. Accents and
# paper highlights apply only as their own (sufficiently opaque) strokes;
# otherwise their soft edge resolves as ink wash. This keeps the accent
# budget honest: no accidental gold fuzz around every cream edge.
INK_FAMILY = [PAL_INK, PAL_MUTED, PAL_WASH]
SOFT_ACCENTS = [PAL_GOLD, PAL_VERM, PAL_VERMD, PAL_PAPER]
SOFT_ACCENT_MIN_ALPHA = 0.35

CELL = 64
COLS = 8
ROWS = 5
FEET_Y = 59.6          # baseline the anchor pivot points at
MARGIN = 2.0           # content stays inside [MARGIN, CELL-MARGIN]

# Blend tolerance when snapping composited pixels back to the palette:
# anything inside this drift distance is pulled to the nearest swatch.


# ---------------------------------------------------------------------------
# Deterministic noise (integer hash -> [0, 1). Stable across frames/runs.)
# ---------------------------------------------------------------------------
def _mix(h: int) -> float:
    h &= 0xFFFFFFFF
    h ^= h >> 16
    h = (h * 0x7FEB352D) & 0xFFFFFFFF
    h ^= h >> 15
    h = (h * 0x846CA68B) & 0xFFFFFFFF
    h ^= h >> 16
    return (h & 0xFFFFFF) / float(0x1000000)


def hash2(x: float, y: float, seed: int) -> float:
    xi = int(math.floor(x * 2.0))  # 2px grain grid for dry-brush texture
    yi = int(math.floor(y * 2.0))
    h = (xi * 0x9E3779B1) & 0xFFFFFFFF
    h = (h ^ (yi * 0x85EBCA6B)) & 0xFFFFFFFF
    h = (h ^ (seed * 0x31C3CB7D)) & 0xFFFFFFFF
    return _mix(h)


def snap_rgb(rgb, family=None):
    """Composite results always land on the nearest palette swatch."""
    candidates = family if family is not None else PALETTE
    best, best_d = candidates[0], 1e9
    for pal in candidates:
        d = (rgb[0] - pal[0]) ** 2 + (rgb[1] - pal[1]) ** 2 + (rgb[2] - pal[2]) ** 2
        if d < best_d:
            best, best_d = pal, d
    return best


# ---------------------------------------------------------------------------
# Canvas: float alpha accumulation with on-the-fly palette snapping.
# ---------------------------------------------------------------------------
class Canvas:
    __slots__ = ("w", "h", "a", "r", "g", "b")

    def __init__(self, w: int, h: int) -> None:
        self.w = w
        self.h = h
        self.a = [0.0] * (w * h)
        self.r = [0] * (w * h)
        self.g = [0] * (w * h)
        self.b = [0] * (w * h)

    def composite(self, x: int, y: int, color, sa: float) -> None:
        i = y * self.w + x
        da = self.a[i]
        if sa <= da and sa < 1.0:
            pass  # keep the already-painted (stronger) stroke
        na = sa + da * (1.0 - sa)
        if na <= 0.0:
            return
        sr, sg, sb = color
        if da <= 0.0:
            self.r[i] = sr
            self.g[i] = sg
            self.b[i] = sb
        elif color == (self.r[i], self.g[i], self.b[i]):
            pass  # same swatch: alpha pick-up only, no color churn
        else:
            wa = da * (1.0 - sa)
            if color in SOFT_ACCENTS and sa < SOFT_ACCENT_MIN_ALPHA:
                # faint accent/paper edges resolve as ink wash, budget stays under 5%
                sa_eff = sa
                mixed = snap_rgb((
                    int(sr * sa_eff / na + self.r[i] * wa / na + 0.5),
                    int(sg * sa_eff / na + self.g[i] * wa / na + 0.5),
                    int(sb * sa_eff / na + self.b[i] * wa / na + 0.5),
                ), INK_FAMILY)
                self.r[i] = mixed[0]
                self.g[i] = mixed[1]
                self.b[i] = mixed[2]
                self.a[i] = min(1.0, na)
                return
            mixed = snap_rgb((
                int(sr * sa / na + self.r[i] * wa / na + 0.5),
                int(sg * sa / na + self.g[i] * wa / na + 0.5),
                int(sb * sa / na + self.b[i] * wa / na + 0.5),
            ))
            self.r[i] = mixed[0]
            self.g[i] = mixed[1]
            self.b[i] = mixed[2]
        self.a[i] = min(1.0, na)

    def clamp_margins(self, m: float = 2.0) -> None:
        """Enforce the per-cell 2px safe area (no content may touch the border)."""
        lo, hi = int(m), int(self.w - m)
        vhi = int(self.h - m)
        for y in range(self.h):
            for x in range(self.w):
                if x < lo or x >= hi or y < lo or y >= vhi:
                    i = y * self.w + x
                    self.a[i] = 0.0

    def to_png_rgba(self) -> bytes:
        out = bytearray()
        a, r, g, b = self.a, self.r, self.g, self.b
        n = self.w * self.h
        for i in range(n):
            av = a[i]
            out.append(r[i])
            out.append(g[i])
            out.append(b[i])
            out.append(0 if av <= 0.006 else int(av * 255.0 + 0.5) if av < 1.0 else 255)
        return bytes(out)


# ---------------------------------------------------------------------------
# Brush strokes: capsule sweep with wobbled spine + dry-brush breaks.
# ---------------------------------------------------------------------------
def _resample(pts, step: float):
    """Polyline -> evenly spaced samples (len, x, y)."""
    work = [pts[0]]
    for p in pts[1:]:
        work.append(p)
    dist = [0.0]
    for i in range(1, len(work)):
        dx = work[i][0] - work[i - 1][0]
        dy = work[i][1] - work[i - 1][1]
        dist.append(dist[-1] + math.hypot(dx, dy))
    total = dist[-1]
    if total < 1e-4:
        return [(0.0, work[0][0], work[0][1])]
    n = max(2, int(math.ceil(total / step)))
    out = []
    j = 0
    for k in range(n + 1):
        d = total * k / n
        while j < len(dist) - 2 and dist[j + 1] < d:
            j += 1
        seg = dist[j + 1] - dist[j]
        t0 = (d - dist[j]) / seg if seg > 1e-6 else 0.0
        xa = work[j][0] + (work[j + 1][0] - work[j][0]) * t0
        ya = work[j][1] + (work[j + 1][1] - work[j][1]) * t0
        out.append((d, xa, ya))
    return out


def brush(
    cv: Canvas,
    pts,
    radii,
    color,
    alpha: float,
    seed: int,
    wobble: float = 0.35,
    dry: float = 0.42,
    taper_cap: bool = True,
    flash: bool = False,
) -> None:
    """Paint one brush stroke. `radii` may be a scalar or (r_start, r_end)."""
    if flash:
        return  # reserved for one-off accent bursts drawn as discs
    samples = _resample(pts, 0.5)
    total = samples[-1][0]
    if radio_start := isinstance(radii, tuple):
        r0, r1 = radii
    else:
        r0 = r1 = float(radii)
    rng = random.Random((seed * 2654435761 + 0x9E3779B9) & 0xFFFFFFFF)
    ph1, ph2 = rng.random() * 6.283, rng.random() * 6.283
    w1, w2 = 0.9 + rng.random() * 0.5, 2.3 + rng.random() * 1.4
    for (d, sx, sy) in samples:
        t = d / total if total > 1e-5 else 0.0
        if taper_cap:
            cap = min(1.0, min(d, total - d) / max(1e-3, (r0 + r1) * 0.45)) ** 0.7
        else:
            cap = 1.0
        rad = (r0 + (r1 - r0) * t) * (0.85 + 0.15 * cap)
        # perpendicular wobble (low-freq sines, deterministic per stroke seed)
        off = wobble * cap * (
            0.65 * math.sin(d * w1 + ph1) + 0.35 * math.sin(d * w2 + ph2)
        )
        # spine direction for the normal
        nx, ny = -1.0, 0.0
        if total > 1e-5:
            jn = min(len(samples) - 1, max(1, int(d / 0.5)))
            p0, p1 = samples[jn - 1], samples[jn]
            ddx, ddy = p1[1] - p0[1], p1[2] - p0[2]
            dl = math.hypot(ddx, ddy)
            if dl > 1e-6:
                nx, ny = -ddy / dl, ddx / dl
        cx, cy = sx + nx * off, sy + ny * off
        _disc(cv, cx, cy, rad, color, alpha, seed + int(d * 7.0), dry)


def _disc(cv: Canvas, cx: float, cy: float, r: float, color, alpha: float,
          seed: int, dry: float) -> None:
    if r < 0.25:
        return
    w, h = cv.w, cv.h
    R = r + 1.1
    x0 = max(0, int(cx - R))
    x1 = min(w - 1, int(math.ceil(cx + R)))
    y0 = max(0, int(cy - R))
    y1 = min(h - 1, int(math.ceil(cy + R)))
    ri = 1.0 / max(0.35, r)
    for py in range(y0, y1 + 1):
        for px in range(x0, x1 + 1):
            dx = px - cx
            dy = py - cy
            d = math.hypot(dx, dy)
            if d > R:
                continue
            # soft coverage falloff -> PNG-32 smooth alpha edge
            cov = (R - d) * ri
            cov = cov if cov < 1.0 else 1.0
            cov = cov * cov * (3.0 - 2.0 * cov)
            if cov <= 0.0:
                continue
            dryn = hash2(px, py, seed)
            fac = 1.0 - dry * (dryn * dryn)  # squared -> broken edges
            sa = alpha * cov * fac
            if sa > 0.004:
                cv.composite(px, py, color, sa)


def disc(cv: Canvas, cx: float, cy: float, r: float, color, alpha: float,
         seed: int, dry: float = 0.30) -> None:
    _disc(cv, cx, cy, r, color, alpha, seed, dry)


# ---------------------------------------------------------------------------
# Pose skeleton. All coordinates in one 64x64 cell, facing right, feet ~59.6.
# ---------------------------------------------------------------------------
BASE_CX = 34.2

COMMON = {
    "lean": 0.0,        # torso lean (px, + = forward/right)
    "bob": 0.0,         # upper body bob (px, + = down)
    "crouch": 0.0,      # death squash 0..1
    "front_dx": 0.0,    # front foot offset
    "front_dy": 0.0,    # front foot lift
    "back_dx": 0.0,     # back foot offset
    "sx": 0.0,          # skirt sway (+ = trailing hem)
    "hand": (45.4, 33.0),
    "angle": -33.0,     # blade direction, degrees (0 = +x, negative = up)
    "blen": 16.5,       # blade length px
    "spark": False,     # gold impact spark at the tip
    "pool": 0.0,        # ink pool multiplier (death)
    "lie": None,        # fully custom lying pose (death frames 5-7)
}


def pose_idle(i: int) -> dict:
    p = 2.0 * math.pi * i / 8.0
    q = dict(COMMON)
    q["bob"] = 0.55 * math.sin(p + 0.4)
    q["lean"] = 0.35 * math.sin(p + 1.6)
    q["sx"] = 0.25 * math.sin(p)
    q["hand"] = (45.4 + 0.35 * math.sin(p), 33.0 + 0.6 * math.sin(p + 0.8))
    q["angle"] = -33.0 + 1.4 * math.sin(p + 2.0)
    q["blen"] = 15.8
    return q


def pose_walk(i: int) -> dict:
    p = 2.0 * math.pi * i / 8.0
    q = dict(COMMON)
    q["bob"] = -1.05 * abs(math.sin(p)) + 0.2
    q["lean"] = 0.75
    q["front_dx"] = 4.2 * math.sin(p)
    q["back_dx"] = -3.9 * math.sin(p)
    q["front_dy"] = max(0.0, 1.7 * math.sin(p - 0.7)) if math.sin(p) > 0 else 0.0
    q["sx"] = 1.6 * math.sin(p)
    q["hand"] = (45.8 + 0.3 * math.sin(p), 32.4 + q["bob"] * 0.5)
    q["angle"] = -31.0 + 0.8 * math.sin(p + 1.0)
    q["blen"] = 15.3
    return q


ATTACK_KEYS = [
    dict(lean=-0.6, bob=-0.6, hand=(43.6, 28.0), angle=-100.0, blen=15.5, front_dx=-0.4),
    dict(lean=-1.7, bob=-1.3, hand=(43.0, 25.5), angle=-128.0, blen=13.0, front_dx=-1.1),
    dict(lean=2.3, bob=0.2, hand=(45.5, 29.5), angle=-62.0, blen=16.5, front_dx=1.1),
    dict(lean=3.7, bob=0.7, hand=(46.8, 32.5), angle=-15.0, blen=13.0, front_dx=2.3),
    dict(lean=3.9, bob=0.8, hand=(46.6, 33.6), angle=16.0, blen=12.0, front_dx=2.6, spark=True),
    dict(lean=1.9, bob=0.3, hand=(46.0, 33.4), angle=-30.0, blen=14.0, front_dx=1.6),
    dict(lean=0.7, bob=0.0, hand=(45.6, 33.1), angle=-32.0, blen=15.5, front_dx=0.8),
    dict(lean=0.1, bob=0.1, hand=(45.2, 33.2), angle=-33.0, blen=15.8),
]


def pose_attack(i: int) -> dict:
    return {**COMMON, **ATTACK_KEYS[i]}


HURT_KEYS = [
    dict(lean=-3.4, bob=0.8, hand=(43.0, 29.4), angle=-46.0, front_dx=-1.5, back_dx=-2.6),
    dict(lean=-2.9, bob=0.6, hand=(43.4, 30.0), angle=-39.0, front_dx=-2.1, back_dx=-3.3),
    dict(lean=-1.8, bob=0.4, hand=(44.0, 31.0), angle=-36.0, front_dx=-1.6, back_dx=-2.4, sx=-0.7),
    dict(lean=-0.9, bob=0.2, hand=(44.6, 31.8), angle=-34.0, front_dx=-1.0, back_dx=-1.4, sx=-0.4),
    dict(lean=-0.3, bob=0.0, hand=(45.1, 32.4), angle=-33.5, front_dx=-0.4, back_dx=-0.6),
    dict(lean=0.0, bob=0.0, hand=(45.3, 32.8), angle=-33.0),
]


def pose_hurt(i: int) -> dict:
    return {**COMMON, **HURT_KEYS[i]}


def pose_death(i: int) -> dict:
    q = dict(COMMON)
    if i == 0:
        q.update(lean=4.4, bob=1.0, hand=(47.0, 34.5), angle=42.0, blen=13.0, front_dx=3.0, sx=-0.8)
    elif i == 1:
        q.update(lean=5.4, bob=2.8, crouch=0.5, hand=(46.4, 37.5), angle=56.0, blen=12.0,
                 front_dx=3.2, back_dx=-0.6)
    elif i == 2:
        q.update(lean=6.0, bob=5.6, crouch=0.78, hand=(45.6, 41.0), angle=64.0, blen=11.0,
                 front_dx=2.8, back_dx=-1.0, pool=0.25)
    elif i == 3:
        q.update(lean=6.2, bob=7.0, crouch=0.92, hand=(45.4, 43.0), angle=68.0, blen=10.0,
                 front_dx=2.2, back_dx=-1.4, pool=0.6)
    elif i == 4:
        q.update(lean=5.0, bob=10.5, crouch=1.0, hand=(45.0, 45.0), angle=70.0, blen=9.0,
                 front_dx=1.6, back_dx=-1.6, pool=0.85)
    else:
        q["lie"] = i
        q["pool"] = 0.85 + 0.25 * i  # 5,6,7 -> pool grows in
    return q


# ---------------------------------------------------------------------------
# Frame painter.
# ---------------------------------------------------------------------------
def draw_samurai(cv: Canvas, p: dict, seed: int) -> None:
    if p.get("lie") is not None:
        _draw_lying(cv, p, seed)
        return

    crouch = p["crouch"]
    lean = p["lean"]
    bob = p["bob"]
    cr = 1.0 - crouch
    crs = math.sqrt(max(0.05, cr))

    # -- derived skeleton (feet first, up the chain) -------------------------
    feet_y = FEET_Y - 1.5 * crouch
    hem_y = 57.6 + 1.4 * crouch
    waist_y = 40.0 + 8.5 * crouch
    chest = (BASE_CX + lean, 29.5 + bob * 0.45 + 10.0 * crouch)
    head = (chest[0] + 0.7 + lean * 0.35, chest[1] - 10.6 * crs - 0.4)
    sh_l = (chest[0] - 5.3, chest[1] + 1.1)
    sh_r = (chest[0] + 5.6, chest[1] + 1.4)
    hip = (BASE_CX + lean * 0.4, waist_y)
    hem_l = (hip[0] - 6.6 - p["sx"] - 1.2 * crouch, hem_y)
    hem_r = (hip[0] + 8.4 + p["sx"] * 0.6 + 0.8 * crouch, hem_y)
    foot_f = (hem_r[0] - 2.2 + p["front_dx"], feet_y - p["front_dy"] + 0.6 * crouch)
    foot_b = (hem_l[0] + 2.0 + p["back_dx"], feet_y + 0.5 * crouch)
    hand = p["hand"]
    angle = p["angle"] * math.pi / 180.0
    bdx, bdy = (math.cos(angle), math.sin(angle))
    guard = (hand[0] + bdx * 1.4, hand[1] + bdy * 1.4)
    tsuka = (hand[0] - bdx * 5.6, hand[1] - bdy * 5.6)

    # -- ground shadow ------------------------------------------------------
    ground(cv, (hip[0] + 4.0 + lean * 0.3, feet_y - 0.2),
           9.5 + 2.0 * crouch + 6.0 * p["pool"], seed,
           alpha=0.085, ry_scale=0.20)

    # -- rear arm ------------------------------------------------------------
    brush(cv, elbow_back(sh_l, hand) , (2.6, 2.0), PAL_INK, 0.92, seed ^ 0x51, 0.4, dry=0.30)

    # -- hakama back panel + back foot ---------------------------------------
    brush(cv, [(hip[0] - 1.6, waist_y), (hem_l[0] + 1.4, hem_y - 1.0)], (4.4, 4.8),
          PAL_INK, 0.95, seed ^ 0x11, 0.55, dry=0.34)
    foot(cv, foot_b, seed ^ 0x1A, back=True)

    # -- torso ---------------------------------------------------------------
    brush(cv, [(chest[0], chest[1] - 1.0), (chest[0] - 0.7, waist_y - 1.0)],
          (3.9, 4.4), PAL_INK, 0.97, seed ^ 0x21, 0.38, dry=0.26)
    brush(cv, [(sh_l[0] - 0.6, sh_l[1] - 0.4), (sh_r[0] + 0.8, sh_r[1] - 0.2)],
          (3.2, 3.4), PAL_INK, 0.97, seed ^ 0x22, 0.45, dry=0.30)

    # -- hakama front panels (two legs with a paper notch between) -----------
    brush(cv, [(hip[0] - 0.8, waist_y - 0.8), (hem_l[0] + 2.0, hem_y)], (3.2, 3.7),
          PAL_INK, 0.96, seed ^ 0x31, 0.6, dry=0.36)
    brush(cv, [(hip[0] + 0.9, waist_y - 0.8), (hem_r[0] - 1.3, hem_y - 0.4)], (3.2, 3.7),
          PAL_INK, 0.96, seed ^ 0x32, 0.6, dry=0.36)
    # center crease keeps the panels joined at the hip, split below the knee
    brush(cv, [(hip[0] + 0.2, waist_y + 0.6), (hip[0] + 1.4, hip[1] + 2.2)], (1.7, 1.5),
          PAL_INK, 0.9, seed ^ 0x33, 0.7, dry=0.45)
    foot(cv, foot_f, seed ^ 0x3B, back=False)

    # -- head + kabuto --------------------------------------------------------
    hx, hy = head
    _disc_head(cv, hx, hy, seed, crouch)
    # shoulders already cover the neck; add a shikoro break at the back
    brush(cv, [(hx - 4.4, hy + 1.2), (hx - 6.3, hy + 4.2)], (1.5, 1.0),
          PAL_INK, 0.9, seed ^ 0x41, 0.5, dry=0.5)
    brush(cv, [(hx - 4.2, hy + 2.4), (hx - 5.6, hy + 5.8)], (1.1, 0.8),
          PAL_INK, 0.85, seed ^ 0x42, 0.5, dry=0.5)

    # -- front arm ------------------------------------------------------------
    brush(cv, [sh_r, mid_to(hand), hand], (2.7, 2.1), PAL_INK, 0.95, seed ^ 0x52, 0.4, dry=0.28)

    # -- katana: tsuka, tsuba, blade -----------------------------------------
    _katana(cv, p, tsuka, guard, hand, angle, seed, crouch)

    # -- gold armor bands + obi knot + face ----------------------------------
    _details(cv, p, chest, hip, head, seed, crouch)

    if p.get("spark"):
        tip = (guard[0] + bdx * p["blen"], guard[1] + bdy * p["blen"])
        _spark(cv, tip, (bdx, bdy), seed)

    if p["pool"] > 0.0:
        ground(cv, (hip[0] + 6.0, feet_y - 2.2), 12.0, seed ^ 0x77,
               alpha=0.13 * p["pool"], streak=True, ry_scale=0.16)


def elbow_back(sh, hand):
    mid = ((sh[0] + hand[0]) * 0.5, (sh[1] + hand[1]) * 0.5 + 2.6)
    return [sh, mid, hand]


def mid_to(hand):
    return (hand[0] - 2.7, hand[1] - 2.1)


def foot(cv: Canvas, f, seed: int, back: bool):
    r = 2.3 if back else 2.5
    disc(cv, f[0] - 1.2, f[1], r * 0.75, PAL_INK, 0.95, seed, 0.35)
    brush(cv, [(f[0] - 1.0, f[1]), (f[0] + 3.2, f[1] + 0.1)], (1.7, 0.9),
          PAL_INK, 0.95, seed ^ 0x99, 0.3, dry=0.3)


def ground(cv: Canvas, c, rx: float, seed: int, alpha: float = 0.09,
           streak: bool = False, ry_scale: float = 0.28) -> None:
    """Low flat ink shadow / pool under the feet."""
    ry = rx * ry_scale
    w, h = cv.w, cv.h
    x0 = max(0, int(c[0] - rx))
    x1 = min(w - 1, int(math.ceil(c[0] + rx)))
    y0 = max(0, int(c[1] - ry - 1))
    y1 = min(h - 1, int(math.ceil(c[1] + ry)))
    for py in range(y0, y1 + 1):
        for px in range(x0, x1 + 1):
            dx = (px - c[0]) / rx
            dy = (py - c[1]) / ry
            d2 = dx * dx + dy * dy
            if d2 > 1.0:
                continue
            d = math.sqrt(d2)
            cov = 1.0 - d
            cov = cov * cov * (3.0 - 2.0 * sqrt01(cov))
            dryn = hash2(px * 1.4, py * 2.2, seed)
            facet = 1.0 - 0.75 * (dryn * dryn) if streak else 1.0 - 0.55 * dryn
            sa = alpha * cov * facet
            if sa > 0.004:
                cv.composite(px, py, PAL_INK, sa)


def sqrt01(v: float) -> float:
    v = min(1.0, max(0.0, v))
    return math.sqrt(v)


def _disc_head(cv: Canvas, hx: float, hy: float, seed: int, crouch: float) -> None:
    # helmet dome
    brush(cv, [(hx - 4.6, hy + 0.6), (hx - 2.4, hy - 3.6), (hx + 1.6, hy - 4.0),
               (hx + 4.4, hy - 1.6), (hx + 5.0, hy + 0.8)], 3.2,
          PAL_INK, 0.97, seed ^ 0x61, 0.4, dry=0.26)
    # brim (kabuto mabizashi): sticks out front, asymmetric
    brush(cv, [(hx - 4.4, hy + 1.4), (hx + 1.0, hy + 1.9), (hx + 5.6, hy + 2.0)],
          (1.8, 1.4), PAL_INK, 0.97, seed ^ 0x62, 0.4, dry=0.28)
    # face mass under the brim
    disc(cv, hx + 1.2, hy + 3.6, 3.1, PAL_INK, 0.9, seed ^ 0x63, 0.4)
    # gold crescent maedate (acento pequeno: <1% del area)
    brush(cv, [(hx + 0.2, hy - 3.2), (hx + 1.0, hy - 4.3)], (0.7, 0.45),
          PAL_GOLD, 0.9, seed ^ 0x64, 0.25, dry=0.25, flash=False)


def _katana(cv: Canvas, p, tsuka, guard, hand, angle, seed, crouch):
    bdx, bdy = math.cos(angle), math.sin(angle)
    blen = p["blen"]
    tip = (guard[0] + bdx * blen, guard[1] + bdy * blen)
    # tsuka (handle) with muted wrap straps
    brush(cv, [tsuka, guard], 1.55, PAL_INK, 0.97, seed ^ 0x71, 0.3, dry=0.22)
    brush(cv, [(tsuka[0] + bdx * 1.2, tsuka[1] + bdy * 1.2),
               (tsuka[0] + bdx * 2.0, tsuka[1] + bdy * 2.0)], 1.75,
          PAL_MUTED, 0.85, seed ^ 0x72, 0.2, dry=0.25)
    brush(cv, [(tsuka[0] + bdx * 3.2, tsuka[1] + bdy * 3.2),
               (tsuka[0] + bdx * 3.9, tsuka[1] + bdy * 3.9)], 1.7,
          PAL_MUTED, 0.85, seed ^ 0x73, 0.2, dry=0.25)
    # tsuba (guard disc)
    disc(cv, guard[0], guard[1], 2.1, PAL_INK, 0.97, seed ^ 0x74, 0.2)
    # blade: gently curved, tapered, with paper-edge highlight
    bend_nx, bend_ny = -bdy, bdx  # normal
    mid = (guard[0] + bdx * blen * 0.5 + bend_nx * 0.9,
           guard[1] + bdy * blen * 0.5 + bend_ny * 0.9)
    brush(cv, [(guard[0] + bdx * 1.2, guard[1] + bdy * 1.2), mid, tip],
          (1.15, 0.3), PAL_INK, 0.98, seed ^ 0x75, 0.22, dry=0.16)
    # inner lines: back edge muted, cutting edge paper highlight (subtle)
    e0 = (guard[0] + bdx * 2.6, guard[1] + bdy * 2.6)
    e1 = (guard[0] + bdx * blen * 0.72, guard[1] + bdy * blen * 0.72)
    brush(cv, [(e0[0] - bend_nx * 0.8, e0[1] - bend_ny * 0.8),
               (e1[0] - bend_nx * 0.9, e1[1] - bend_ny * 0.9)], 0.55,
          PAL_MUTED, 0.45, seed ^ 0x76, 0.1, dry=0.3)
    brush(cv, [(e0[0] + bend_nx * 0.75, e0[1] + bend_ny * 0.75),
               (e1[0] + bend_nx * 0.85, e1[1] + bend_ny * 0.85)], 0.5,
          PAL_PAPER, 0.45, seed ^ 0x77, 0.1, dry=0.34, flash=False)
    # hands over the handle
    disc(cv, hand[0] + 0.3, hand[1] + 0.2, 2.5, PAL_INK, 0.97, seed ^ 0x78, 0.24)


def _details(cv: Canvas, p, chest, hip, head, seed, crouch):
    hx, hy = head
    # eye slit (paper highlight reads at 1-2px)
    disc(cv, hx + 2.3, hy + 3.0, 0.95, PAL_PAPER, 0.85, seed ^ 0x81, 0.1)
    # single short gold chest strap (kept under the 5% accent budget)
    brush(cv, [(chest[0] + 1.4, chest[1] + 1.2), (chest[0] + 3.4, chest[1] + 2.8)],
          0.48, PAL_GOLD, 0.7, seed ^ 0x83, 0.1, dry=0.35)
    # collar line (muted)
    brush(cv, [(hx - 1.0, hy + 6.0), (hx - 3.4, hy + 8.2)], 0.6, PAL_MUTED, 0.7, seed ^ 0x84, 0.1, dry=0.3)
    # obi knot (vermilion, breakable)
    disc(cv, hip[0] - 5.2 + p["lean"] * 0.4, hip[1] + 0.4, 1.1, PAL_VERM, 0.95, seed ^ 0x85, 0.26)
    disc(cv, hip[0] - 3.9 + p["lean"] * 0.4, hip[1] + 0.9, 0.62, PAL_VERM, 0.85, seed ^ 0x86, 0.3)


def _spark(cv: Canvas, tip, dirv, seed: int):
    # two short gold marks where the cut lands: well under 0.5% of the cell
    for k, (a, ln) in enumerate(((-1.1, 1.9), (0.7, 1.4))):
        dx, dy = math.cos(a), math.sin(a)
        b0 = (tip[0] - dx * 0.7, tip[1] - dy * 0.7)
        b1 = (tip[0] + dx * ln, tip[1] + dy * ln)
        brush(cv, [b0, b1], 0.6, PAL_GOLD, 0.9, (seed ^ (0x91 + k)), 0.12, dry=0.2)


def _draw_lying(cv: Canvas, p: dict, seed: int) -> None:
    """Death frames 5-7: horizontal slump facing right, blade laid down."""
    φ = {5: 0.0, 6: 1.0, 7: 2.0}[p["lie"]]
    sink = 0.8 + 0.35 * φ
    body_y = 49.6 + sink * 0.6
    pad_y = 52.4 + 0.7 * φ

    ground(cv, (34.5, FEET_Y - 2.0), 13.0 + 2.5 * φ, seed ^ 0x77,
           alpha=0.11 + 0.02 * φ, streak=True, ry_scale=0.14)
    # legs pool (hakama crumpled, slightly higher than the torso)
    brush(cv, [(19.5, body_y + 2.2), (25.0, pad_y - 1.2), (31.5, body_y + 0.4)],
          (5.0, 5.2), PAL_INK, 0.95, seed ^ 0xA1, 0.7, dry=0.32)
    # torso: shoulder-to-hip ridge with a belly sag toward paper
    brush(cv, [(29.5, body_y + 0.6), (38.5, body_y - 1.0), (43.0, body_y - 0.2)],
          (5.4, 4.9), PAL_INK, 0.96, seed ^ 0xA2, 0.5, dry=0.28)
    # arm reaching forward past the shoulder
    brush(cv, [(43.6, body_y - 0.8), (48.6, pad_y - 2.6), (52.6, pad_y - 1.0)],
          (2.1, 1.7), PAL_INK, 0.92, seed ^ 0xA3, 0.4, dry=0.3)
    # helmet lying: dome hinged to the torso + small horn up
    disc(cv, 46.6 + 0.4 * φ, body_y - 2.6, 3.6, PAL_INK, 0.97, seed ^ 0xA4, 0.25)
    brush(cv, [(45.2, body_y - 5.8), (46.0, body_y - 7.8)], 1.0, PAL_INK,
          0.95, seed ^ 0xA5, 0.3, dry=0.25)
    # face sliver
    disc(cv, 48.6 + 0.4 * φ, body_y - 1.4, 2.2, PAL_INK, 0.92, seed ^ 0xA6, 0.3)
    disc(cv, 49.4 + 0.4 * φ, body_y - 1.2, 0.95, PAL_PAPER, 0.6, seed ^ 0xA7, 0.1)
    # blade laid flat beside the body with a paper edge
    brush(cv, [(47.5, FEET_Y - 3.0), (56.0, FEET_Y - 3.4)], (1.1, 0.35),
          PAL_INK, 0.95, seed ^ 0xA9, 0.2, dry=0.2)
    brush(cv, [(40.5, FEET_Y - 2.2), (46.5, FEET_Y - 2.9)], 1.5, PAL_INK,
          0.95, seed ^ 0xA8, 0.2, dry=0.22)
    brush(cv, [(48.5, FEET_Y - 4.0), (55.0, FEET_Y - 4.3)], 0.5,
          PAL_PAPER, 0.5, seed ^ 0xAA, 0.1, dry=0.3)
    # dried blood stain (vermilion dark, tiny)
    disc(cv, 36.5 + 0.3 * φ, body_y + 3.6, 1.5, PAL_VERMD, 0.55, seed ^ 0xAB, 0.4)


# ---------------------------------------------------------------------------
# Atlas assembly.
# ---------------------------------------------------------------------------
CLIPS = ["idle", "walk", "attack", "hurt", "empty", "death"]
FRAME_ORDER = (
    [f"idle_{i:02d}.png" for i in range(8)]
    + [f"walk_{i:02d}.png" for i in range(8)]
    + [f"attack_{i:02d}.png" for i in range(8)]
    + [f"hurt_{i:02d}.png" for i in range(6)]
    + ["empty_30.png", "empty_31.png"]
    + [f"death_{i:02d}.png" for i in range(8)]
)

POSE_FNS = {
    "idle": pose_idle,
    "walk": pose_walk,
    "attack": pose_attack,
    "hurt": pose_hurt,
    "death": pose_death,
}


def render_frame(clip: str, index: int) -> Canvas:
    cv = Canvas(CELL, CELL)
    seed = (CLIPS.index(clip) ^ 0x5EED) * 131 + index * 7 + 17
    if clip != "empty":
        draw_samurai(cv, POSE_FNS[clip](index), seed)
    cv.clamp_margins()
    return cv


def render_atlas() -> tuple[list[float], int, int]:
    w, h = COLS * CELL, ROWS * CELL
    a = [0.0] * (w * h)
    r = [0] * (w * h)
    g = [0] * (w * h)
    b = [0] * (w * h)
    for fid, name in enumerate(FRAME_ORDER):
        clip = name[: name.rindex("_")]
        idx = int(name[-6:-4])
        cv = render_frame(clip, idx)
        ox = (fid % COLS) * CELL
        oy = (fid // COLS) * CELL
        for y in range(CELL):
            row = (oy + y) * w + ox
            src = y * CELL
            for x in range(CELL):
                i = row + x
                j = src + x
                da = a[i]
                sa = cv.a[j]
                if sa >= da or sa < 1.0:
                    pass
                na = sa + da * (1.0 - sa)
                a[i] = na
                if sa > 0.0 and (da <= 0.0 or sa > 0.995):
                    r[i], g[i], b[i] = cv.r[j], cv.g[j], cv.b[j]
    return [a, r, g, b], w, h


def png_bytes(cv_r, cv_g, cv_b, cv_a, w: int, h: int) -> bytes:
    raw = bytearray()
    for y in range(h):
        raw.append(0)  # filter type 0
        row = y * w
        for x in range(w):
            i = row + x
            raw.append(cv_r[i])
            raw.append(cv_g[i])
            raw.append(cv_b[i])
            av = cv_a[i]
            raw.append(0 if av <= 0.006 else int(av * 255.0 + 0.5) if av < 1.0 else 255)
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            len(data).to_bytes(4, "big") + tag + data
            + (zlib.crc32(tag + data) & 0xFFFFFFFF).to_bytes(4, "big")
        )
    ihdr = (w.to_bytes(4, "big") + h.to_bytes(4, "big")
            + bytes([8, 6, 0, 0, 0]))  # 8-bit RGBA
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )


def save_png_atomic(path: Path, w: int, h: int) -> None:
    (a, r, g, b), W, H = render_atlas()
    assert W == w and H == h
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_bytes(png_bytes(r, g, b, a, w, h))
    tmp.replace(path)


# ---------------------------------------------------------------------------
# Helper sheet for quick visual iteration (not a shipped asset).
# ---------------------------------------------------------------------------
def save_sheet(frames, path: Path, zoom: int = 3) -> None:
    from PIL import Image

    imgs = []
    for clip, idx in frames:
        cv = render_frame(clip, idx)
        rgba = []
        ah = cv.a
        for i in range(CELL * CELL):
            rgba.append((cv.r[i], cv.g[i], cv.b[i], int(ah[i] * 255)))
        img = Image.new("RGBA", (CELL, CELL))
        img.putdata(rgba)
        imgs.append(img)
    bg = Image.new("RGBA", (CELL * len(imgs) * zoom, CELL * zoom), (232, 227, 212, 255))
    for k, img in enumerate(imgs):
        img = img.resize((CELL * zoom, CELL * zoom), Image.NEAREST)
        bg.alpha_composite(img, (k * CELL * zoom, 0))
    path.parent.mkdir(parents=True, exist_ok=True)
    bg.save(path)


# ---------------------------------------------------------------------------
def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--atlas", type=Path, default=Path(
        "src/games/hitandrun/assets/themes/sumi-e/enemies/samurai.png"))
    ap.add_argument("--json-dir", type=Path, default=None,
                    help="write atlas.json / animations.json here (default: next to --atlas)")
    ap.add_argument("--frames", type=str, default=None,
                    help="comma list like idle:0,attack:3 -> helper sheet only")
    ap.add_argument("--out-sheet", type=Path, default=None)
    ap.add_argument("--zoom", type=int, default=3)
    args = ap.parse_args()

    if args.frames:
        parsed = []
        for tok in args.frames.split(","):
            clip, idx = tok.split(":")
            parsed.append((clip.strip(), int(idx)))
        out = args.out_sheet or Path("docs/hitandrun/sumi-e/prototype-frames.png")
        save_sheet(parsed, out, args.zoom)
        print(f"sheet -> {out}")
        return

    root = args.atlas.parent
    save_png_atomic(args.atlas, COLS * CELL, ROWS * CELL)
    print(f"atlas -> {args.atlas}")

    jdir = args.json_dir or root
    atlas_json = {
        "frames": {
            name: {
                "frame": {
                    "x": (i % COLS) * CELL,
                    "y": (i // COLS) * CELL,
                    "w": CELL, "h": CELL,
                },
                "rotated": False,
                "trimmed": False,
                "spriteSourceSize": {"x": 0, "y": 0, "w": CELL, "h": CELL},
                "sourceSize": {"w": CELL, "h": CELL},
                "pivot": {"x": 0.5, "y": 0.94},
            }
            for i, name in enumerate(FRAME_ORDER)
        },
        "meta": {
            "app": "TinyAster Hit & Run (sumi-e generator)",
            "version": "1.0",
            "image": args.atlas.name,
            "format": "RGBA8888",
            "size": {"w": COLS * CELL, "h": ROWS * CELL},
            "scale": "1",
            "frameOrder": list(FRAME_ORDER),
        },
    }
    (jdir / (args.atlas.stem + ".atlas.json")).write_text(
        json.dumps(atlas_json, indent=2) + "\n", encoding="utf-8")

    anims = {
        "idle":   {"frames": list(range(0, 8)), "frameRate": 8, "loop": True},
        "walk":   {"frames": list(range(8, 16)), "frameRate": 10, "loop": True},
        "attack": {"frames": list(range(16, 24)), "frameRate": 14, "loop": False},
        "hurt":   {"frames": list(range(24, 30)), "frameRate": 16, "loop": False},
        "death":  {"frames": list(range(32, 40)), "frameRate": 10, "loop": False},
    }
    animations_json = {
        "cellSize": CELL,
        "columns": COLS,
        "rows": ROWS,
        "anchor": {"x": 0.5, "y": 0.94},
        "animations": anims,
        "frameOrder": list(FRAME_ORDER),
    }
    (jdir / (args.atlas.stem + ".animations.json")).write_text(
        json.dumps(animations_json, indent=2) + "\n", encoding="utf-8")
    print(f"json  -> {jdir}")


if __name__ == "__main__":
    main()
