# Contributing Guidelines & Golden Path for TinyAster Games

Welcome to the TinyAster ArcadeGames repository! When adding new games or extending existing ones, please follow this **Golden Path** architecture to maintain zero-allocation performance, deterministic simulations, and low code duplication.

---

## Golden Path Reference Standards

Use `src/games/arkanoid/ArkanoidGame.ts` and `src/games/pong/PongGame.ts` as architectural reference implementations.

### 1. Deterministic Entity Spawning & Mutators
Never invoke `this.world.gameplayRandom.unlock()` or `lock()` manually in production code. Always wrap entity initialization and wave spawning inside `runWithUnlockedRandomAndMutators`:

```typescript
import { runWithUnlockedRandomAndMutators } from "../shared/configHelper";

protected override async onInitializeEntities(): Promise<void> {
  if (this.isMultiplayer) return;

  runWithUnlockedRandomAndMutators(this.world, this._config.gameOptions, () => {
    // Spawn player ship, initial wave, and apply beneficial mutators
    const ship = createShip({ world: this.world, x: 400, y: 300 });
    spawnAsteroidWave(this.world, 1);
  });
}
```

### 2. Standardized Paddle Colliders
If your game uses paddle or horizontal bumper mechanics, do not define inline box colliders with duplicate `CollisionLayers`. Always use `createPaddleColliderConfig`:

```typescript
import { createPaddleColliderConfig } from "../shared/componentBuilders";

EntityBuilder.fromEntity(world, paddleEntity)
  .withTransform({ x: 400, y: 550 })
  .withCollider(createPaddleColliderConfig(config.PADDLE_WIDTH, config.PADDLE_HEIGHT));
```

### 3. Rendering Decoupling & Asset Registration
Register both Canvas2D and Skia shape/effect drawers declaratively using `RendererUtils.registerAssets`:

```typescript
import { RendererUtils } from "@tiny-aster/core";

public initializeRenderer(renderer: Renderer<MyComponentRegistry>): void {
  RendererUtils.registerAssets(renderer, {
    canvas: (r) => {
      r.registerShape("player_ship", drawCanvasPlayerShip);
    },
    skia: (r) => {
      r.registerShape("player_ship", drawSkiaPlayerShip);
    }
  });
}
```

### 4. Zero-Allocation Entity Pooling
For high-frequency projectiles, particles, or hazards, use `SharedEntityPool` from `@tiny-aster/core` rather than custom arrays or inline `createEntity` calls in hot simulation paths:

```typescript
import { SharedEntityPool } from "@tiny-aster/core";

export class MyProjectilePool extends SharedEntityPool<MyComponents, MyParams> {
  constructor() {
    super({
      poolId: "MyProjectilePool",
      initialSize: 64,
      factory: () => createMyProjectileComponents(),
      initializer: (comps, params, world, entity) => populateMyProjectile(world, entity, params)
    });
  }
}
```

### 5. Jest Test Suite Registration
Every game under `src/games/<game_key>/` containing unit tests in `__tests__/` must:
1. Maintain its own `src/games/<game_key>/jest.config.cjs`.
2. Register `<rootDir>/src/games/<game_key>/jest.config.cjs` in the `projects` array of the root `jest.config.cjs`.

Automated CI checks (`pnpm run check:game-patterns`) verify all 5 rules automatically before pull requests can be merged.
