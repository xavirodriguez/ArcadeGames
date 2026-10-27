# Sumi-e / Shan-shui Background Integration Roadmap

Goal: make the ink-wash parallax system and related procedural graphics the **default visual language** of the suite for a medieval Japan aesthetic (sumi-e / shan-shui).

Branch: `feature/sumi-e-background-integration`

## Phase 0 — Foundation ✅

- [x] Enhance `InkWashParallaxBackdrop` with Skia, options, landscape presets
- [x] Shared `SumiEPalette` + variants (classic / winter / forest)
- [x] `AestheticTheme` switch (`sumi-e` | `cosmic` | `neon`)
- [x] Registrable `ink-wash-parallax` effects (Canvas + Skia)
- [x] Module barrel: `src/games/shared/rendering/sumi-e/`

## Phase 1 — Cross-game adoption (in progress)

| Game            | Status | Landscape |
|-----------------|--------|-----------|
| **Asteroids**   | ✅ wired | mountain |
| Flappy Bird     | ⏳ pending | coastal |
| Tower Defense   | ⏳ pending | forest |
| Space Invaders  | ⏳ pending | default |
| Pong            | ⏳ pending | subtle |
| Platformer      | ⏳ pending | forest |
| Echo Runner     | partial (own inkwash) | unify |
| Hit & Run       | advanced SumiETheme | migrate tokens |

### One-call integration (any game)

```ts
import { registerSumiEBackground, registerSumiEVFX } from "../../shared/rendering/sumi-e";

// Inside initializeRenderer:
registerSumiEBackground(renderer, {
  aesthetic: "sumi-e",
  landscape: "mountain", // or "coastal" | "default"
  force: true            // register even alongside cosmic BGs
});
registerSumiEVFX(renderer); // ink_splash, seal_stamp, etc.
```

**Asteroids** already does this in `initializeRenderer` (mountain landscape).

## Phase 2 — Juice vocabulary ✅

New primitives (shape drawers + catalog):

| Primitive | Visual |
|-----------|--------|
| `ink_splash` | Irregular ink blot expanding |
| `ink_bleed` | Same family, softer |
| `brush_stroke` | Curved calligraphic stroke |
| `dry_brush_trail` | Thinner trail |
| `seal_stamp` | Vermilion square seal |
| `mist_layer` | Soft expanding wash |
| `water_ripple` | Concentric rings |
| `floating_kanji` | Seal-style glyph |

Files:
- `sumi-e/SumiEJuice.ts` — `SUMI_E_JUICE_CATALOG` for all SupportedGameId events
- `sumi-e/SumiEShapeDrawers.ts` — Canvas + Skia drawers + `registerSumiEVFX`

Usage:

```ts
import { getSumiEJuiceProfile, SUMI_E_PRIMITIVE_DEFAULTS } from "../../shared/rendering/sumi-e";

const profile = getSumiEJuiceProfile("asteroids", "rock:destroyed");
// → { effect: "ink_splash", tint: "#171817", ... }

// Or spawn directly once drawers are registered:
// juice.spawn("ink_splash", { x, y, scale: 1.1 });
```

To fully switch a game's juice to sumi-e, prefer `SUMI_E_JUICE_CATALOG` over `JUICE_CATALOG` when `AestheticTheme.id === "sumi-e"` (orchestrator hook can be added next).

## Phase 3 — Atmosphere & depth

- More layers (architecture, birds, mist animation)
- Deeper `ParallaxSystem` + `Camera2D` integration
- Regional variants via `LevelThemeSystem`
- Particle trails (leaves, petals, residual ink)

## Phase 4 — Polish

- Debug overlay for live layer editing
- Performance presets
- Visual regression tests (Canvas vs Skia)
- Accessibility options

## Design principles

1. **Deterministic** — no RNG in `computeInkWashLayers`
2. **Parity** — every Canvas path has a Skia twin
3. **Reusable** — shared module first
4. **Subtle by default** — `preferSubtleJuice` for sumi-e
5. **Opt-in per game** — cosmic/neon remain available

## Related files

- `src/games/shared/rendering/InkWashParallaxBackdrop.ts`
- `src/games/shared/rendering/sumi-e/*`
- `src/games/asteroids/AsteroidsGame.ts` (Phase 1 example)
- `src/games/hitandrun/rendering/theme/sumi-e/SumiETheme.ts` (origin)
- `src/games/shared/rendering/JuiceOrchestrator.ts`
