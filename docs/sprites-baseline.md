# [sprites-v2] Baseline y Auditoría de Consumidores del Sistema de Sprites

## 1. Baseline de Sprites (Fase 0.2)

- **Total de sheets en `SPRITE_SHEET_CATALOG` (`SpriteRegistry.ts`):** 18 sheets
- **Total de sheets Hit&Run (`HitRunSpriteAtlas.ts`):** 3 sheets
- **Total de sheets validados por `pnpm run sprites:validate`:** 21 sheets
- **Sheets por modo (`sourceMode`):**
  - **Full-image (`sourceMode: "full-image"`):** 13 sheets (11 urban background props + 2 TD towers `tower_basic_art`, `tower_sniper_art`)
  - **Row frames (`sourceMode: undefined` / `makeRowFrames` / measured rects):** 8 sheets (`oni_red`, `sea_dragon`, `ghost_galleon`, `lancero`, `echorunner_kuchisake_onna`, `hitrun_samurai_enemy`, `hitrun_sumi_e_player`, `hitrun_sumi_e_samurai`)
- **Suite de pruebas de sprites actual:**
  - `SpriteAnimator.test.ts` (4 passed)
  - `SpriteDrawer.test.ts` (3 passed)
  - `SpriteManifestValidator.test.ts` (10 passed)
  - `__tests__/SpriteRegistry.test.ts` (2 passed)
  - `AssetLoaderAdapter.test.ts` (2 passed)
  - `packages/core/tests/SpriteSheetDefinition.test.ts` (1 passed)
  - Total: 6 suites, 22 tests passing.
- **Validación con `pnpm run sprites:validate`:** 21 sheets verificados exitosamente (0 errores).
- **Rama de trabajo:** `feature/sprite-system-v2` inicializada sobre `master`.

---

## 2. Inventario y Clasificación de Consumidores (Fase 0.1)

### Clasificación de uso:
- **Core Contract:** Ya importa/usa `SpriteSheetDefinition` o contrato canónico de `@tiny-aster/core`.
- **Shared Helper:** Utiliza `createSpriteAnimator`, `updateSpriteAnimator`, `playAnimation` o `SpriteRegistry` desde `src/games/shared/sprites`.
- **Legacy Index-Based:** Utiliza `AnimatorComponent` / `AnimationSystem` con números enteros de frame en lugar de rects nombrados.
- **Drawer Only:** Solo invoca funciones de renderizado (`drawSpriteCanvas` / `drawSpriteSkia`) recibiendo un animator o config.

---

### Tabla Detallada de Consumidores

