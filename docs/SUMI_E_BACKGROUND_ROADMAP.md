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

## Phase 3 — Atmosphere & depth ✅

| Feature | Module |
|---------|--------|
| 6-layer atmosphere stack | `ATMOSPHERE_INK_WASH_LAYERS` |
| Mist bands (deterministic) | `computeMistBands` / `drawMistBandsCanvas` |
| Ambient particles (petal, ink_dot, bird) | `spawnAmbientParticle` / `spawnAmbientBand` |
| Regional presets | `getRegionalAtmosphere("mountain"\|"coast"\|"forest"\|"winter"\|"village")` |
| ParallaxSystem coupling | `inkDepthToParallaxLayer` / `cameraXForInkLayer` |

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

## Phase 4 — Polish ✅

| Feature | API |
|---------|-----|
| Quality presets | `resolveSumiERenderSettings("low"\|"medium"\|"high"\|"ultra")` |
| Accessibility | `{ reduceMotion, highContrast, disableParallax, disableParticles }` |
| Layer trimming | `selectLayers(layers, maxLayers)` |
| High-contrast colors | `contrastColors(true)` |
| Debug overlay | `drawSumiEDebugOverlayCanvas(ctx, snapshot)` + resource `SumiEDebug` |
| Determinism tests | `sumi-e/__tests__/InkWashDeterminism.test.ts` |

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
