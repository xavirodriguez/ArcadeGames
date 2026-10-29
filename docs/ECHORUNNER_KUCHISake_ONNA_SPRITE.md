# Echo Runner — Kuchisake-onna protagonist sprite

## Integration

Echo Runner's player shape now prefers the shared sprite pipeline sheet
`echorunner_kuchisake_onna`. Canvas and Skia use the same `SpriteAnimator`
state and the shared `drawSpriteCanvas` / `drawSpriteSkia` helpers. If the
PNG is not yet ready, the existing procedural pixel-art player remains the
fallback.

The original source image remains unchanged at
`assets/sprites/enemies/kichisake-onna.png` (1376×768). It is a labelled
contact sheet rather than a uniform grid, so the registry declares measured
source rectangles instead of pretending the sheet is a regular atlas.

## Source rectangles

| Clip | Source rectangle (x, y, w, h) | Notes |
|---|---:|---|
| `idle` | (360, 55, 145, 143) | Side-facing standing pose |
| `walk` | (695, 60, 160, 138) | Forward-leaning movement pose |
| `attack` | (680, 438, 180, 127) | Slash pose; pale arc is intentional artwork |
| `hurt` | (850, 250, 165, 125) | Broken-mask / reaction pose |
| `death` | (325, 645, 185, 90) | On-ground pose |

The source rectangles omit the printed headings and most contact-sheet labels.
The yellowish/ivory slash arc is preserved because it is part of the attack
illustration, not background contamination. The source image already has an
alpha channel; no destructive global colour-key was applied.

## Current limitations

- The source is a contact sheet, not a frame-by-frame animation atlas. The
  standing and movement clips currently use one representative frame each.
- Attack, hurt and death are representative poses, not full animated sequences.
- The existing procedural pixel-art drawer remains the graceful fallback if
  image loading fails.
- Review the sprite at native game scale on both Canvas and Skia before treating
  the visual integration as final art approval.

## Validation

Run `pnpm run sprites:validate` to validate source-image dimensions and frame
bounds, then run the repository CI command. Do not report either check as passing
unless it was executed.