| Paquete / Juego | Archivo | Líneas aprox. | Símbolos Utilizados | Tipo de Uso | Modo (ECS vs Memoria) | Preload / Registry |
|---|---|---|---|---|---|---|
| **Core** | `packages/core/src/assets/SpriteSheetDefinition.ts` | 1-85 | `SpriteSheetDefinition`, `calculateSpriteDestinationRect` | Core Contract | N/A (Contrato / helper puro) | N/A |
| **Core** | `packages/core/src/ecs/CoreComponents.ts` | 442-458, 1406 | `AnimatorComponent` | Legacy Index-Based | ECS Component | N/A |
| **Core** | `packages/core/src/systems/AnimationSystem.ts` | 1-76 | `AnimationSystem`, `AnimatorComponent` | Legacy Index-Based | ECS System | N/A |
| **Core** | `packages/core/tests/SpriteSheetDefinition.test.ts` | 1-84 | `SpriteSheetDefinition`, `calculateSpriteDestinationRect` | Core Contract | Unit Test | N/A |
| **Shared Sprites** | `src/games/shared/sprites/SpriteTypes.ts` | 1-60 | `SpriteAnimatorComponent`, `SpriteSheetDef`, `SpriteAnimationDef`, `SpriteFrameRect` | Shared Helper / Core Contract | TypeScript Types | N/A |
| **Shared Sprites** | `src/games/shared/sprites/SpriteRegistry.ts` | 1-350 | `SpriteRegistry`, `SPRITE_SHEET_CATALOG`, static `require("...png")` | Shared Helper | In-memory singleton | Registry propio |
| **Shared Sprites** | `src/games/shared/sprites/SpriteAnimator.ts` | 1-135 | `createSpriteAnimator`, `updateSpriteAnimator`, `playAnimation`, `getCurrentFrameRect` | Shared Helper | Helper puro | Depende de `SpriteRegistry` |
| **Shared Sprites** | `src/games/shared/sprites/SpriteDrawer.ts` | 1-450 | `drawSpriteCanvas`, `drawSpriteSkia`, `preloadSpriteSheetCanvas`, `preloadSpriteSheetSkia` | Shared Helper / Drawer | Drawer puro | `SpriteRegistry` + image caches |
| **Shared Sprites** | `src/games/shared/sprites/AssetLoaderAdapter.ts` | 1-75 | `loadSpriteSheetWithAssetLoader`, `SpriteRegistry` | Shared Helper | Adapter | Adapta ECS `AssetLoader` a `SpriteRegistry` |
| **Shared Sprites** | `src/games/shared/sprites/LanceroSpriteVisuals.ts` | 1-100 | `createSpriteAnimator`, `updateSpriteAnimator`, `drawSpriteCanvas`, `drawSpriteSkia` | Shared Helper / Drawer Only | In-memory `WeakMap` por world | Depende de `SpriteRegistry.init()` |
| **Shared Sprites** | `src/games/shared/rendering/visual-composition/CanvasVisualSceneRenderer.ts` | 8, 39, 53 | `SpriteAnimatorComponent`, `drawSpriteCanvas`, `SpriteRegistry` | Shared Helper / Drawer Only | In-memory animator temporal | Depende de `SpriteRegistry.has()` |
| **Shared Sprites** | `src/games/shared/rendering/visual-composition/SkiaVisualSceneRenderer.ts` | 9, 38, 52 | `SpriteAnimatorComponent`, `drawSpriteSkia`, `SpriteRegistry` | Shared Helper / Drawer Only | In-memory animator temporal | Depende de `SpriteRegistry.has()` |
| **Hit&Run** | `src/games/hitandrun/rendering/SamuraiAnimationSystems.ts` | 150-230 | `HitRunSpriteAnimatorPlaybackSystem`, `SpriteRegistry` | Shared Helper (Custom ECS System) | ECS System sobre `SpriteAnimator` y sincroniza a `Sprite` | `SpriteRegistry` |
| **Hit&Run** | `src/games/hitandrun/rendering/SamuraiAnimationSystems.ts` | 1-140 | `AnimationSystem` (legacy registration) | Legacy Index-Based | ECS System | `AssetLoader` legacy |
| **Hit&Run** | `src/games/hitandrun/HitAndRunGame.ts` | 110, 185, 347 | `SpriteRegistry.init()`, `registerHitRunSamuraiAnimationSystems` | Shared Helper / Legacy | Boot / System registration | `SpriteRegistry.init()` + `AssetLoader` |
| **Hit&Run** | `src/games/hitandrun/waves/HitRunEnemyPool.ts` | 236, 239 | `createSpriteAnimator`, `SpriteAnimator` component | Shared Helper | ECS Component | Depende de `SpriteRegistry` |
| **Hit&Run** | `src/games/hitandrun/rendering/HitRunSpriteAtlas.ts` | 1-120 | `HIT_RUN_CHARACTER_SPRITE_SHEETS`, `createLegacyAtlasAnimations` | Legacy & Shared Bridge | Helper | Preload via `AssetLoader` |
| **Space Invaders** | `src/games/space-invaders/rendering/SeaDragonVisuals.ts` | 1-370 | `createSpriteAnimator`, `updateSpriteAnimator`, `drawSpriteCanvas`, `drawSpriteSkia` | Shared Helper / Drawer Only | In-memory animator en State Map | Preload propio con fallback a `SpriteRegistry` |
| **Space Invaders** | `src/games/space-invaders/rendering/GhostGalleonVisuals.ts` | 1-170 | `createSpriteAnimator`, `updateSpriteAnimator`, `drawSpriteCanvas`, `drawSpriteSkia` | Shared Helper / Drawer Only | In-memory animator en State Map | Preload propio con fallback a `SpriteRegistry` |
| **Space Invaders** | `src/games/space-invaders/__tests__/SeaDragonSprite.test.ts` | 1-170 | `SpriteRegistry`, `playAnimation`, `updateSpriteAnimator` | Shared Helper | Tests de animación y timing | `SpriteRegistry.init()` |
| **Tower Defense** | `src/games/tower-defense/TowerDefenseGame.ts` | 28, 166 | `SpriteRegistry.init()` | Shared Helper | Boot / Lifecycle | `SpriteRegistry.init()` |
| **Tower Defense** | `src/games/tower-defense/rendering/TowerDefenseCanvasVisuals.ts` | 31, 35, 36, 273, 289 | `createSpriteAnimator`, `drawSpriteCanvas` | Shared Helper / Drawer Only | Static in-memory instances (`TOWER_BASIC_SPRITE`, `TOWER_SNIPER_SPRITE`) | Depende de `SpriteRegistry.init()` |
| **Tower Defense** | `src/games/tower-defense/rendering/TowerDefenseSkiaVisuals.ts` | 8, 28, 29, 294, 310 | `createSpriteAnimator`, `drawSpriteSkia` | Shared Helper / Drawer Only | Static in-memory instances | Depende de `SpriteRegistry.init()` |
| **Echo Runner** | `src/games/echorunner/EchoRunnerGame.ts` | 76, 255, 338 | `SpriteRegistry.init()`, `createSpriteAnimator("oni_red", "idle")` | Shared Helper | Prototype ECS / state | `SpriteRegistry.init()` |
| **Echo Runner** | `src/games/echorunner/systems/EchoRunnerSpriteSystem.ts` | 8, 23, 27, 88 | `createSpriteAnimator`, `SpriteAnimatorComponent` | Shared Helper | ECS Component | `SpriteRegistry` |
| **Echo Runner** | `src/games/echorunner/rendering/EchoRunnerCanvasVisuals.ts` | 14, 16, 316, 322 | `SpriteAnimatorComponent`, `drawSpriteCanvas` | Shared Helper / Drawer Only | ECS / State | `SpriteRegistry` |
| **Echo Runner** | `src/games/echorunner/rendering/EchoRunnerSkiaVisuals.ts` | 16, 18, 317, 322 | `SpriteAnimatorComponent`, `drawSpriteSkia` | Shared Helper / Drawer Only | ECS / State | `SpriteRegistry` |
| **Asteroids** | `src/games/asteroids/AsteroidsGame.ts` | 24, 250 | `AnimationSystem` | Legacy Index-Based | ECS System | `AssetLoader` |
| **Platformer** | `src/games/platformer/PlatformerGame.ts` | 17, 281 | `AnimationSystem` | Legacy Index-Based | ECS System | `AssetLoader` |
