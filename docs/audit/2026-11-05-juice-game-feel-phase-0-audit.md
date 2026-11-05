# Juice & Game Feel — Phase 0 source audit

**Date:** 2026-11-05
**Scope:** source inventory, snapshot boundary and current canonical hit-stop implementation; runtime changes remain pending CI validation.

## Executive result

The repository now has a canonical hit-stop path in the current implementation branch. `requestHitStop()` arbitrates through snapshot-registered `JuiceHitStopPolicy` and writes the accepted finite duration to `GameplayFreeze`; `Schedule.update()` remains the only owner of the active countdown. `VFXWorldState` no longer stores a hit-stop timer.

`Juice.shake()` has three destinations: the `ScreenShake` singleton, the `ScreenShake` resource, and legacy `GameState.screenShake`. The first two receive the supplied duration unchanged; the legacy path applies `duration > 10 ? duration / 1000 : duration`. This makes the effective unit destination-dependent.

## Verified contracts

| Domain | Producer / state | Consumer | Finding |
|---|---|---|---|
| Freeze | `enterGameplayFreeze()` / `GameplayFreeze` | `Schedule.update()` | Effective scheduler authority; remaining is seconds. |
| Hit-stop policy | `requestHitStop()` / `JuiceHitStopPolicy` | `HitStopSystem.update()` + `Schedule.update()` | Priority/cooldown are snapshot state; active duration is owned only by `GameplayFreeze`. |
| Camera shake | `Juice.shake()` | `ScreenShakeSystem` for ECS component path | Core system uses seconds, `world.renderRandom`, skips rollback, and clears camera `VisualOffset`. |
| Legacy shake | `GameState.screenShake` | Game-specific renderer | Keep until renderer migration and equivalence tests. |
| Entity transforms | `Juice.add()` / `Juice.squash()` | `JuiceSystem` | Public duration/delay converted from ms to seconds; system writes `VisualOffset` / `Render`, or arbitrary component when `componentType` is supplied. |
| Particles/audio | Direct emitters and event producers | Particle/audio consumers | Producer-side rollback protection must be checked at each call site. |

## Scheduler behavior

`Schedule.update()` now latches freeze eligibility at tick start. A finite freeze that reaches zero during the update keeps gameplay phases frozen for that complete tick; the exact resource is removed after the phases finish, and gameplay resumes on the next tick. This behavior was merged in PR #1098. The scheduler regression tests were added there, but this connector audit did not execute them.

The freeze countdown currently advances before `IsPaused` is read. `TimeScale` has a separate countdown; `scale === 0` contributes to the frozen decision. Pause, TimeScale zero, and freeze-clock behavior require explicit tests in Phases 1 and 6.

## Registrations and game findings

Code search found explicit `HitStopSystem` registration in `ArkanoidGame`, `GeometryWarsGameScene`, and `SpaceInvadersGameScene`. `ScreenShakeSystem` and `JuiceSystem` are registered in the shared component builder and multiple game scenes; this is not proof that every game has an active camera consumer.

| Game | Evidence | Follow-up |
|---|---|---|
| Arkanoid | Catalog events for brick hit/shatter; inline squash, emitters and SFX remain. Hit event path lacks the rollback guard used by death path. | Fix producer-side rollback guard; preserve game-specific squash. |
| Pong | Direct 60 ms `GameplayFreeze`, `Juice.shake`, squash, hit emitter and SFX. Catalog has `pong.paddle:hit`. | Migrate only after semantic equivalence; guard particle/audio during rollback. |
| Space Invaders | Direct 50 ms boss and 30 ms invader freezes; direct shake/squash; transient orchestrator construction. Boss hit currently emits `ufo:destroyed`. | Correct event semantics and route through canonical policy. |
| Hit&Run | Core freeze helpers used; both `HitRunScreenShake` and core camera `ScreenShake` are written. Existing ledger reports no renderer for custom resource. | Confirm full reference count before removing orphan channel. |
| Asteroids / Geometry Wars / Frogger / Racing / Flappy Bird / Platformer / Echo Runner / Tower Defense / Vertical Shmup | Search finds a mix of Juice/catalog producers and presentation-system registrations. | Build full producer-consumer matrix before migration; catalog membership alone is not proof of use. |

## Rollback findings

Core snapshots now support explicitly registered plain-data resources. `GameplayFreeze` is registered by `World`; `JuiceHitStopPolicy` is registered by `HitStopSystem`. AoS and SoA serializers capture the same resource payload, restore replaces the registered resource set, and hashes include registered keys and values. Network deltas carry the complete registered-resource payload and `NetworkReplicationUtils.applyDelta()` replaces the baseline resource state.

`RollbackSimulation.processRollback()` now sets `world.isReSimulating` around the corrected-input step and restores the previous flag in `finally`; `resimulateFromTick()` applies the same flag to later frames. The runtime bridge therefore applies hit-stop requests before the presentation guard in `JuiceOrchestrator.spawn()`: authoritative freeze decisions replay on corrected and subsequent frames, while VFX entities and shake remain suppressed.

`HitStopSystem` now stores only priority, active ownership and cooldown in `JuiceHitStopPolicy`. It runs while frozen and observes the scheduler-owned `GameplayFreeze.remaining`; no second duration timer remains. External/indefinite freezes are not replaced by Juice. Direct game-specific freeze writers are still present and intentionally remain external owners pending their own migrations.

`JuiceSystem` and `ScreenShakeSystem` continue to skip `world.isReSimulating`; this is appropriate for presentation. Tests for snapshot resource capture, restore, hashing, binary transport, network delta application and hit-stop replay have been authored in this branch but still require CI execution.

## Corrections to prior documentation

- The 2026-10-27 inventory says `HitStopSystem` delegates to `enterGameplayFreeze`; current `HitStopSystem.ts` does not. `requestHitStop()` only mutates VFX state.
- The earlier roadmap says Arkanoid collision directly writes `GameplayFreeze`; current search finds no such write. Arkanoid uses catalog events for brick hit/shatter and retains inline presentation.

## Decisions for implementation

1. `GameplayFreeze` owns effective freeze duration; hit-stop policy must not own a second clock.
2. `GameplayFreeze` is registered by core `World`; Juice priority/cooldown state is registered separately as `JuiceHitStopPolicy`.
3. Do not snapshot all of `VFXWorldState`: renderer caches/native handles and presentation data remain outside rollback.
4. Hit-stop duration is authoritative and must not be scaled by local Juice level or reduced-stimulation preferences.
5. Public Juice durations are milliseconds; ECS timers and `System.update` use seconds.
6. No fallback is removed until its producer and consumer are migrated and tested.
7. Rollback suppression is required at presentation producer boundaries, not only in consumers.
8. Reduced motion must not silently alter authoritative simulation timing.
9. Game-specific effects remain until semantic equivalence is demonstrated.

## Phase 0 exit

**Phase 1 runtime bridge implemented in the follow-up branch; bulk cleanup remains out of scope.** The canonical freeze and rollback policy are now represented in snapshots. Full producer/consumer coverage, multiplayer rollback validation and per-game migration remain explicit follow-up work.

No test runner, typecheck, lint or build was executed during this connector-based implementation. CI must run `packages/core/tests/GameplayFreeze.test.ts`, `packages/core/tests/SnapshotResources.test.ts`, `src/games/shared/rendering/__tests__/JuiceOrchestrator.test.ts`, `src/games/hitandrun/__tests__/HitRunGameplayFreeze.test.ts`, and `src/games/hitandrun/systems/__tests__/HitRunFeedbackSystem.test.ts`.
