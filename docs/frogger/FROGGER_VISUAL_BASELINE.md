# Frogger visual baseline — Phase 0

## Approved reference

The current art direction is the portrait «Hora punta» screenshot: sunset palette, dark ink asphalt, teal river, warm banks, low-contrast texture, soft shadows and compact HUD.

The image's target composition is recorded in `FROGGER_VISUAL_REFERENCE` in `src/games/frogger/rendering/FroggerVisualTokens.ts`:

- Reference viewport: 390 × 844 px.
- HUD reference height: 90 px.
- Playfield reference height: 754 px.
- Logical grid currently defined by Frogger: 20 columns × 15 rows, `GRID_SIZE = 40`.

The viewport values are **reference values only**. They must not be used as simulation dimensions or replace the runtime screen size. Frogger's logical board is determined by the game configuration; the renderer fits the configured viewport into the runtime screen while preserving aspect ratio.

## Baseline findings

1. `FroggerPresentation.ts` registers separate Canvas and Skia drawing functions, but Canvas currently registers `drawTurtleCanvas` for `crocodile`, despite having a dedicated `drawCrocodileCanvas`.
2. `FroggerRenderUtils.ts` and both drawing backends currently use theme fallbacks and inline colors. That permits neon colors and palette drift between renderers.
3. The Canvas renderer computes a uniform scale from the runtime `ScreenConfig` and `resolveViewportDimensions(GameConfig)`, centers the viewport and clips to it. The Skia presentation needs to be checked in a running app against the same portrait and small-screen targets before changing any viewport settings.
4. The game already has focused presentation tests and simulation lifecycle tests. Extend those instead of replacing them.

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
