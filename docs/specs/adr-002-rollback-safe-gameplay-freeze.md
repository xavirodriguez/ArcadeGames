# ADR — Rollback-safe gameplay freeze and Juice hit-stop

**Date:** 2026-11-05  
**Status:** Proposed implementation contract; runtime bridge intentionally blocked.

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

**Do not connect `requestHitStop()` to `GameplayFreeze` in the current architecture.** Do not remove `VFXWorldState.hitStopTimer` until the following contract is implemented and tested.

1. **Choose simulation semantics explicitly.** If hit-stop changes the number of authoritative simulation ticks, it is gameplay state and must be driven by deterministic, synchronized events/configuration. If it is local presentation only, it must not gate authoritative gameplay phases.
2. **Snapshot only deterministic policy state.** Do not serialize all of `VFXWorldState`: it also contains renderer caches, Skia/Canvas handles, background state and visual-only data. Extract the minimal hit-stop policy state (active owner/source, priority, cooldown and any required arbitration metadata) into a snapshot-safe representation.
3. **Preserve one active duration owner.** Once the snapshot contract exists, `GameplayFreeze` remains the only active duration consumed by the scheduler. Policy arbitration may accept/reject/override requests but must not decrement a parallel active timer.
4. **Protect external effects separately.** Particles, audio, camera shake and other presentation output must be suppressed or deduplicated during corrected-frame execution and replay. A consumer-side `isReSimulating` guard alone is insufficient if producers mutate state before dispatch.
5. **Do not let local accessibility preferences alter authority.** `juiceLevel` and low-stimulation settings may scale or suppress visual/audio output, but must not silently change server-authoritative freeze duration.

## Required implementation sequence

### A. Snapshot contract

- Add a narrow, explicit snapshot-safe resource mechanism or an equivalent component-backed representation.
- Support both AoS and SoA serialization and restoration.
- Define whether the resource participates in deterministic hashes and delta snapshots; do not leave these semantics implicit.
- Preserve existing non-serializable resources and presentation state outside snapshots.
- Add tests proving resource state is restored exactly, absent resources are removed/reset correctly, and excluded presentation resources are not serialized.

### B. Deterministic hit-stop policy

- Move only the priority/cooldown arbitration state out of `VFXWorldState` into the snapshot-safe representation.
- Keep `GameplayFreeze` as the sole effective active countdown.
- Define owner/source semantics so a Juice request cannot shorten, replace or clear an indefinite pause or a freeze owned by another gameplay system.
- Define higher-priority override, equal/lower rejection and the 50 ms anti-chaining cooldown in simulation ticks or deterministic time units.
- Make policy advancement run on a well-defined tick boundary even while gameplay is frozen; it must not depend on an optional presentation-system registration.

### C. Replay and presentation

- Specify how hit-stop requests are regenerated on corrected input and replay frames.
- Ensure authoritative events are deterministic and not suppressed merely because `world.isReSimulating` is true.
- Ensure presentation effects are not duplicated during corrected-frame execution or subsequent replay.
- Compare final gameplay snapshots after equivalent logical ticks, and separately assert expected freeze wall-clock/tick behavior.

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
