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
