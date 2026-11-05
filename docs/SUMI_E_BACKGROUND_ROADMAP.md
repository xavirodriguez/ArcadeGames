# Sumi-e / Shan-shui Background Integration Roadmap

Branch: `feature/sumi-e-background-integration`

## Phase 0 — Foundation ✅

InkWash Skia + options, SumiEPalette, AestheticTheme, registrable `ink-wash-parallax`.

## Phase 1 — Cross-game adoption (partial) ✅*

- Helper `registerSumiEBackground` / `registerSumiEVFX`
- **Asteroids** wired (mountain)
- Remaining games: same 2-line pattern

## Phase 2 — Juice vocabulary ✅

Primitives: `ink_splash`, `ink_bleed`, `brush_stroke`, `dry_brush_trail`, `seal_stamp`, `mist_layer`, `water_ripple`, `floating_kanji`

Catalog: `SUMI_E_JUICE_CATALOG` + Canvas/Skia drawers.

## Phase 3 — Atmosphere & depth ✅ (activated in Asteroids)

| Feature | Module | Status |
| --- | --- | --- |
| 6-layer atmosphere stack | `ATMOSPHERE_INK_WASH_LAYERS` | ✅ |
| Mist bands (deterministic) | `computeMistBands` / `drawMistBandsCanvas` / `drawMistBandsSkia` | ✅ wired via `registerSumiEBackground` |
| Ambient particles (petal, ink_dot, bird) | `spawnAmbientParticle` / `spawnAmbientBand` | ⏳ helpers ready; pool wiring pending |
| Regional presets | `getRegionalAtmosphere(...)` | ✅ used by register path |
| ParallaxSystem coupling | `inkDepthToParallaxLayer` / `cameraXForInkLayer` | ✅ exported |

```ts
import {
  getRegionalAtmosphere,
  computeMistBands,
  drawMistBandsCanvas,
  spawnAmbientBand
} from "../../shared/rendering/sumi-e";

const region = getRegionalAtmosphere("coast");
// use region.layers with registerSumiEBackground / computeInkWashLayers
const mist = computeMistBands(h, timeSec, cameraX, region.mist);
drawMistBandsCanvas(ctx, w, mist);
```

**Activation (2026-11-05):** `registerSumiEBackground` now resolves regional atmosphere (layers + mist), applies `resolveSumiERenderSettings` / `selectLayers`, and draws mist bands on both Canvas and Skia. Asteroids uses `{ landscape: "mountain", quality: "high" }`.

## Phase 4 — Polish ✅ (settings path live)

| Feature | API | Status |
| --- | --- | --- |
| Quality presets | `resolveSumiERenderSettings("low"\|"medium"\|"high"\|"ultra")` | ✅ applied on register |
| Accessibility | `{ reduceMotion, highContrast, disableParallax, disableParticles }` | ✅ applied on register |
| Layer trimming | `selectLayers(layers, maxLayers)` | ✅ applied on register |
| High-contrast colors | `contrastColors(true)` | ✅ applied on register |
| Debug overlay | `drawSumiEDebugOverlayCanvas` + resource `SumiEDebug` | ✅ Canvas path when `world.setResource("SumiEDebug", true)` |
| Determinism tests | `sumi-e/__tests__/InkWashDeterminism.test.ts` | ✅ |

```ts
const settings = resolveSumiERenderSettings("medium", { reduceMotion: true });
const layers = selectLayers(getLayerStack("atmosphere"), settings.maxLayers);
// step: settings.step, parallax: settings.parallax, ...
```

## Design principles

1. Deterministic geometry
2. Canvas ↔ Skia parity
3. Shared module first
4. Subtle juice / a11y by default
5. Cosmic/neon remain opt-in

## Module map

```
src/games/shared/rendering/sumi-e/
  SumiEPalette.ts
  AestheticTheme.ts
  InkWashBackgroundEffect.ts
  registerSumiEBackground.ts
  SumiEJuice.ts
  SumiEShapeDrawers.ts
  SumiEAtmosphere.ts      # Phase 3
  SumiEPerformance.ts     # Phase 4
  SumiEDebugOverlay.ts    # Phase 4
  index.ts
  __tests__/InkWashDeterminism.test.ts
```
