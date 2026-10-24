# Frogger visual baseline — Phase 0

## Approved reference

The current art direction is the portrait «Hora punta» screenshot: sunset palette, dark ink asphalt, teal river, warm banks, low-contrast texture, soft shadows and compact HUD.

The image's target composition is recorded in `FROGGER_VISUAL_REFERENCE` in `src/games/frogger/rendering/FroggerVisualTokens.ts`:

- Reference viewport: 390 × 844 px.
- HUD reference height: 90 px.
- Playfield reference height: 754 px.
- Logical grid currently defined by Frogger: 20 columns × 15 rows, `GRID_SIZE = 40`.

The viewport values are **reference values only**. They must not be used as simulation dimensions or replace the runtime screen size. Frogger's logical board is determined by the game configuration; the renderer fits the configured viewport into the runtime screen while preserving aspect ratio.

## Baseline findings (before phase 1)

1. `FroggerPresentation.ts` registered `drawTurtleCanvas` for `crocodile` even though a dedicated `drawCrocodileCanvas` existed; phase 1 corrected the registration and added coverage in both backends.
2. Drawing backends used theme fallbacks and inline colors that could introduce neon colors and palette drift; phases 1–2 now use shared semantic tokens for the agreed art direction.
3. The Canvas renderer computes a uniform scale from runtime `ScreenConfig` and `resolveViewportDimensions(GameConfig)`, centers the viewport and clips to it. This work intentionally leaves runtime viewport settings unchanged until screenshot validation can be performed.
4. Focused presentation tests and simulation lifecycle tests are extended rather than replaced.

## Capture / manual verification matrix

Capture the same deterministic initial state (fixed seed and unchanged gameplay) for each renderer at these target sizes:

| Target | Purpose | Pass condition |
|---|---|---|
| 390 × 844 | Primary portrait reference | All configured rows and controls remain visible; no accidental clipping or overlap. |
| 360 × 800 | Smaller portrait screen | HUD and field remain legible; no horizontal scrolling or cropped critical lanes. |
| Wide simulator/browser | Backend parity sanity check | Same entity colors, sizes and ordering; expected letterboxing is consistent. |

The existing repository tests do not capture full app screenshots. Do not claim screenshot-baseline validation until the app has been run in a browser/device and the captured images reviewed.

## Phase 0/1 exit criteria

- [x] Record the target composition and logical grid separately.
- [x] Centralize semantic art tokens shared by Canvas and Skia.
- [x] Correct and test the Canvas crocodile drawer registration.
- [x] Test the visual reference constants and fixed palette values.
- [ ] Run the app on target viewports and review screenshots from both renderers.
- [ ] Confirm runtime frame rate and visible area on a real or emulated mobile device.

## Phase 2 — Environment treatment

Implemented in the `feat/frogger-sunset-environment` branch:

- [x] Shared row constants define the top goal bank, five river rows, safe median, five road lanes and three-row start bank.
- [x] Canvas and Skia use the same three-stop river palette (`#17A3A3` → `#16949C` → `#0F6E7A`).
- [x] Water uses restrained, slow-moving wave marks rather than a bright full-width grid.
- [x] The safe median has a warm surface and edge treatment, distinct from river and road.
- [x] The asphalt uses four low-contrast dotted separators to read as five lanes.
- [x] The start bank has subtle paving seams and warm edge highlights.
- [x] A cached Skia gradient shader avoids recreating the river shader every frame.
- [x] Tests cover the logical zone boundaries and key background palette tokens.
- [ ] Capture and compare runtime screenshots for Canvas and Skia at the target viewport sizes.
- [ ] Confirm frame-time impact on mobile hardware/emulator.

These checks deliberately do not modify entity positions, gameplay rows, collision bounds, scoring, or simulation timing.
