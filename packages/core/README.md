
The platform-agnostic Entity-Component-System (ECS) engine at the heart of Tiny Aster. Zero runtime dependencies — no React, no React Native, no renderer, no network transport implementation.

## What lives here

- **ECS primitives**: `Entity`, `Component`, `World`, `Query`, `System`, `Schedule`, `WorldCommandBuffer`, `BlueprintRegistry`.
- **Snapshots & rollback**: `WorldSnapshot`, `SnapshotSerializer`/`SnapshotSerializerSoA`, `SnapshotRestoreSoA` — used for netcode reconciliation and replay.
- **Physics**: movement, friction, boundary, collision detection/resolution, shapes, and a physics query API (`physics/`).
- **Gameplay systems**: `JuiceSystem`, `TTLSystem`, `ParticleSystem`, `TrailSystem`, `MutatorSystem`, `StateMachineSystem`, `SpatialPartitioningSystem`, among others (`systems/`).
- **Rendering contracts** (not implementations): `Renderer`, `RenderCommandBuffer`, `Camera2D`, `RenderSnapshot` — implemented by `@tiny-aster/renderer-canvas` / `@tiny-aster/renderer-skia`.
- **Network contracts**: `NetworkTransport`, `NetworkManager`, `LocalPredictionSystem`, `RemoteInterpolationSystem` — implemented by `@tiny-aster/network-colyseus`.
- **Runtime**: `BaseGame` / `IGame`, the lifecycle abstraction every game in `src/games/*` extends.
- **Utils**: `RandomService` (seeded, deterministic RNG), `ObjectPool`, `ComponentSetPool`, `PrefabPool`, `ProjectilePool`.

## Design constraints

This package is not allowed to import React Native, Expo, Skia, Colyseus, or anything under `src/games`/`src/app`. This is enforced by `scripts/check-core-boundaries.sh` at the repo root and run in CI via `pnpm check:core-boundaries`. If you're adding a feature here and find yourself needing a platform API, it belongs in an adapter package instead.

All gameplay-affecting randomness must go through `RandomService` (`world.gameplayRandom`), never `Math.random()` directly, to preserve determinism for replay and rollback netcode.

## Scripts

\`\`\`bash
pnpm --filter=@tiny-aster/core build       # tsup build (esm+cjs+dts)
pnpm --filter=@tiny-aster/core test        # jest
pnpm --filter=@tiny-aster/core typecheck   # tsc --noEmit
\`\`\`

## Tests

- `src/__tests__/` — unit tests for ECS internals, lifecycle, pooling, snapshots.
- `tests/` — integration tests for cross-system ECS behavior and invariants.
```