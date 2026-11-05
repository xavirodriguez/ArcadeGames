# Juice & Game Feel — Phase 0 source audit

**Date:** 2026-11-05  
**Scope:** source inventory and behavioral contracts only; no runtime code changed.

## Executive result

The repository contains the shared primitives, but hit-stop ownership is split. `requestHitStop()` mutates `VFXWorldState.hitStopTimer`; `Schedule.update()` reads `GameplayFreeze`. These are separate clocks and the catalog request does not currently prove that gameplay is frozen.

`Juice.shake()` has three destinations: the `ScreenShake` singleton, the `ScreenShake` resource, and legacy `GameState.screenShake`. The first two receive the supplied duration unchanged; the legacy path applies `duration > 10 ? duration / 1000 : duration`. This makes the effective unit destination-dependent.

## Verified contracts

| Domain | Producer / state | Consumer | Finding |
|---|---|---|---|
| Freeze | `enterGameplayFreeze()` / `GameplayFreeze` | `Schedule.update()` | Effective scheduler authority; remaining is seconds. |
| Hit-stop policy | `requestHitStop()` / `VFXWorldState` | `HitStopSystem.update()` | Separate timer, priority and cooldown; not connected to scheduler freeze. |
| Camera shake | `Juice.shake()` | `ScreenShakeSystem` for ECS component path | Core system uses seconds, `world.renderRandom`, skips rollback, and clears camera `VisualOffset`. |
| Legacy shake | `GameState.screenShake` | Game-specific renderer | Keep until renderer migration and equivalence tests. |
| Entity transforms | `Juice.add()` / `Juice.squash()` | `JuiceSystem` | Public duration/delay converted from ms to seconds; system writes `VisualOffset` / `Render`, or arbitrary component when `componentType` is supplied. |
| Particles/audio | Direct emitters and event producers | Particle/audio consumers | Producer-side rollback protection must be checked at each call site. |

## Scheduler behavior

`Schedule.update()` decrements `GameplayFreeze.remaining`, deletes the resource at zero, then computes `isFrozen`. A freeze expiring during an update can therefore allow gameplay phases to execute in that same update. The required contract is tick-boundary semantics: a tick that starts frozen stays frozen through all phases; the next tick may resume.

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

`JuiceSystem` and `ScreenShakeSystem` skip `world.isReSimulating`. The existing source audit records an orchestrator guard, but this does not protect producers that create emitters, enqueue audio, or mutate visual components before the consumer runs. The Arkanoid hit path is one known missing producer guard; Pong particle/audio paths are another known risk. Space Invaders has guards on some orchestrator/SFX paths, not yet proven for every direct writer.

## Corrections to prior documentation

- The 2026-10-27 inventory says `HitStopSystem` delegates to `enterGameplayFreeze`; current `HitStopSystem.ts` does not. `requestHitStop()` only mutates VFX state.
- The earlier roadmap says Arkanoid collision directly writes `GameplayFreeze`; current search finds no such write. Arkanoid uses catalog events for brick hit/shatter and retains inline presentation.

## Decisions for implementation

1. `GameplayFreeze` owns effective freeze duration; hit-stop policy must not own a second clock.
2. Public Juice durations are milliseconds; ECS timers and `System.update` use seconds.
3. No fallback is removed until its producer and consumer are migrated and tested.
4. Rollback suppression is required at presentation producer boundaries, not only in consumers.
5. Reduced motion must not silently alter authoritative simulation timing.
6. Game-specific effects remain until semantic equivalence is demonstrated.

## Phase 0 exit

**Sufficient to begin Phase 1 design; not sufficient for bulk cleanup.** Freeze and shake mechanisms, units and key risks are identified. Full producer/consumer coverage and complete per-game registration coverage remain explicit prerequisites in the phases that modify those paths.

No test runner, typecheck, lint or build was executed during this connector-based audit. Baseline tests to run before Phase 1: `packages/core/tests/GameplayFreeze.test.ts`, `src/games/shared/rendering/__tests__/JuiceOrchestrator.test.ts`, `src/games/hitandrun/__tests__/HitRunGameplayFreeze.test.ts`, and `src/games/hitandrun/systems/__tests__/HitRunFeedbackSystem.test.ts`.
