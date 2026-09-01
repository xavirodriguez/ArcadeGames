# Technical Audit Report: Theme `spriteMap` Usage Across Minigames

**Date:** 2025-03-08
**Author:** Jules (Senior Software Engineer)
**Scope:** Investigation of `Theme.spriteMap` vs `Theme.colorMap` usage across entity factories in TinyAsterEngine.

---

## Executive Summary

An audit of entity factories across all 6 minigames (`Asteroids`, `Space Invaders`, `Pong`, `Flappy Bird`, `Platformer`, `Geometry Wars`, and `Echo Runner`) was conducted to determine why only two factories (`Asteroids` ship and `Platformer` player) consult `Theme.spriteMap`, while the remaining factories only consume `Theme.colorMap`.

---

## Key Findings

### 1. Shape-Only & Procedural Canvas2D/Skia Rendering
The vast majority of minigames in TinyAsterEngine utilize pure Canvas2D and Skia shape drawers (`registerShape`) rather than loading external bitmap texture assets (`SpriteComponent`):

- **Space Invaders:** Player ship, invaders, bullets, shields, and particles are rendered procedurally using custom path drawers (`drawSpaceInvadersPlayer`, `drawSpaceInvadersInvader`, etc.).
- **Pong:** Ball and paddles are drawn using procedural vector paths and glow effects (`drawPongBall`, `drawPongPaddle`).
- **Flappy Bird:** Bird, pipes, and scrolling background are procedural vector shapes (`drawFlappyBird`, `drawFlappyPipe`).
- **Geometry Wars:** Neon vector shapes for player, bullets, chasers, evaders, grunts, seekers (`drawPlayerShip`, `drawEnemySeeker`).

Because these entities do not use `SpriteComponent` with texture image paths, they rely exclusively on `colorMap` (via `resolveThemeColorWithFallback`) to supply color fills, strokes, and neon glow effects.

### 2. Sprite-Enabled Entities
Only two factories register `SpriteComponent` that query `spriteMap`:
- **Asteroids (`EntityFactory.ts`):** `const assetKey = theme?.spriteMap["player-ship"] ?? theme?.spriteMap["player"] ?? "ship_sprite";`
- **Platformer (`PlatformerGame.ts`):** `const assetKey = theme?.spriteMap["player"] ?? "player_sprite";`

These entities support optional or primary bitmap texture rendering (`ship.png`, `player.png`) loaded via `AssetLoader`.

---

## Conclusion & Recommendation

No improper hardcoding or missing sprite wiring was identified. The current distribution accurately reflects the architectural split between:
1. **Procedural vector games** (Pong, Geometry Wars, Space Invaders, Flappy Bird) that only require `colorMap` palette tinting.
2. **Hybrid / Sprite-based games** (Asteroids, Platformer) that support texture replacement via `spriteMap`.

Future reskins or lore packs can freely supply both `colorMap` and `spriteMap` entries without breaking vector drawer fallback paths.
