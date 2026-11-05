# ADR-002 — Rollback-safe gameplay freeze and Juice hit-stop

**Date:** 2026-11-05  
**Status:** Runtime implementation in follow-up branch; CI validation pending.

## Context

The ECS scheduler reads the core `GameplayFreeze` resource to decide whether gameplay phases run. Previously, Juice maintained a second active countdown in `VFXWorldState.hitStopTimer`; that timer did not freeze the scheduler and was not represented in rollback snapshots.

The snapshot-resource foundation is now merged in PRs #1110 and #1113. The current follow-up removes the duplicate Juice timer and routes accepted requests through the scheduler's canonical resource.

## Snapshot and rollback contract

- `World` registers `GameplayFreeze` as a snapshot resource by default.
- `HitStopSystem` registers `JuiceHitStopPolicy`, containing only `active`, `priority`, and `cooldownRemaining`.
- AoS and SoA snapshots capture and restore registered resources. Registered keys and values participate in deterministic snapshot hashes and network deltas.
- Restore replaces the registered-resource set and values. Unregistered service objects, renderer caches, native handles and presentation state remain outside snapshots.
- Resource payloads are validated as plain serializable data; functions, symbols, cycles, weak collections, promises and class instances are rejected.

## Decisions

1. **One active duration owner.** `GameplayFreeze.remaining` is the only active hit-stop countdown. `HitStopSystem` never decrements a second timer.
2. **Snapshot-safe arbitration.** Priority, active ownership and cooldown are stored in `JuiceHitStopPolicy`, not in `VFXWorldState`.
3. **Explicit ownership.** Juice-owned freezes carry `source: "juice"`. A Juice request cannot replace an indefinite freeze or a freeze owned by another subsystem. A higher-priority request may replace only an active Juice-owned freeze; equal/lower requests are rejected.
4. **Cooldown through freeze.** `HitStopSystem.runsWhileFrozen = true` lets it observe expiry and advance the 50 ms anti-chaining cooldown while gameplay phases remain frozen.
5. **Replay authoritative requests.** `JuiceOrchestrator.spawn()` processes `hitStopMs` before its resimulation presentation guard. Corrected-input and subsequent replay frames therefore reproduce the same freeze decision; VFX entities, shake and audio remain suppressed.
6. **Accessibility is presentation-only.** Juice level and low-stimulation preferences may scale or suppress visual/audio output, but never change authoritative freeze duration.

## Replay ordering

`RollbackSimulation.processRollback()` now sets `world.isReSimulating = true` around the corrected-input step and restores the previous flag in a `finally` block. `resimulateFromTick()` applies the same policy to subsequent replay frames. The orchestrator's hit-stop request path updates snapshot-backed gameplay resources first, then suppresses presentation output for every replayed frame.

Game-specific producers that guard an entire catalog event with `!world.isReSimulating` must be changed only when that event carries authoritative hit-stop. The current slice updates Arkanoid brick-shatter and Space Invaders catalog producers. Other direct particle/audio writers remain separate presentation cleanup work.

## Acceptance tests

- AoS and SoA restore registered resource values and remove resources absent from the snapshot.
- Snapshot resource values survive binary transport, participate in hashes, and propagate through network delta application.
- Finite freeze expiry keeps the complete tick frozen; the next tick resumes gameplay.
- Higher-priority override, equal/lower rejection and cooldown behavior are deterministic.
- Juice cannot override indefinite or externally owned freezes.
- Resimulation from a pre-hit-stop snapshot reproduces the same registered-resource hash without creating VFX entities.
- Low-stimulation mode does not alter the requested gameplay freeze duration.

## Remaining scope

- Run `packages/core/tests/GameplayFreeze.test.ts`, `packages/core/tests/SnapshotResources.test.ts`, and `src/games/shared/rendering/__tests__/JuiceOrchestrator.test.ts`, plus typecheck/build in CI.
- Verify multiplayer rollback end-to-end.
- Migrate direct game-specific freeze writers (including Pong and Space Invaders damage paths) in separate game-level slices. They remain external owners and are not overridden by Juice.

