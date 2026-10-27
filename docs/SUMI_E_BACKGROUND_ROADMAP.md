# Sumi-e / Shan-shui Background Integration Roadmap

Goal: make the ink-wash parallax system and related procedural graphics the **default visual language** of the suite for a medieval Japan aesthetic (sumi-e / shan-shui).

Branch: `feature/sumi-e-background-integration`

## Phase 0 — Foundation (this PR)

- [x] Enhance `InkWashParallaxBackdrop` with:
  - Skia consumer (`drawInkWashLayersSkia`)
  - Convenience render helpers
  - Extra layer presets (`MOUNTAIN_INK_WASH_LAYERS`, `COASTAL_INK_WASH_LAYERS`)
  - `InkWashDrawOptions` (paperColor, alphaScale, yOffset)
- [x] Shared `SumiEPalette` + variants (classic / winter / forest)
- [x] `AestheticTheme` switch (`sumi-e` | `cosmic` | `neon`)
- [x] Registrable background effects:
  - `createInkWashCanvasEffect` / `createInkWashSkiaEffect`
  - Canonical name: `"ink-wash-parallax"`
- [x] Module barrel: `src/games/shared/rendering/sumi-e/`

### How to use (Phase 0)

```ts
import {
  getAestheticTheme,
  createInkWashCanvasEffect,
  createInkWashSkiaEffect,
  INK_WASH_EFFECT_NAME
} from "../../shared/rendering/sumi-e";

const theme = getAestheticTheme("sumi-e", { landscape: "mountain" });

if (renderer.type === "canvas") {
  renderer.registerBackgroundEffect(
    INK_WASH_EFFECT_NAME,
    createInkWashCanvasEffect(theme)
  );
} else if (renderer.type === "skia") {
  renderer.registerBackgroundEffect(
    INK_WASH_EFFECT_NAME,
    createInkWashSkiaEffect(theme)
  );
}
```

## Phase 1 — Cross-game adoption

| Game            | Priority | Suggested landscape |
|-----------------|----------|---------------------|
| Asteroids       | High     | mountain            |
| Flappy Bird     | High     | coastal             |
| Tower Defense   | High     | default / forest    |
| Space Invaders  | Medium   | default             |
| Pong            | Medium   | default (subtle)    |
| Platformer      | Medium   | forest / mountain   |
| Echo Runner     | Already partial | unify with shared module |
| Hit & Run       | Already advanced | migrate SumiETheme to shared tokens |

Tasks:
- Wire `AestheticTheme` into each game's `registerVisuals` / boot path.
- Replace or complement cosmic starfields when theme is `sumi-e`.
- Keep cosmic/neon as opt-in for classic arcade feel.

## Phase 2 — Juice vocabulary

Add SharedVFX primitives:
- `ink_splash` / `ink_bleed`
- `brush_stroke` / `dry_brush_trail`
- `seal_stamp`
- `mist_layer` / `water_ripple`
- `floating_kanji`

Map them in `JuiceOrchestrator` / `JUICE_CATALOG` for every supported gameId.

## Phase 3 — Atmosphere & depth

- More layers (architecture, birds, mist animation).
- Deeper integration with `ParallaxSystem` + `Camera2D`.
- Regional variants driven by `LevelThemeSystem`.
- Particle trails (leaves, petals, residual ink).

## Phase 4 — Polish

- Debug overlay for live layer editing.
- Performance presets (step size, layer count, grain off).
- Visual regression tests (Canvas vs Skia).
- Accessibility: high-contrast ink, reduced motion, no parallax option.

## Design principles

1. **Deterministic** — geometry stays pure (no RNG in `computeInkWashLayers`).
2. **Parity** — every Canvas path has a Skia twin.
3. **Reusable** — shared module first; game-specific code only when necessary.
4. **Subtle by default** — `preferSubtleJuice` for sumi-e (kanso, seijaku).
5. **Opt-in per game** — cosmic/neon remain available; sumi-e is the recommended medieval-Japan default.

## Related files

- `src/games/shared/rendering/InkWashParallaxBackdrop.ts`
- `src/games/shared/rendering/sumi-e/*`
- `src/games/hitandrun/rendering/theme/sumi-e/SumiETheme.ts` (origin)
- `src/games/shared/rendering/JuiceOrchestrator.ts`
- `src/games/shared/rendering/LevelThemeSystem.ts`
