# Types Refactoring Ledger

| Date | File & Symbol | Status | Reason / Details |
| --- | --- | --- | --- |
| 2026-10-17 | `src/games/shared/missions/MissionTypes.ts` (`MissionDefinition.onEvent`, `ActiveMissionState.customData`) | Resuelto | Removed `World<any, any, any>` and `any` in callback parameters and customData. |
| 2026-10-17 | `packages/gameplay-kit/src/spawn/BlueprintInterpreter.ts` (`evaluateExpression`, `evaluateCondition`, `spawnFromBlueprint`) | Resuelto | Replaced `World<any, any>`, `Record<string, any>`, and `any` with `unknown` and `isRecord` type guards. |
| 2026-10-17 | `packages/react-native/src/hooks/useGame.ts` (`useGame`, `GameConstructor`) | Conservado | Retained default `BaseGame` generic parameters to preserve subclass type assignability. |
| 2026-10-17 | `src/config/MutatorConfig.ts` (`PhysicsSafetySchema`, `applyMutators`, `resolveAndApplyMutators`) | Resuelto | Replaced `z.any()` with `z.unknown()` and generic constraint `TConfig extends Record<string, unknown>`. |
| 2026-10-17 | `src/components/debug/DebugOverlay.tsx` (`EventLogEntry.payload`, `ColliderShapeInfo.shape`, `room`) | Resuelto | Replaced `any` with `unknown` and structured room listener types. |
| 2026-10-17 | `server/src/replication/ReplicationHelpers.ts` (`executeReplicationLoop`, `sendDeltaState`, `ReplicationClientContext`) | Resuelto | Added structured interfaces `ReplicationClient` and `ReplicationRoom`, eliminating 11 `any` nodes. |
| 2026-10-17 | `src/games/platformer/systems/PlatformerGoalSystem.ts` (`PlatformerGoalSystem.update`) | Resuelto | Registered `LevelGoalComponent` in `CoreComponentRegistry`, eliminating 8 `any` nodes and 5 `as any` casts. |
| 2026-10-17 | `src/games/shared/componentBuilders.ts` (`setupPlatformerMovementComponents`, `setupTilemapEntity`, `createMainCamera2D`) | Resuelto | Removed 17 `unknown` and 8 `as { type: string; [key: string]: unknown }` type assertions. |
| 2026-10-17 | `src/games/shared/configHelper.ts` (`MutatorLike`, `applyMutators`, `loadAndMutateConfig`, `runWithUnlockedRandomAndMutators`) | Resuelto | Replaced `any` with generic `Record<string, unknown>` and `World`. |
| 2026-10-17 | `src/games/shared/LapTimerSystem.ts` (`LapTimerSystem.passCheckpoint`, `LapTimerSystem.update`) | Resuelto | Registered `LapTrackerComponent` and racing events in `CoreComponentRegistry` / `CoreEvents`, removing 6 `any` nodes and 4 `as any` casts. |
| 2026-10-17 | `packages/gameplay-kit/src/story/BaseMiniGameEncounter.ts` (`BaseMiniGameEncounter.emitResult`, `BaseMiniGameEncounter.dispose`) | Resuelto | Replaced `any` with `unknown` and `PlayableGameInstance` interface. |
| 2026-10-17 | `src/games/frogger/EntityFactory.ts` (`FroggerBlueprintMap`, `registerFroggerBlueprints`) | Resuelto | Replaced `any` with `EventRegistry` and `BlueprintRegistry` types. |
| 2026-10-19 | `src/games/pong/systems/PongCollisionSystem.ts` (`PongCollisionSystem.update`) | Resuelto | Removed `as any` component checks and typed `TTLComponent`. |
| 2026-10-19 | `src/games/flappybird/systems/FlappyBirdInputSystem.ts` (`InputBufferSystem`, `FlappyBirdInputSystem.update`) | Resuelto | Removed `World<any>` and `as any` assertions. |
| 2026-10-19 | `src/games/flappybird/EntityFactory.ts` (`createBird`, `createPipe`, `createGround`, `createGameState`) | Resuelto | Replaced `World<any>` with `World<FlappyBirdComponentRegistry>`. |
| 2026-10-19 | `src/games/frogger/rendering/FroggerSkiaVisuals.ts` (`drawFroggerSkia`, `drawCarSkia`, `drawTruckSkia`, `drawLogSkia`, `drawTurtleSkia`, `drawLilyPadSkia`, `froggerBackgroundSkiaEffect`) | Resuelto | Replaced `canvas: any` and `ShapeDrawer<any, ...>` with `SkCanvas`. |
| 2026-10-19 | `src/games/vertical-shmup/rendering/ShmupSkiaVisuals.ts` (`drawSkiaShmupPlayer`, `drawSkiaShmupEnemy`, `drawSkiaShmupBulletShape`, `drawSkiaShmupPlayerBullet`, `drawSkiaShmupEnemyBullet`, `drawSkiaShmupStarfield`) | Resuelto | Replaced `canvas as any` and `any` bullet shape params with `SkCanvas` and `World<ShmupComponentRegistry>`. |
| 2026-10-19 | `src/games/shared/CaptureSystem.ts` (`CaptureSystem.trap`, `CaptureSystem.pop`, `CaptureSystem.update`) | Resuelto | Refactored `CaptureSystem` to be generic over `TRegistry extends ComponentRegistry`. |
| 2026-10-19 | `src/games/asteroids/EntityPool.ts` (`createAsteroidsBulletPoolConfig`, `BulletPool`, `AsteroidPool`) | Resuelto | Typed `PooledBulletComponents` and removed `as any` casts. |
| 2026-10-19 | `src/games/asteroids/EntityFactory.ts` (`registerAsteroidsBlueprints`, `createAsteroid`) | Resuelto | Typed `AsteroidsBlueprintMap` and removed `as any` casts. |
| 2026-10-19 | `src/games/asteroids/rendering/AsteroidsVisualHelpers.ts` (`resolveAsteroidDrawSetup`, `resolvePlayerShipSetup`, `resolveCustomMotionData`) | Resuelto | Replaced `customGeom: any` and `renderRandom: any` with `EntityGeometryProfile` and `RandomService`. |
| 2026-10-19 | `src/games/platformer/systems/PlatformerWallJumpSystem.ts` (`PlatformerWallJumpSystem.update`) | Resuelto | Removed `as any` casts for component lookups. |
| 2026-10-19 | `src/games/shared/story/adapters/BaseArcadeAdapter.ts` (`BaseArcadeAdapter`) | Resuelto | Replaced `BaseGame<any, ...>` with generic `ComponentRegistry` / `EventRegistry` / `BlueprintRegistryMap`. |
| 2026-10-19 | `src/games/shared/missions/MissionTypes.ts` (`MissionDefinition.onEvent`, `onUpdate`, `onInit`, `ActiveMissionState.customData`) | Resuelto | Replaced `World<any>` and `any` with `World` and `unknown`. |
