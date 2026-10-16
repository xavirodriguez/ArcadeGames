# Evolutionary Roadmap: ArcadeGames × JavaScript Racer

**Target:** `docs/OUTRUN_JAVASCRIPT_RACER_EVOLUTION_ROADMAP.md`
**Repository:** [xavirodriguez/ArcadeGames](https://github.com/xavirodriguez/ArcadeGames)
**Reference implementation:** [jakesgordon/javascript-racer](https://github.com/jakesgordon/javascript-racer)

**Status:** Implementation roadmap — verified against current checkout (`src/games/outrun/`).

---

## 1. Objective

Improve the visual quality, geometric correctness, driving feel, and maintainability of the Out Run implementation in ArcadeGames by selectively adopting proven techniques from JavaScript Racer.

The objective is not to reproduce Jake Gordon's architecture or appearance. It is to identify the techniques that improve ArcadeGames while preserving its existing strengths:

- ECS-based simulation (`World`, `BaseGame`, `RaceStateComponent`, `RacerComponent`).
- Deterministic gameplay and seeded procedural generation (`world.gameplayRandom`, `scenarioHash`).
- Strict TypeScript and explicit data contracts (`RoadSegment`, `RoadData`, `OutrunConfig`).
- Shared road projection (`projectRoad`) and preallocated rendering buffers (`projectionBuffer`).
- Dual Canvas2D and Skia renderers (`OutrunCanvasVisuals.ts`, `OutrunSkiaVisuals.ts`).
- Existing gameplay behavior, track generation, and art direction (`OUTRUN_ART.md`).

**Guiding principle:** measure first, fix correctness second, improve track authoring third, and polish presentation only after the underlying geometry behaves correctly.

---

## 2. Scope and Evidence Policy

The JavaScript Racer observations in this document derive from its `v4.final.html` and `common.js` implementation, including the track builder, road projection, sprite rendering, traffic steering, and background parallax.

The ArcadeGames observations derive from direct inspection and test verification of `src/games/outrun/`.

### Verified Checkout Evidence Summary

- `src/games/outrun/rendering/RoadProjection.ts`:
  - Near-plane check uses `p1z > 0 ? cameraDepth / p1z : cameraDepth / 0.001`. Unbounded scales occur when `p1z <= 0`.
  - Max Y occlusion tracking (`dest.clip = maxy; if (projY2 < maxy) maxy = projY2`) is active and shared across Canvas and Skia.
  - Linear fog (`fog = Math.min(1, Math.max(0, i / maxProject))`) is calculated in projection; drawn in Canvas but omitted in Skia.
- `src/games/outrun/OutrunGame.ts`:
  - `generateRoad()` builds track sections with discrete step blocks (`add(len, curve, hill)`), causing abrupt curvature changes.
- `src/games/outrun/systems/RoadAdvanceSystem.ts`:
  - Handles continuous `playerZ` advancement and wraparound gracefully across variable track lengths.
- `src/games/outrun/systems/TrafficSystem.ts`:
  - Performs direct `(z, lateralX)` bounding box checks; lacks predictive traffic lookahead steering.
- `src/games/outrun/rendering/OutrunRenderShared.ts`:
  - Shared projection buffer (`PROJECTION_CAPACITY = 400`) and sprite visitor (`iterateOutrunSprites`) handle hill occlusion clipping back-to-front.

### Evidence Labels

- **Verified:** reproduced in the current source or through an executable test.
- **Not present:** inspected and confirmed that the proposed capability is missing.
- **Already solved:** existing implementation meets the requirement.
- **Needs investigation:** insufficient evidence to make an implementation decision.
- **Deferred:** technically possible but not justified by current visual or gameplay priorities.

---

## 3. Architectural Constraints

Every change must preserve the following invariants.

### 3.1 Simulation and Determinism

- Keep gameplay state inside the existing ECS resources and components (`RaceStateComponent`, `RacerComponent`, `RoadData`).
- Preserve seeded random generation through `world.gameplayRandom`.
- Do not introduce `Math.random()` into deterministic gameplay or procedural track generation.
- Do not introduce mutable system-level state when the existing ECS model can represent it.
- Keep simulation time units consistent with existing engine conventions (`deltaTime` in seconds).
- Preserve reproducibility for identical initial state, input sequences, and seeds.

### 3.2 Geometry and Rendering

- Keep one authoritative road representation (`projectRoad` in `RoadProjection.ts`) shared by Canvas and Skia.
- Reuse the existing preallocated buffer (`projectionBuffer` in `OutrunRenderShared.ts`).
- Separate road geometry calculations from renderer-specific drawing commands.
- Avoid per-frame allocations in hot projection and rendering loops.
- Keep renderer-specific implementation details out of shared simulation logic.

### 3.3 Scope Control

- Do not introduce a new rendering backend, replace the ECS, migrate the engine, or copy JavaScript Racer's global-state architecture.
- Do not change `RoadSegment` or other shared data contracts unless the selected improvement requires it and the benefits justify the migration.

---

## 4. Reference Techniques Worth Adapting

| Technique | Reference behavior | Decision for ArcadeGames | Evidence Status |
|---|---|---|---|
| Eased track construction | `addRoad(enter, hold, leave, curve, y)` smooths curve transitions and elevation changes. | **High priority:** evaluate a deterministic stretch builder in `generateRoad()`. | **Not present** (`OutrunGame.ts` currently uses step blocks). |
| Absolute world elevation | Segment endpoints store world-space heights; camera height follows interpolated track elevation. | **Investigate:** compare with the current differential height integration (`hill`). | **Not present** (currently accumulates `dy += seg.hill`). |
| Partial-segment curve correction | Initial lateral offset compensates for camera position inside the current segment. | **Verify:** implement if projection continuity tests expose lateral popping. | **Not present** (`x, dx` accumulation starts at 0 without segment fractional offset). |
| Near-plane handling | Reference skips segments behind camera rather than geometrically clipping a straddling segment. | **Fix verified defect:** implement robust near-plane clipping for straddling segments. | **Verified defect** (`RoadProjection.ts` uses denominator clamp `0.001`). |
| Back-face culling | Rejects segments whose projected far edge lies below their near edge. | **Already solved:** maxy horizon occlusion clips hidden road trapezoids. | **Already solved** (`dest.clip = maxy` handles hill occlusion). |
| Occlusion-aware sprite clipping | Captures road occlusion boundary before drawing each segment. | **Already solved:** `iterateOutrunSprites` applies `clipY` during back-to-front pass. | **Already solved** (active in `OutrunCanvasVisuals.ts` and `OutrunSkiaVisuals.ts`). |
| Traffic lookahead | Scans upcoming segments for slower traffic and adjusts steering before overlap. | **Conditional:** inspect `TrafficSystem` lookahead needs. | **Not present** (`TrafficSystem.ts` uses immediate collision distance). |
| Curve-driven parallax | Scrolls background layers according to track curvature and distance traveled. | **Conditional:** evaluate adding curvature accumulation to horizon parallax. | **Not present** (parallax currently uses `playerX` and `playerZ` only). |
| Exponential fog | Applies distance-dependent fog to road polygons. | **Evaluate visually:** align fog model across Canvas and Skia. | **Needs investigation** (Canvas has linear fog; Skia lacks fog pass). |
| Segment traversal invariant | Limits movement to at most one segment per update to simplify collision handling. | **Already solved:** continuous Z space handling supports multi-segment movement. | **Already solved** (`RoadAdvanceSystem.ts` handles continuous delta Z). |

---

## 5. Phase 0 — Establish a Verified Baseline

**Priority:** P0
**Goal:** determine which proposed improvements solve real problems in the current checkout.

### T0.1 — Audit the Implementation (Completed)

Current source audit confirmed the following symbol and file mappings:
- `src/games/outrun/rendering/RoadProjection.ts`: `projectRoad()`, `createProjectionBuffer()`.
- `src/games/outrun/types/OutrunTypes.ts`: `RoadData`, `RoadSegment`, `RaceStateComponent`, `RacerComponent`.
- `src/games/outrun/OutrunGame.ts`: `generateRoad()`.
- `src/games/outrun/systems/RoadAdvanceSystem.ts`: `RoadAdvanceSystem`.
- `src/games/outrun/systems/TrafficSystem.ts`: `TrafficSystem`.
- `src/games/outrun/rendering/OutrunCanvasVisuals.ts` & `OutrunSkiaVisuals.ts`: Road, scenery, sprite, and HUD drawers.
- `src/games/outrun/__tests__/RoadProjection.test.ts` & `OutrunGameplay.test.ts`: Existing test suites (20/20 passing).

### T0.2 — Establish Deterministic Geometry Fixtures

Create or extend tests in `src/games/outrun/__tests__/RoadProjection.test.ts` for:
1. Straight road projection symmetry.
2. Constant left/right curve accumulation.
3. Ascent, crest, and descent height profile.
4. Crest with roadside sprite occlusion (`clipY`).
5. Near-plane straddling segment (`p1z <= 0 < p2z`).
6. Camera movement through curve across segment boundaries.
7. Track wraparound (`playerZ >= trackLength`).
8. Deterministic seed generation repeatability.

**Acceptance criteria**
- Fixtures reproduce reliably and fail on geometric regressions.
- Canvas and Skia drawers consume identical `ProjectedSegment` data.

### T0.3 — Capture the Visual Baseline

Record baseline behavior across Canvas and Skia renderers for representative track scenarios.

---

## 6. Phase 1 — Correctness and Visibility

**Priority:** P0
**Goal:** ensure road projection and occlusion logic produce valid geometry before changing the track.

### T1.1 — Handle Near-Plane Intersections Correctly

Replace the arbitrary `0.001` denominator clamp in `RoadProjection.ts` with linear camera-space interpolation for straddling segments (`p1z <= 0 < p2z`).

```typescript
// Replace:
const scale1 = p1z > 0 ? cameraDepth / p1z : cameraDepth / 0.001;

// With camera-space near-plane clipping:
const nearZ = 1.0; // Minimal valid positive depth
if (p1z < nearZ && p2z > nearZ) {
  const t = (nearZ - p1z) / (p2z - p1z);
  // Interpolate x, y at nearZ plane
}
```

**Acceptance criteria**
- No non-finite screen coordinates or oversized polygons from denominator clamps.
- Identical geometric clipping decisions for Canvas and Skia.

### T1.2 — Reconcile Road Visibility and Hill Occlusion

Ensure straddling or clipped near-plane segments do not corrupt `maxy` for subsequent segments.

### T1.3 — Correct Sprite and Scenery Occlusion

Ensure sprites on segments with `p1z <= 0` maintain valid projection parameters or are skipped safely.

---

## 7. Phase 2 — Improve Track Authoring

**Priority:** P0
**Goal:** replace abrupt track transitions with smooth, deterministic racing lines.

### T2.1 — Introduce an Eased Stretch Builder

Replace discrete step additions (`add(count, curve, hill)`) in `OutrunGame.ts` with an eased stretch builder:

```typescript
function addRoadStretch(
  segments: RoadSegment[],
  enterLength: number,
  holdLength: number,
  leaveLength: number,
  targetCurve: number,
  targetHill: number,
  segLen: number
): void {
  // Apply easeInOut interpolation over enter and leave sections
}
```

**Acceptance criteria**
- Entry and exit curve transitions use smooth `easeInOut` curves without abrupt jumps.
- Generated track geometry remains fully deterministic for identical seeds.

### T2.2 — Improve Elevation Transitions

Evaluate whether smooth `hill` interpolation in `addRoadStretch` provides adequate crest profiles before considering absolute height models.

### T2.3 — Eliminate Curve-Boundary Discontinuities

Add fractional current-segment offset calculation to `x` and `dx` initialization in `projectRoad()`.

---

## 8. Phase 3 — Renderer Parity and Depth Cues

**Priority:** P1
**Goal:** achieve consistent visual output across Canvas2D and Skia.

### T3.1 — Unify Palette Selection

Keep scenario palette resolution unified through `getScenarioPaletteAtZ` in `OutrunPalettes.ts`.

### T3.2 — Unify Fog Semantics

Add fog trapezoid rendering to `drawSkiaOutrunRoad` in `OutrunSkiaVisuals.ts` matching `OutrunCanvasVisuals.ts`.

### T3.3 — Evaluate Curve-Driven Background Parallax

Evaluate adding accumulated road curvature offsets to horizon mountain and sky parallax formulas.

---

## 9. Phase 4 — Traffic and Driving Feel

**Priority:** P2
**Goal:** improve traffic behavior and vehicle handling response.

### T4.1 — Evaluate Predictive Traffic Steering

Add bounded lookahead to `TrafficSystem.ts` so rival racers adjust `lateralX` before overlapping slower vehicles.

### T4.2 — Validate Centrifugal Force

Verify centrifugal force formula in `RoadAdvanceSystem.ts` across left and right curves.

---

## 10. Phase 5 — Runtime Safety and Performance

**Priority:** P2–P3
**Goal:** preserve zero-allocation rendering and verify performance.

### T5.1 — Validate Segment Advancement

Maintain continuous Z-space advancement and verify wraparound invariants in `RoadAdvanceSystem.ts`.

### T5.2 — Establish a Rendering Performance Baseline

Confirm `projectionBuffer` reuse avoids garbage collection pauses in 60 FPS rendering loops.

### T5.3 — Add Regression Guardrails

Maintain automated test coverage in `src/games/outrun/__tests__/`.

---

## 11. Validation Matrix

| Scenario | Required Checks | Preferred Verification |
|---|---|---|
| Straight road | Symmetry, horizon alignment | Unit tests in `RoadProjection.test.ts` |
| Curve transitions | Continuous lateral delta, no visual pop | Position sweep test |
| Near-plane intersection | Valid finite coordinates, no depth blowup | Boundary test with `p1z <= 0` |
| Crest & descent | Occlusion bounds (`maxy`), smooth hill profile | Projection fixture assertions |
| Sprite clipping | Road ridge clipping (`clipY`) | Visitor test in Canvas/Skia drawers |
| Identical seeds | Identical track length, segment curves | Seed repeatability tests |
| Canvas vs. Skia parity | Equal fog, palette, and geometry | Shared context assertions |

---

## 12. Prioritization and Dependencies

| Order | Task | Priority | Dependency | Decision |
|---|---|---|---|---|
| 1 | T0.1–T0.3: Audit & baseline | P0 | None | Completed / Verified |
| 2 | T1.1: Near-plane clipping | P0 | Confirmed defect | Fix near-plane `0.001` clamp |
| 3 | T2.1: Eased stretch builder | P0 | Generator audit | Primary visual authoring enhancement |
| 4 | T3.2: Skia fog parity | P1 | Shared rendering audit | Render parity fix for Skia |
| 5 | T4.1: Traffic lookahead | P2 | Gameplay audit | Conditional enhancement |
| 6 | T5.1–T5.3: Safety & regression | P2–P3 | Test suite | Continuous integration |

---

## 13. Definition of Done

- All changes preserve existing ECS resources, components, and deterministic RNG.
- Unit tests pass with zero regressions (`pnpm exec jest src/games/outrun`).
- Shared projection buffer produces identical geometry for Canvas2D and Skia.
- CI checks (`pnpm run ci`) pass cleanly.
