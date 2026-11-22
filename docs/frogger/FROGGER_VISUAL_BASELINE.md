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


## Phase 3 — Directional vehicles

Implemented on `feat/frogger-directional-vehicles`:

- [x] Cars use a low-profile, rounded silhouette whose rendered height is smaller than the existing gameplay collider.
- [x] Trucks have a light cargo body, warm cab, dark windshield and restrained panel seams.
- [x] Vehicle front and rear are derived from `Vehicle.direction`; local vehicle art is mirrored for left-moving traffic.
- [x] Warm headlamps, coral tail lamps and short low-opacity beams point in the actual travel direction.
- [x] Both Canvas and Skia use the same palette and geometry proportions.
- [x] Direction-sign helper tests and vehicle-palette assertions added.
- [x] Canvas tire placement avoids allocating a new position array per draw call.
- [ ] Capture side-by-side runtime images and verify lighting/orientation at mobile scale.
- [ ] Check that car and truck silhouettes remain legible with traffic moving in both directions on a device/emulator.

The phase changes only render instructions and semantic visual tokens. Vehicle speed, direction, transform, collider dimensions, collision layers and row layout remain unchanged.


## Phase 5 — Arcade HUD and screen composition

Implemented on `feat/frogger-arcade-hud`:

- [x] Replace the neon score row with a compact dark-ink panel using the shared art-direction palette.
- [x] Format score into grouped, zero-padded digits (for example, `004 250`) without modifying the actual score.
- [x] Render lives as small frog silhouettes, with remaining lives bright and lost lives muted; expose the exact count for accessibility.
- [x] Show the level label, occupied/total goals and remaining seconds.
- [x] Derive the timer bar from the current `FroggerState.timeRemaining` and the configured level time limit; change its accent to coral at 25% remaining or below.
- [x] Read the active runtime `GameConfig` for the configured initial lives and time-limit curve.
- [x] Recolor touch controls and the game-over/retry overlay to the sunset palette, removing the green neon styling from gameplay controls.
- [x] Add pure unit tests for score formatting, time-limit calculation and clamped timer progress.
- [ ] Verify the complete HUD and controls do not obscure active lanes at 390×844 and 360×800.
- [ ] Capture and compare the final HUD in Canvas and Skia on a real device/emulator.

## E2E baseline measurement (2026-11-22)

Static E2E run (`pnpm run test:e2e:baseline`) against `dist-e2e`, project `baseline`.
Spec: `e2e/frogger-baseline.spec.ts`. Captures: `docs/frogger/captures/before-*.png`.

Measurement: canvas rect height / 15 rows; band = rows 1–11 (top of row 1 → top of row 12).
`hudOverlaps` / `controlsOverlaps` = rect intersects that band.

| Viewport | canvas height | rowHeight | bandTop | bandBottom | HUD rect (top→bottom) | control buttons (top→bottom) | hudOverlaps | controlsOverlaps |
|---|---|---|---|---|---|---|---|---|
| 390×844 | 844 | 56.27 | 56.27 | 675.20 | 52→130 | 632→690, 694→752, 694→752, 756→814 | true | true |
| 360×800 | 800 | 53.33 | 53.33 | 640.00 | 52→130 | 588→646, 650→708, 650→708, 712→770 | true | true |
| 1280×720 | 720 | 48.00 | 48.00 | 576.00 | 52→130 | 508→566, 570→628, 570→628, 632→690 | true | true |

Classification of `hudOverlaps` (Tarea 3): **A — real overlap**. The HUD panel is absolutely positioned at
`top: 52` and spans ~78 px, so it covers rows 1–2 of the playfield at every measured viewport.
The measurement is not erroneous: the selector `[data-testid="frogger-hud"]` resolves to the HUD overlay,
the canvas rect is the full viewport, and the row band is rows 1–11 as required.

Controls measurement was corrected (B): the original selector matched the full-screen `box-none`
container (trivially overlapping every row). It now measures the actual `[role="button"]` elements.
Even with that correction the Move Up button still intersects the bottom of the row 1–11 band, so
`controlsOverlaps` remains true at all three viewports. Both are left as open defects of the Phase 5
criterion; the spec stays failing and outside the default CI job (`baseline` project).

Open defect: HUD and bottom dpad obscure active lanes (rows 1–2 top, rows ~10–11 bottom). Not fixed here.

The HUD reads existing game state and configuration. It introduces no changes to scoring, life awarding, timer ticks, gameplay configuration, input handling or collisions.
