#!/usr/bin/env python3
"""Generate the Sumi-e ronin PLAYER atlas for Hit & Run.

Second pilot of the Sumi-e family. Reuses the deterministic painter in
`generate_samurai_sumi_e.py` (palette snapping, brush, ground shadows, PNG
encoding) and only defines the player-specific skeleton, rifle and costume.

Contract (docs/hitandrun/sumi-e/ART_DIRECTION_BRIEF.md section 3):
  - atlas 512x320, grid 8x5, cell 64x64, 40 frames
  - clips: idle[0-7] walk[8-15] attack[16-23] hurt[24-29]
           empty[30-31] death[32-39]
  - anchor (0.5, 0.94) -> feet baseline at cell y approx 60
  - facing RIGHT (the renderer flips X)
  - PNG-32 straight alpha, palette-snapped to the shared 7 swatches
  - silhouette locks: kasa brim + long diagonal rifle + coat hem
  - no text, no logos, no baked background (soft ink ground shadow only)

Style/key-pose reference (NOT shippable, never sliced):
  docs/hitandrun/sumi-e/reference/samurai-main-char2-alpha.png

Usage:
  python3 generate_player_sumi_e.py --atlas <out.png> [--json-dir <dir>]
  python3 generate_player_sumi_e.py --frames idle:0,attack:2 --out-sheet <png>

Requires Pillow only for the helper sheet; rasterization is dependency-free.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from generate_samurai_sumi_e import (
    CELL,
    COLS,
    FEET_Y,
    PAL_GOLD,
    PAL_INK,
    PAL_MUTED,
    PAL_PAPER,
    PAL_VERM,
    PAL_VERMD,
    PAL_WASH,
    ROWS,
    Canvas,
    brush,
    disc,
    ground,
    png_bytes,
)

BASE_CX = 33.4
MARGIN = 2.0

# ---------------------------------------------------------------------------
# Pose skeleton (one 64x64 cell, facing right, feet on FEET_Y).
# ---------------------------------------------------------------------------
COMMON = {
    "lean": 0.0,        # torso lean (+ = forward/right)
    "bob": 0.0,         # upper-body bob (+ = down)
    "crouch": 0.0,      # death squash 0..1
    "front_dx": 0.0,    # front foot offset
    "front_dy": 0.0,    # front foot lift
    "back_dx": 0.0,     # back foot offset
    "sx": 0.0,          # coat hem sway (+ = trailing)
    "hand": (43.8, 31.4),  # foregrip hand
    "angle": -21.0,     # rifle direction, degrees (0 = +x, negative = up)
    "rlen": 14.2,       # foregrip -> muzzle
    "tilt": 0.0,        # kasa tilt (+ = brim dips forward)
    "flash": 0.0,       # muzzle flash 0..1 (attack only)
    "pool": 0.0,        # ink pool multiplier (death)
    "lie": None,        # custom lying pose (death frames 5-7)
}


def pose_idle(i: int) -> dict:
    p = 2.0 * math.pi * i / 8.0
    q = dict(COMMON)
    q["bob"] = 0.55 * math.sin(p + 0.4)
    q["lean"] = 0.40 * math.sin(p + 1.6)
    q["sx"] = 0.25 * math.sin(p)
    q["hand"] = (43.8 + 0.30 * math.sin(p), 31.4 + 0.55 * math.sin(p + 0.9))
    q["angle"] = -21.0 + 1.2 * math.sin(p + 2.0)
    q["tilt"] = 0.8 * math.sin(p + 0.3)
    return q


def pose_walk(i: int) -> dict:
    p = 2.0 * math.pi * i / 8.0
    q = dict(COMMON)
    q["bob"] = -1.0 * abs(math.sin(p)) + 0.2
    q["lean"] = 0.90
    q["front_dx"] = 3.6 * math.sin(p)
    q["back_dx"] = -3.4 * math.sin(p)
    q["front_dy"] = max(0.0, 1.6 * math.sin(p - 0.7)) if math.sin(p) > 0 else 0.0
    q["sx"] = 1.5 * math.sin(p)
    q["hand"] = (43.8 + 0.20 * math.sin(p), 31.2 + q["bob"] * 0.6)
    q["angle"] = -21.0 + 0.7 * math.sin(p + 1.0)
    q["tilt"] = 1.2 * math.sin(p - 0.2)
    return q


# shoot: aim -> brace -> fire -> recoil -> settle
ATTACK_KEYS = [
    dict(lean=0.8, bob=-0.2, hand=(43.7, 31.6), angle=-19.0, rlen=15.2),
    dict(lean=-0.5, bob=0.1, hand=(43.2, 31.1), angle=-20.5, rlen=15.1, front_dx=-0.4),
    dict(lean=-2.4, bob=0.5, hand=(42.4, 30.7), angle=-24.0, rlen=14.8, flash=1.0,
         front_dx=-1.0, sx=-0.5),
    dict(lean=-2.0, bob=0.6, hand=(42.7, 31.1), angle=-25.5, rlen=14.9, flash=0.35,
         front_dx=-0.8, sx=-0.4),
    dict(lean=-0.9, bob=0.3, hand=(43.6, 31.7), angle=-22.5, rlen=15.0, front_dx=-0.4),
    dict(lean=0.1, bob=0.1, hand=(43.6, 32.0), angle=-21.4, rlen=15.1),
    dict(lean=0.4, bob=0.0, hand=(43.7, 32.1), angle=-21.1, rlen=15.0),
    dict(lean=0.0, bob=0.0, hand=(43.8, 32.2), angle=-21.0, rlen=15.0),
]


def pose_attack(i: int) -> dict:
    q = {**COMMON, **ATTACK_KEYS[i]}
    q["hand"] = (q["hand"][0], q["hand"][1] - 0.8)
    q["angle"] -= 2.0
    return q


HURT_KEYS = [
    dict(lean=-3.6, bob=0.9, tilt=-7.0, hand=(41.8, 29.8), angle=-33.0, front_dx=-2.4,
         back_dx=-1.0, sx=-1.1),
    dict(lean=-3.0, bob=0.7, tilt=-6.0, hand=(42.2, 30.4), angle=-31.0, front_dx=-2.8,
         back_dx=-1.4, sx=-0.9),
    dict(lean=-1.9, bob=0.4, tilt=-4.0, hand=(42.8, 31.1), angle=-28.0, front_dx=-2.0,
         back_dx=-0.9, sx=-0.6),
    dict(lean=-0.9, bob=0.2, tilt=-2.0, hand=(43.2, 31.6), angle=-24.5, front_dx=-1.2,
         back_dx=-0.4, sx=-0.3),
    dict(lean=-0.3, bob=0.0, tilt=-0.6, hand=(43.4, 32.0), angle=-21.5, front_dx=-0.4,
         back_dx=-0.2),
    dict(lean=0.0, bob=0.0, hand=(43.8, 32.2), angle=-21.0),
]


def pose_hurt(i: int) -> dict:
    q = {**COMMON, **HURT_KEYS[i]}
    q["hand"] = (q["hand"][0], q["hand"][1] - 0.8)
    q["angle"] -= 2.0
    return q


def pose_death(i: int) -> dict:
    q = dict(COMMON)
    if i == 0:
        q.update(lean=-4.2, bob=1.0, tilt=-8.0, hand=(42.0, 31.6), angle=-35.0,
                 front_dx=-3.0, back_dx=-1.0, sx=0.9)
    elif i == 1:
        q.update(lean=-5.0, bob=3.0, crouch=0.35, tilt=-12.0, hand=(39.0, 35.0),
                 angle=-35.0, front_dx=-3.4, back_dx=0.6, sx=1.2)
    elif i == 2:
        q.update(lean=-4.0, bob=5.6, crouch=0.62, tilt=-16.0, hand=(38.2, 38.0),
                 angle=-45.0, front_dx=-2.6, back_dx=0.2, sx=1.4, pool=0.25)
    elif i == 3:
        q.update(lean=-2.6, bob=8.0, crouch=0.85, tilt=-20.0, hand=(38.0, 41.0),
                 angle=-38.0, front_dx=-1.8, back_dx=-0.8, sx=1.2, pool=0.55)
    elif i == 4:
        q.update(lean=-1.4, bob=10.2, crouch=1.0, tilt=-24.0, hand=(37.6, 43.4),
                 angle=-18.0, front_dx=-1.2, back_dx=-1.6, sx=0.8, pool=0.9)
    else:
        q["lie"] = i
        q["pool"] = 0.9 + 0.2 * i
    q["hand"] = (q["hand"][0], q["hand"][1] - 0.8)
    q["angle"] -= 2.0
    return q


# ---------------------------------------------------------------------------
# Frame painter.
# ---------------------------------------------------------------------------
def draw_player(cv: Canvas, p: dict, seed: int) -> None:
    if p.get("lie") is not None:
        _draw_lying(cv, p, seed)
        return

    crouch = p["crouch"]
    lean = p["lean"]
    bob = p["bob"]
    crs = math.sqrt(max(0.05, 1.0 - crouch))

    # -- derived skeleton (slimmer and taller than the samurai) --------------
    feet_y = FEET_Y - 1.5 * crouch
    pant_y = 55.6 + 1.0 * crouch       # trouser hem
    coat_y = 46.6 + 6.4 * crouch       # short coat hem
    waist_y = 41.0 + 8.0 * crouch
    chest = (BASE_CX + lean, 29.8 + bob * 0.45 + 10.0 * crouch)
    head = (chest[0] + 0.5 + lean * 0.35, chest[1] - 8.3 * crs - 0.2)
    sh_l = (chest[0] - 4.2, chest[1] + 1.0)
    sh_r = (chest[0] + 4.4, chest[1] + 1.2)
    hip = (BASE_CX + lean * 0.4, waist_y)
    foot_f = (hip[0] + 3.8 + p["front_dx"], feet_y - p["front_dy"] + 0.6 * crouch)
    foot_b = (hip[0] - 3.6 + p["back_dx"], feet_y + 0.4 * crouch)

    hand = p["hand"]
    ang = math.radians(p["angle"])
    bdx, bdy = math.cos(ang), math.sin(ang)
    muzzle = (hand[0] + bdx * p["rlen"], hand[1] + bdy * p["rlen"])
    stock = (hand[0] - bdx * 15.2, hand[1] - bdy * 15.2)
    breech = (hand[0] - bdx * 3.0, hand[1] - bdy * 3.0)

    # -- ink ground shadow ---------------------------------------------------
    ground(cv, (hip[0] + 4.2 + lean * 0.3, feet_y - 0.2),
           8.6 + 2.2 * crouch + 6.0 * p["pool"], seed,
           alpha=0.085, ry_scale=0.20)

    # -- sheathed katana behind the hip (breaks the back silhouette) ---------
    saya_tip = (hip[0] - 11.2 + lean * 0.2, waist_y + 1.4)
    saya_root = (hip[0] - 4.0, waist_y - 1.6)
    brush(cv, [saya_tip, saya_root], (1.15, 1.55), PAL_INK, 0.95, seed ^ 0x09, 0.35, dry=0.34)
    # paper edge along the scabbard so the tip reads against the coat
    brush(cv, [(saya_tip[0] + 0.6, saya_tip[1] - 1.0), (saya_root[0] - 0.8, saya_root[1] - 1.1)],
          0.32, PAL_PAPER, 0.35, seed ^ 0x0A, 0.1, dry=0.3)
    disc(cv, saya_root[0] - 0.2, saya_root[1] - 0.2, 1.25, PAL_INK, 0.95, seed ^ 0x0B, 0.2)

    # -- rear arm (supports the stock, stays behind the torso) ---------------
    brush(cv, [sh_l, (sh_l[0] + 1.0, sh_l[1] + 4.2),
               (stock[0] + bdx * 5.4, stock[1] + bdy * 5.4)],
          (2.0, 1.6), PAL_INK, 0.88, seed ^ 0x51, 0.4, dry=0.34)

    # -- legs: back leg in wash, front leg in ink (value separation) ---------
    _leg(cv, (hip[0] - 2.9, waist_y), (hip[0] - 3.9 + p["back_dx"] * 0.55, pant_y),
          foot_b, seed ^ 0x1A, back=True)
    _leg(cv, (hip[0] + 2.9, waist_y), (hip[0] + 4.1 + p["front_dx"] * 0.55, pant_y),
          foot_f, seed ^ 0x1B, back=False)

    # -- torso + shoulders ---------------------------------------------------
    brush(cv, [(chest[0], chest[1] - 1.2), (chest[0] - 0.4, waist_y - 1.0)],
          (2.9, 3.3), PAL_INK, 0.97, seed ^ 0x21, 0.38, dry=0.26)
    brush(cv, [(sh_l[0] - 0.4, sh_l[1] - 0.4), (sh_r[0] + 0.4, sh_r[1] - 0.2)],
          (2.4, 2.6), PAL_INK, 0.97, seed ^ 0x22, 0.45, dry=0.30)

    # -- short coat: back panel (wash) + two ink front panels ----------------
    brush(cv, [(hip[0] - 3.6, waist_y - 0.8), (hip[0] - 6.2 - p["sx"], coat_y)],
          (3.2, 3.7), PAL_INK, 0.96, seed ^ 0x31, 0.55, dry=0.3, taper_cap=False)
    brush(cv, [(hip[0] + 2.0, waist_y - 0.6), (hip[0] + 5.0 + p["sx"] * 0.4, coat_y)],
          (2.8, 3.2), PAL_INK, 0.96, seed ^ 0x32, 0.5, dry=0.3, taper_cap=False)
    # paper slit between the coat panels (negative space reads at 64px)
    brush(cv, [(hip[0] - 0.4, waist_y + 0.4), (hip[0] + 0.2, coat_y - 1.6)], (0.9, 1.0),
          PAL_PAPER, 0.18, seed ^ 0x33, 0.7, dry=0.5)

    # -- head + kasa ---------------------------------------------------------
    hx, hy = head
    brush(cv, [(hx - 0.2, hy + 4.2), (hx - 0.8, hy + 6.6)], (1.4, 1.2),
          PAL_INK, 0.92, seed ^ 0x41, 0.4, dry=0.35)
    _kasa(cv, hx, hy, seed, p["tilt"])

    # -- front arm + rifle ---------------------------------------------------
    brush(cv, [sh_r, (hand[0] - 1.8, hand[1] - 2.0), hand], (2.3, 1.8),
          PAL_INK, 0.95, seed ^ 0x52, 0.4, dry=0.28)
    _rifle(cv, p, hand, stock, breech, muzzle, (bdx, bdy), seed)

    # -- details -------------------------------------------------------------
    _details(cv, p, chest, hip, head, seed)

    if p["flash"] > 0.0:
        _muzzle_flash(cv, muzzle, ang, seed, p["flash"])

    if p["pool"] > 0.0:
        ground(cv, (hip[0] + 6.0, feet_y - 2.2), 12.0, seed ^ 0x77,
               alpha=0.13 * p["pool"], streak=True, ry_scale=0.16)


def _leg(cv: Canvas, top, hem, foot, seed: int, back: bool) -> None:
    color = PAL_INK
    alpha = 0.88 if back else 0.97
    knee = ((top[0] + hem[0]) * 0.5, (top[1] + hem[1]) * 0.52)
    brush(cv, [top, knee, hem], (3.0, 2.4), color, alpha, seed, 0.45, dry=0.3,
          taper_cap=False)
    # trouser cuff + bare foot
    disc(cv, hem[0], hem[1] + 0.6, 1.5, PAL_INK, 0.92, seed ^ 0x0D, 0.3)
    disc(cv, foot[0] - 0.8, foot[1], 2.1 if not back else 1.9, PAL_INK, 0.95,
         seed ^ 0x0E, 0.35)
    brush(cv, [(foot[0] - 0.8, foot[1] + 0.4), (foot[0] + 2.8, foot[1] + 0.3)],
          (1.4, 0.8), PAL_INK, 0.95, seed ^ 0x0F, 0.3, dry=0.3)
    if not back:
        # straw-sandal dash
        brush(cv, [(foot[0] - 0.2, foot[1] - 0.6), (foot[0] + 1.9, foot[1] - 0.5)],
              0.38, PAL_PAPER, 0.4, seed ^ 0x12, 0.1, dry=0.35)


def _kasa(cv: Canvas, hx: float, hy: float, seed: int, tilt: float) -> None:
    """Conical straw hat: apex + sloped sides + asymmetric broken brim."""
    t = tilt * 0.30
    apex = (hx - 0.4, hy - 7.4 + t * 0.15)
    left = (hx - 8.2, hy + 0.6 + t * 0.9)
    right = (hx + 8.4, hy + 0.2 - t * 0.9)
    brim = (hx - 8.8, hy + 1.7 + t * 1.0), (hx + 9.0, hy + 1.2 - t * 1.0)

    # triangular cone built from stacked horizontal passes (solid mass)
    brush(cv, [(hx - 5.6, hy - 0.4), (hx + 5.8, hy - 0.8)], 1.55,
          PAL_INK, 0.96, seed ^ 0x61, 0.35, dry=0.3)
    brush(cv, [(hx - 3.6, hy - 2.6), (hx + 3.8, hy - 2.9)], 1.35,
          PAL_INK, 0.96, seed ^ 0x62, 0.3, dry=0.3)
    brush(cv, [(hx - 1.9, hy - 4.6), (hx + 2.0, hy - 4.8)], 1.15,
          PAL_INK, 0.96, seed ^ 0x63, 0.3, dry=0.3)
    brush(cv, [apex, (hx + 0.4, hy - 5.8)], 0.9, PAL_INK, 0.96, seed ^ 0x64, 0.2, dry=0.25)
    # sloped sides
    brush(cv, [left, apex], (1.25, 0.7), PAL_INK, 0.96, seed ^ 0x65, 0.3, dry=0.3)
    brush(cv, [apex, right], (0.7, 1.25), PAL_INK, 0.96, seed ^ 0x66, 0.3, dry=0.3)
    # brim: one broad pass + a broken tip, asymmetric
    brush(cv, [brim[0], (hx - 2.2, hy + 2.0 + t * 0.4), (hx + 4.2, hy + 1.9 - t * 0.4)],
          (1.3, 1.15), PAL_INK, 0.97, seed ^ 0x67, 0.55, dry=0.32)
    brush(cv, [(hx + 3.4, hy + 1.8 - t * 0.5), brim[1]], (1.15, 0.8),
          PAL_INK, 0.95, seed ^ 0x68, 0.55, dry=0.38)
    # shaded face under the brim + eye slit (eye sits below the brim line)
    disc(cv, hx + 1.6, hy + 4.0, 2.3, PAL_INK, 0.94, seed ^ 0x69, 0.4)
    disc(cv, hx + 2.4, hy + 3.7, 0.55, PAL_PAPER, 0.8, seed ^ 0x6A, 0.08)
    # single paper glint on the brim top
    brush(cv, [(hx - 6.8, hy + 1.2 + t * 0.9), (hx - 3.6, hy + 1.0 + t * 0.5)], 0.3,
          PAL_PAPER, 0.4, seed ^ 0x6B, 0.1, dry=0.3)


def _rifle(cv: Canvas, p, hand, stock, breech, muzzle, d, seed) -> None:
    bdx, bdy = d
    # wooden stock + butt (behind the foregrip, at hip height)
    brush(cv, [stock, (stock[0] + bdx * 4.6, stock[1] + bdy * 4.6)], (2.2, 1.8),
          PAL_INK, 0.97, seed ^ 0x71, 0.25, dry=0.24, taper_cap=False)
    # receiver + barrel
    brush(cv, [breech, muzzle], (1.4, 0.5), PAL_INK, 0.97, seed ^ 0x72, 0.22, dry=0.18)
    # paper glint on the front third of the barrel top edge
    g0 = (breech[0] + bdx * p["rlen"] * 0.45 - bdy * 0.85,
          breech[1] + bdy * p["rlen"] * 0.45 + bdx * 0.85)
    brush(cv, [g0, (muzzle[0] - bdy * 0.65, muzzle[1] + bdx * 0.65)], 0.36,
          PAL_PAPER, 0.3, seed ^ 0x73, 0.1, dry=0.3)
    # butt plate catches one paper pixel
    brush(cv, [stock, (stock[0] + bdx * 0.9, stock[1] + bdy * 0.9)], 0.7,
          PAL_MUTED, 0.8, seed ^ 0x79, 0.15, dry=0.3)
    # dry-brush grain on the stock
    brush(cv, [(stock[0] + bdx * 1.0, stock[1] + bdy * 1.0 + 0.6),
               (stock[0] + bdx * 3.6, stock[1] + bdy * 3.6 + 0.4)], 0.4,
          PAL_MUTED, 0.45, seed ^ 0x74, 0.1, dry=0.4)
    # trigger guard loop (below the breech)
    nx, ny = -bdy, bdx
    g0 = (breech[0] + bdx * 0.6, breech[1] + bdy * 0.6)
    brush(cv, [g0, (g0[0] + nx * 1.5, g0[1] + ny * 1.5),
               (g0[0] + nx * 1.5 - bdx * 1.6, g0[1] + ny * 1.5 - bdy * 1.6)], 0.5,
          PAL_MUTED, 0.85, seed ^ 0x75, 0.15, dry=0.25)
    # gold front sight (only gold on the body: well under 0.5% of the cell)
    disc(cv, muzzle[0] - bdx * 1.8 - bdy * 0.9, muzzle[1] - bdy * 1.8 + bdx * 0.9,
         0.45, PAL_GOLD, 0.9, seed ^ 0x76, 0.2)
    # hands: foregrip + a rear grip tucked against the coat
    disc(cv, hand[0] + 0.2, hand[1] + 0.5, 2.0, PAL_INK, 0.97, seed ^ 0x77, 0.24)
    disc(cv, stock[0] + bdx * 4.0, stock[1] + bdy * 4.0, 1.55, PAL_INK, 0.9,
         seed ^ 0x78, 0.3)


def _details(cv: Canvas, p, chest, hip, head, seed) -> None:
    hx, hy = head
    # collar (open V, muted, keeps the chest from reading as a flat mass)
    brush(cv, [(hx - 1.2, hy + 6.8), (hx - 2.2, hy + 9.4)], 0.4, PAL_PAPER, 0.26,
          seed ^ 0x81, 0.1, dry=0.3)
    brush(cv, [(hx + 0.8, hy + 7.0), (hx + 1.8, hy + 9.2)], 0.34, PAL_PAPER, 0.2,
          seed ^ 0x82, 0.1, dry=0.35)
    # obi band + vermilion knot (single accent on the costume)
    brush(cv, [(hip[0] - 4.0, hip[1] - 0.4), (hip[0] + 4.0, hip[1])], 1.25,
          PAL_MUTED, 0.9, seed ^ 0x83, 0.2, dry=0.3)
    disc(cv, hip[0] - 3.9 + p["lean"] * 0.3, hip[1] + 0.3, 0.9, PAL_VERM, 0.95,
         seed ^ 0x84, 0.26)
    disc(cv, hip[0] - 2.9 + p["lean"] * 0.3, hip[1] + 0.7, 0.45, PAL_VERM, 0.85,
         seed ^ 0x85, 0.3)


def _muzzle_flash(cv: Canvas, muzzle, ang: float, seed: int, amount: float) -> None:
    for k, (spread, length, radius) in enumerate(((-0.5, 5.0, 1.0), (0.0, 5.6, 1.15),
                                                 (0.45, 4.2, 0.9))):
        a = ang + spread
        tip = (muzzle[0] + math.cos(a) * length * amount,
               muzzle[1] + math.sin(a) * length * amount)
        brush(cv, [muzzle, tip], (radius, radius * 0.22), PAL_GOLD, 0.9,
              seed ^ (0x91 + k), 0.12, dry=0.2)
    disc(cv, muzzle[0] + math.cos(ang) * 1.2, muzzle[1] + math.sin(ang) * 1.2,
         1.0 * amount, PAL_PAPER, 0.85, seed ^ 0x95, 0.1)


def _draw_lying(cv: Canvas, p: dict, seed: int) -> None:
    """Death frames 5-7: face-down slump with one knee up, kasa still on."""
    phase = {5: 0.0, 6: 1.0, 7: 2.0}[p["lie"]]
    sag = 0.35 * phase

    ground(cv, (33.0, FEET_Y - 1.2), 15.0 + 2.0 * phase, seed ^ 0x77,
           alpha=0.10 + 0.02 * phase, streak=True, ry_scale=0.12)

    # near leg: foot -> bent knee (up) -> hip, so the silhouette has an arch
    brush(cv, [(21.8, 55.6 + sag), (26.2, 55.2), (28.6, 53.0)],
          (2.2, 2.0), PAL_INK, 0.95, seed ^ 0xA1, 0.5, dry=0.3)
    brush(cv, [(28.6, 53.0), (32.4, 50.4 + sag), (35.8, 52.2 + sag)],
          (2.6, 3.4), PAL_INK, 0.95, seed ^ 0xA2, 0.45, dry=0.3)
    disc(cv, 21.0, 55.8 + sag, 1.7, PAL_INK, 0.95, seed ^ 0xA3, 0.3)
    brush(cv, [(20.4, 56.0 + sag), (18.4, 55.8 + sag)], (0.95, 0.6),
          PAL_INK, 0.95, seed ^ 0xA4, 0.25, dry=0.3)
    # torso: hip rises to a shoulder mass
    brush(cv, [(35.4, 52.6 + sag), (40.4, 50.6 + sag), (44.8, 51.4 + sag)],
          (3.9, 3.6), PAL_INK, 0.96, seed ^ 0xA5, 0.5, dry=0.28)
    # near arm reaching forward, hand flat on the paper
    brush(cv, [(43.8, 52.2 + sag), (48.0, 54.4), (51.6, 54.2)],
          (1.8, 1.3), PAL_INK, 0.93, seed ^ 0xA6, 0.4, dry=0.3)
    disc(cv, 52.0, 54.2, 1.3, PAL_INK, 0.95, seed ^ 0xA7, 0.3)
    # head + topknot, with a 1px paper break before the shoulder
    disc(cv, 48.2 + 0.3 * phase, 49.8 + sag, 2.8, PAL_INK, 0.97, seed ^ 0xA8, 0.26)
    brush(cv, [(46.8, 47.2 + sag), (46.0, 45.8 + sag)], 0.7, PAL_INK, 0.95,
          seed ^ 0xA9, 0.3, dry=0.25)
    # kasa still worn, edge-on: brim line + cone above the head
    hx, hy = 48.6 + 0.3 * phase, 48.0 + sag
    brush(cv, [(hx - 6.8, hy + 0.6), (hx - 1.2, hy - 0.4), (hx + 4.4, hy + 0.8)],
          (1.1, 0.9), PAL_INK, 0.95, seed ^ 0xAA, 0.5, dry=0.36)
    brush(cv, [(hx - 4.6, hy + 0.2), (hx - 0.2, hy - 4.4), (hx + 3.4, hy + 0.2)],
          (1.3, 0.65), PAL_INK, 0.95, seed ^ 0xAB, 0.4, dry=0.34)
    # rifle dropped on the paper, clear of the body mass
    brush(cv, [(44.4, FEET_Y - 1.0), (50.0, FEET_Y - 2.0), (58.0, FEET_Y - 2.6)],
          (1.2, 0.4), PAL_INK, 0.95, seed ^ 0xAC, 0.25, dry=0.2)
    brush(cv, [(42.2, FEET_Y - 1.0), (45.6, FEET_Y - 0.8)], 1.8, PAL_INK, 0.95,
          seed ^ 0xAD, 0.3, dry=0.3)
    brush(cv, [(48.8, FEET_Y - 2.9), (56.2, FEET_Y - 3.4)], 0.35, PAL_PAPER, 0.3,
          seed ^ 0xAE, 0.1, dry=0.3)
    # dried-vermilion stain, tiny
    disc(cv, 38.8 + 0.3 * phase, 55.0, 1.1, PAL_VERMD, 0.5, seed ^ 0xAF, 0.4)


# ---------------------------------------------------------------------------
# Atlas assembly (same frame map as the samurai pilot).
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
    seed = (CLIPS.index(clip) ^ 0x9E37) * 131 + index * 7 + 23
    if clip != "empty":
        draw_player(cv, POSE_FNS[clip](index), seed)
    cv.clamp_margins(MARGIN)
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
                na = sa + da * (1.0 - sa)
                a[i] = na
                if sa > 0.0 and (da <= 0.0 or sa > 0.995):
                    r[i], g[i], b[i] = cv.r[j], cv.g[j], cv.b[j]
    return [a, r, g, b], w, h


def save_atlas(path: Path) -> None:
    (a, r, g, b), w, h = render_atlas()
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_bytes(png_bytes(r, g, b, a, w, h))
    tmp.replace(path)


def save_sheet(frames, path: Path, zoom: int = 3) -> None:
    from PIL import Image

    imgs = []
    for clip, idx in frames:
        cv = render_frame(clip, idx)
        rgba = [
            (cv.r[i], cv.g[i], cv.b[i], int(cv.a[i] * 255))
            for i in range(CELL * CELL)
        ]
        img = Image.new("RGBA", (CELL, CELL))
        img.putdata(rgba)
        imgs.append(img)
    bg = Image.new("RGBA", (CELL * len(imgs) * zoom, CELL * zoom), (232, 227, 212, 255))
    for k, img in enumerate(imgs):
        bg.alpha_composite(img.resize((CELL * zoom, CELL * zoom), Image.NEAREST),
                           (k * CELL * zoom, 0))
    path.parent.mkdir(parents=True, exist_ok=True)
    bg.save(path)


def write_json(path: Path, atlas_path: Path) -> None:
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
            "app": "TinyAster Hit & Run (sumi-e player generator)",
            "version": "1.0",
            "image": atlas_path.name,
            "format": "RGBA8888",
            "size": {"w": COLS * CELL, "h": ROWS * CELL},
            "scale": "1",
            "frameOrder": list(FRAME_ORDER),
        },
    }
    (path / (atlas_path.stem + ".atlas.json")).write_text(
        json.dumps(atlas_json, indent=2) + "\n", encoding="utf-8")

    animations_json = {
        "cellSize": CELL,
        "columns": COLS,
        "rows": ROWS,
        "anchor": {"x": 0.5, "y": 0.94},
        "animations": {
            "idle":   {"frames": list(range(0, 8)), "frameRate": 8, "loop": True},
            "walk":   {"frames": list(range(8, 16)), "frameRate": 10, "loop": True},
            "attack": {"frames": list(range(16, 24)), "frameRate": 14, "loop": False},
            "hurt":   {"frames": list(range(24, 30)), "frameRate": 16, "loop": False},
            "death":  {"frames": list(range(32, 40)), "frameRate": 10, "loop": False},
        },
        "frameOrder": list(FRAME_ORDER),
    }
    (path / (atlas_path.stem + ".animations.json")).write_text(
        json.dumps(animations_json, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--atlas", type=Path, default=Path(
        "src/games/hitandrun/assets/themes/sumi-e/characters/player.png"))
    ap.add_argument("--json-dir", type=Path, default=None)
    ap.add_argument("--frames", type=str, default=None,
                    help="comma list like idle:0,attack:2 -> helper sheet only")
    ap.add_argument("--out-sheet", type=Path, default=None)
    ap.add_argument("--zoom", type=int, default=3)
    args = ap.parse_args()

    if args.frames:
        parsed = [tuple(tok.split(":")) for tok in args.frames.split(",")]
        parsed = [(clip.strip(), int(idx)) for clip, idx in parsed]
        out = args.out_sheet or Path("docs/hitandrun/sumi-e/player-prototype-frames.png")
        save_sheet(parsed, out, args.zoom)
        print(f"sheet -> {out}")
        return

    save_atlas(args.atlas)
    print(f"atlas -> {args.atlas}")
    write_json(args.json_dir or args.atlas.parent, args.atlas)
    print(f"json  -> {args.json_dir or args.atlas.parent}")


if __name__ == "__main__":
    main()
