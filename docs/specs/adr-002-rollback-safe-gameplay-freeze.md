# ADR — Rollback-safe gameplay freeze and Juice hit-stop

**Date:** 2026-11-05  
**Status:** Snapshot resource foundation merged; canonical hit-stop runtime bridge implemented in the current follow-up branch, pending CI validation.

## Context

The engine has one scheduler authority for stopping gameplay: the `GameplayFreeze` world resource read by `Schedule.update()`. Juice currently has a separate arbitration implementation in `VFXWorldState`:

- `requestHitStop()` writes `hitStopTimer`, `hitStopPriority`, and `hitStopCooldown`.
- `HitStopSystem.update()` decrements that timer.
- `Schedule.update()` does not read the VFX timer; it reads `GameplayFreeze`.

PR #1098 fixed tick-boundary expiry semantics for `GameplayFreeze`: a tick that begins frozen remains frozen through all gameplay phases, even if the countdown reaches zero during that tick.

## Verified rollback boundary

The current snapshot implementation does not serialize world resources:

- AoS: `SnapshotSerializer.snapshot()` captures entity components plus `buildSnapshotMetadata()`.
- SoA: `SnapshotSerializerSoA.snapshot()` captures entity components plus the same metadata builder.
- `BaseWorldSnapshot` contains entity allocation metadata, RNG metadata and tick, but no resource payload.
- `SnapshotRestore` and `SnapshotRestoreSoA` restore world metadata and component storage; neither restores `World.resources`.

Therefore neither `GameplayFreeze.remaining` nor the hit-stop arbitration state stored in `VFXWorldState` is rewound by rollback. Bridging the request to the resource alone would unify the normal runtime clock but would not make the feature deterministic under rollback.

There is a second boundary in `RollbackSimulation.processRollback()`: it restores the target snapshot and executes the corrected input frame with `simulation.step(correctedInput)` before calling `resimulateFromTick()`. The latter sets `world.isReSimulating = true`. Any replay/event policy must account for the corrected frame as well as later replay ticks.

## Decision

**Use `GameplayFreeze` as the only active hit-stop duration owner.** The snapshot resource foundation has landed; the current runtime change removes the duplicate VFX timer and moves only arbitration state into `JuiceHitStopPolicy`.

1. **Choose simulation semantics explicitly.** If hit-stop changes the number of authoritative simulation ticks, it is gameplay state and must be driven by deterministic, synchronized events/configuration. If it is local presentation only, it must not gate authoritative gameplay phases.
2. **Snapshot only deterministic policy state.** Do not serialize all of `VFXWorldState`: it also contains renderer caches, Skia/Canvas handles, background state and visual-only data. Extract the minimal hit-stop policy state (active owner/source, priority, cooldown and any required arbitration metadata) into a snapshot-safe representation.
3. **Preserve one active duration owner.** Once the snapshot contract exists, `GameplayFreeze` remains the only active duration consumed by the scheduler. Policy arbitration may accept/reject/override requests but must not decrement a parallel active timer.
4. **Protect external effects separately.** Particles, audio, camera shake and other presentation output must be suppressed or deduplicated during corrected-frame execution and replay. A consumer-side `isReSimulating` guard alone is insufficient if producers mutate state before dispatch.
5. **Do not let local accessibility preferences alter authority.** `juiceLevel` and low-stimulation settings may scale or suppress visual/audio output, but must not silently change server-authoritative freeze duration.

## Required implementation sequence

### A. Snapshot contract — implemented

- `World.registerSnapshotResource(name)` opts plain-data resources into snapshots; `GameplayFreeze` is registered by core `World` construction.
- AoS and SoA snapshots capture and restore the same resource payload.
- Registered keys and values participate in deterministic hashes and network delta payloads.
- Restore replaces the registered resource set and leaves unregistered service/presentation resources untouched.
- Capture/restore reject functions, symbols, cycles, weak collections, promises and class instances.

### B. Deterministic hit-stop policy — implemented in follow-up branch

- Priority, active ownership and cooldown live in snapshot-registered `JuiceHitStopPolicy`; the active duration remains exclusively in `GameplayFreeze`.
- Juice-owned freezes carry `source: "juice"`; requests cannot replace indefinite or externally owned freezes.
- Higher priority may replace a Juice-owned active freeze; equal/lower requests are rejected. The 50 ms cooldown advances through freezes because `HitStopSystem.runsWhileFrozen = true`.
- `VFXWorldState.hitStopTimer`, `hitStopPriority` and `hitStopCooldown` are removed.

### C. Replay and presentation — implemented, pending CI validation

- `JuiceOrchestrator.spawn()` applies hit-stop before the resimulation presentation guard; VFX and shake remain suppressed during replay.
- Catalog hit-stop event producers in Arkanoid and Space Invaders no longer suppress the authoritative request behind a presentation-only rollback guard.
- Hit-stop duration is independent of `JuiceLevel` and low-stimulation preferences.
- Tests compare resource hashes after replaying a request from a pre-hit-stop snapshot.

## Acceptance tests

- AoS and SoA snapshots restore active finite freeze, indefinite freeze, priority, cooldown and owner/source state.
- A resource absent at snapshot time does not leak from the post-snapshot world after restore.
- A finite freeze expiring during a tick keeps the entire tick frozen and resumes on the next tick.
- Higher-priority override, equal/lower rejection and cooldown behavior are deterministic across restore/replay.
- Juice cannot override a pause or unrelated owner unless the explicit policy permits it.
- Corrected input and subsequent resimulation reproduce the same authoritative freeze decisions.
- Particles/audio/shake are emitted once at most and never mutate authoritative simulation state during replay.
- Reduced-stimulation and Juice-level settings cannot desynchronize authoritative simulation timing.

## Consequences

This is a deliberate sequencing constraint, not a rejection of canonical hit-stop. It prevents a superficially unified runtime path from producing divergent rollback state. The next runtime PR should begin with the narrow snapshot-safe state contract and its AoS/SoA tests, then add the policy bridge only after those tests pass.


## Implementation update — 2026-11-05

PRs #1110 and #1113 introduced and completed the opt-in snapshot-resource foundation. The follow-up implementation now uses that contract to unify Juice hit-stop with core `GameplayFreeze`. The remaining validation is to run the core and shared-rendering test suites, typecheck/build, and verify multiplayer rollback behavior in CI. Game-specific direct freeze writers (notably Pong and Space Invaders damage paths) remain a later migration; they are preserved as externally owned freezes and are not silently overridden by Juice.
