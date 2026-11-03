# PIXELFX INTEGRATION AUDIT

**Date:** 2026-11-03  
**Repos:** ArcadeGames + patch-gg/pixelfx@0.3.0  
**Status:** Layer scaffold + export spike + Juice re-sim guard. Spritesheet assets not yet registered.

## Context

PR #1035 already landed **procedural** PixelFX-inspired shapes (`pixelfx_impact`, `pixelfx_slash`, `pixelfx_explosion`) without importing the PixelFX package. This work adds a **spritesheet integration path** that stays compatible with that decision: PixelFX is a content/tooling source, not a core dependency.

## Architecture (V1)

- Manifest only (`src/games/shared/pixelfx/`) — not a second SpriteRegistry.
- Export adapter: PixelFX `--sheet` JSON → normalized anchor + uniform frameDuration.
- `JuiceProfile.pixelFxId?` optional; `effect` remains the SharedVFX/procedural shape.
- `JuiceOrchestrator.spawn` returns `null` when `world.isReSimulating` (presentation guard).
- Palette variants are **build-time** sheet exports, not runtime recolor.
- InstanceManager / procedural Runtime deferred.

## Spike results

See `docs/specs/pixelfx-export-spike.md`.

| Effect | Duration | Anchor | Notes |
|--------|----------|--------|-------|
| impacts/hit-flash | 0.533s | (0.5, 0.84375) | Good impact candidate |
| explosions/cartoon-pow | 1.067s | (0.5, 0.5) | Use scale ≈ 0.45 |

## Open blockers before game wiring of sheets

1. Register PNG/JSON via SPRITE_SHEET_CATALOG + sprites:validate.
2. Confirm SpriteAnimator → Sprite frame sync on Canvas and Skia.
3. Hit-stop dual path (HitStopSystem vs GameplayFreeze) — PixelFX must not add a third.
4. Sumi-e art review before forcing sheets on Hit & Run.

## Intact systems

- Procedural pilots and SharedVFX fallbacks.
- `@tiny-aster/core` boundary (no PixelFX import in core).
- Existing Juice catalog entries for Asteroids/Platformer using procedural shapes.
