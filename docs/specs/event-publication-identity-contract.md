# Event Publication Identity Contract

Status: Phase 0 design proposal — not approved for runtime implementation  
Date: 2026-11-08  
Related: ADR-003 Presentation Gateway, Game Feel Architecture v2, PR0.1 conformance matrix

## 1. Purpose

Define the minimum deterministic publication metadata needed by presentation consumers to distinguish:

- an event occurrence replayed after rollback;
- two distinct events emitted during the same simulation tick;
- a deferred event queued now and delivered later;
- a nested event synchronously emitted by a handler;
- an event emitted outside the ECS simulation loop.

This document is a contract proposal only. It does not authorize changes to EventBus, World, Gateway, VFX, audio, shake, or game producers. Gate 0 remains open.

## 2. Verified current implementation

The source audit establishes the following:

1. `EventBus.emit(event, payload)` invokes handlers with only `(payload, event)`. There is no publication envelope or occurrence metadata.
2. `emitDeferred(event, payload)` stores only `{ event, payload }`. `flushDeferred()` drains that queue by calling `emit`; the original enqueue identity and timing are not represented.
3. Immediate nested emissions are synchronous. The current implementation therefore produces depth-first nested delivery.
4. `World.tick` is backed by `_tick`; `World.update` increments it before executing the schedule, and `advanceTick` can also increment it manually.
5. AoS and SoA snapshots both carry `tick`; restore assigns `state.tick` back to `_tick`.
6. EventBus instances are explicitly outside the World snapshot-resource contract. A bus-local counter is therefore not restored by `World.restore`.
7. Existing EventBus tests cover basic immediate and deferred delivery. They do not assert publication metadata, stable IDs after restore/replay, nested identity ordering, or deferred identity preservation.
8. `Schedule` executes phases in configured order and sorts systems within each phase by descending priority. The current stable sort preserves registration order when priorities tie. In Asteroids, `CollisionSystem2D` is registered before `CombatSystem`; both are in Collision with default priority.
9. `World.query` returns entity IDs sorted ascending. `CombatSystem` iterates that query and each entity's `CollisionEvents.collisions` array in insertion order when it emits deferred combat events.
10. Asteroids collision pairs originate in `BroadPhase.sweepAndPrune`. Its Shell sort compares only `minX`; equal-`minX` bounds have no explicit entity-ID tie-break. It is repeatable for identical input order and state, but does not establish a canonical secondary ordering for ties. The source comment describing it as stable is not proof of a stable-sort guarantee.
11. `CollisionSystem2D` appends collision records in broadphase pair traversal order. The order of deferred `combat:hit` / `combat:death` publications therefore depends on the candidate list, broadphase ordering and collision array order—not only on sorted World query order.
12. In Asteroids, `CombatSystem` publishes `combat:death` with `emitDeferred`; `Schedule.update` flushes deferred events after all phases. `AsteroidCollisionSystem` handles that event in its listener. The listener currently mixes authoritative gameplay resolution with direct VFX/Juice/shake output, so Gateway migration will require separating those responsibilities. Its per-entity `processedDeaths` Set is a gameplay-side duplicate guard, not a stable publication identity.
13. The normative Game Feel architecture already defines Gateway deduplication as `(channel, occurrenceId, emissionId)`. The publication identity proposal must preserve that rule; it must not reopen occurrence-only deduplication as an option.
14. The current Asteroids registration enables `SpatialCullingSystem` before collision processing. On a normal tick, the culling system populates `SpatialCullingCandidates`; `CollisionSystem2D` consumes that candidate list. During `world.isReSimulating`, `SpatialCullingSystem.update` deletes `SpatialCullingCandidates` and returns. `CollisionSystem2D` then falls back to querying all entities with colliders. This can broaden the collision candidate set during replay and potentially create contacts/publications that were not evaluated on the original tick. The source proves the candidate-set difference; an actual gameplay divergence still requires a focused test.
15. The existing `WeaponAndBroadphase.test.ts` compares normalized/sorted collision-pair sets, which intentionally discards broadphase output order. It does not assert deterministic pair ordering or equal-`minX` tie behavior. Existing coverage therefore cannot validate the publication sequence derived from collision traversal.

These are source-level findings; this document does not claim tests were executed.

## 3. Proposed publication envelope

Keep gameplay payloads unchanged. Add metadata as a separate argument or envelope field at the EventBus boundary; do not inject engine bookkeeping into user payload objects.

Conceptual shape:

```ts
type EventPublicationMetadata = {
  readonly scope: "simulation" | "external";
  readonly tick: number | null;
  readonly sequence: number;
  readonly occurrenceId: string;
};
```

The exact public callback signature and migration strategy remain an API decision. The contract requirements are:

- Metadata is immutable for the lifetime of a publication.
- The event name and payload remain unchanged.
- The metadata is available to all handlers receiving that publication.
- The EventBus assigns metadata once, when accepting the publication.
- Deferred delivery preserves the metadata assigned at enqueue time.
- A handler-triggered nested `emit` is a new publication and receives a new sequence.
- Metadata is not inferred from payload fields, entity IDs, timestamps, wall-clock time, or object identity.

## 4. Identity model

### 4.1 Simulation-scoped identity

For an event emitted while the World is executing a simulation tick:

- `tick` is the authoritative `World.tick` at the point the publication is accepted.
- `sequence` is a monotonically increasing ordinal across **all** publications accepted by that EventBus during that tick, including immediate and deferred publications.
- The ordinal resets to zero when the observed simulation tick changes.
- `occurrenceId` is derived from a stable simulation-session namespace, tick, and sequence; for example, `<session>/<tick>/<sequence>`.

The namespace must be stable across rollback/replay of the same logical session, but distinct between independent sessions. It must not be generated from wall-clock time or randomness during replay. The owner and lifecycle of this namespace remain to be decided.

The sequence is global to the bus for that tick, not per event name. This distinguishes two occurrences of the same event in one tick and avoids collisions between different event names.

### 4.2 Restore and replay

The World restores its tick, but does not restore EventBus internals. Therefore the proposed design must not depend on a monotonically increasing process-lifetime bus counter.

After restore to tick T, the first accepted simulation publication at T starts a fresh per-tick sequence. Replaying the same deterministic simulation inputs and publication order must reproduce the same sequence and occurrence IDs.

This guarantee is conditional: the same logical events must be published in the same deterministic order. If producer execution order changes, ordinal-based IDs can change. Asteroids has a plausible deterministic chain—stable phase/priority/registration ordering, sorted World queries, and collision arrays built by a repeatable broadphase traversal—but the broadphase has no explicit entity-ID tie-break for equal `minX`, and no restore/replay test currently proves identical publication order. Therefore `tick + sequence` remains a candidate contract, not a verified guarantee. More importantly, the current resimulation culling path can change the candidate set itself: normal execution uses viewport-filtered `SpatialCullingCandidates`, while resimulation deletes that resource and collision falls back to all collider entities. Publication-order tests alone would miss this upstream simulation-integrity risk; the replay test must compare candidate sets, collision pairs and resulting domain events.

### 4.3 Immediate and deferred publications

Both `emit` and `emitDeferred` consume an ordinal at acceptance time. Sequence order represents **acceptance/enqueue order**, not eventual handler invocation order.

A deferred queue entry must retain the complete publication metadata. `flushDeferred` delivers that original publication; it must not allocate a second identity or sequence number.

This rule makes identity independent of the time at which a deferred queue happens to be flushed. Deferred events emitted by handlers while a flush is in progress remain separate new publications and follow the existing buffer semantics.

### 4.4 Nested publications

Nested synchronous `emit` calls receive their own sequence at the moment the nested call is accepted. If an immediate publication has no previously accepted publications between it and the nested call, the nested publication receives the next ordinal and is delivered depth-first before the outer publication's remaining handlers.

Important deferred-flush case: if a flush begins with deferred publications A and B already enqueued (and assigned sequences N and N+1), then A's handler may synchronously emit nested C. C receives N+2 even though C is delivered before B. This is intentional: ordinals identify acceptance order, while dispatch order remains depth-first. Tests must assert both sequences independently.

The metadata describes publication identity, not handler invocation identity. All handlers for one publication observe the same metadata.

### 4.5 External publications

Events emitted outside a simulation tick (UI, lifecycle, tooling, asynchronous callbacks) must not be silently assigned tick zero or mixed into a simulation tick's ordinal stream.

They require an explicit external scope and a separate identity policy. External publications may use a monotonic external sequence for diagnostics, but that sequence is not a rollback-stable gameplay occurrence ID and must not be used to deduplicate simulation presentation.

The API must make it possible to distinguish a missing simulation context from a legitimate external publication. It must not guess based on event name.

## 5. Presentation Gateway implications

The Gateway remains an admission guard, not an event router. Consumers continue subscribing directly to EventBus and ask the Gateway before creating presentation output.

For simulation-scoped publications, the Gateway uses the stable `occurrenceId` together with a logical emission identity. The normative key is `(channel, occurrenceId, emissionId)`, as already defined in `GAME_FEEL_ARCHITECTURE.md` and ADR-003. `emissionId` identifies one logical output intent within a channel and occurrence; it is not a particle, primitive, draw call, or audio voice. The consumer/resolver that owns the intent supplies a stable identifier (for example, `death-explosion`, `death-flash`, or `death-ring`). Different intended outputs remain independently admissible; repeated delivery of the same intent is suppressed.

External publications do not participate in rollback deduplication unless a separate explicit policy is defined.

## 6. Required invariants

1. Payload values and existing event names are not modified by metadata assignment.
2. One accepted publication receives exactly one immutable metadata record.
3. Two accepted publications in the same simulation tick have distinct sequence numbers, even if event name and payload are equal.
4. Immediate and deferred publications share one sequence space.
5. Deferred flush preserves the original metadata.
6. Nested publications receive distinct metadata in deterministic depth-first delivery; sequence numbers preserve acceptance order, which may differ from delivery order when nested emits occur during deferred flush.
7. Restoring tick T and replaying the same publication sequence reproduces the same simulation occurrence IDs.
8. Two different simulation sessions do not share occurrence IDs.
9. External publications cannot collide with simulation-scoped identities.
10. No consumer or drawer reconstructs identity from payload or wall-clock time.

## 7. Conformance tests required before Gateway runtime

### EventBus unit tests

- Immediate publication exposes metadata without changing payload.
- Two identical same-tick publications receive different ordinals.
- Different event names share the same per-tick sequence.
- Nested publication receives the next ordinal when no earlier accepted deferred publication intervenes; deferred-flush tests assert acceptance ordinal separately from depth-first dispatch order, and all outer handlers see the outer metadata.
- Deferred publication receives identity at enqueue time.
- Deferred flush preserves the exact metadata and does not consume another ordinal.
- Deferred events queued during a flush retain the current double-buffer behavior and receive distinct metadata.
- Changing tick resets the per-tick ordinal.
- External publication is explicitly scoped and does not consume the simulation sequence.

### World integration tests

- AoS snapshot → advance → restore → replay yields the original tick and same publication IDs.
- SoA snapshot → advance → restore → replay yields the original tick and same publication IDs.
- Restoring a snapshot and emitting twice in the restored tick yields the same sequence as the original execution.
- A publication outside `World.update` cannot accidentally inherit stale simulation context.
- Asteroids normal tick versus restore/replay with off-viewport colliders produces the same candidate set, collision pairs and ordered `combat:hit` / `combat:death` facts; if the culling policy intentionally differs, it must be proven semantically equivalent.
- Broadphase tests assert pair ordering and equal-`minX` tie behavior, rather than normalizing and sorting away traversal order.
- Manual `advanceTick` and `World.update` use one documented tick convention.

### Gateway contract tests

- Resimulation suppresses a repeated simulation occurrence.
- Two real occurrences in one tick are both admitted.
- Repeated delivery of one occurrence is suppressed according to the finalized deduplication scope.
- Distinct legitimate `emissionId` values from one occurrence are admitted independently; duplicate `(channel, occurrenceId, emissionId)` is suppressed.
- VFX, audio, and shake admission remain independent.
- No Gateway decision is required for authoritative `GameplayFreeze`.

## 8. Open decisions before implementation

1. **Context ownership:** how does EventBus obtain the current World tick without coupling the generic EventBus to ECS internals? Candidate: an explicit simulation publication context supplied by the World/scheduler integration.
2. **Session namespace:** which session owner provides a stable namespace across rollback and a distinct namespace across new runs?
3. **Out-of-loop emissions:** which API marks external scope, and should simulation events outside an active tick be rejected in development?
4. **Sequence determinism and simulation equivalence:** which producer and scheduler ordering guarantees are strong enough to support ordinal IDs? For Asteroids, add an entity-ID tie-break for equal broadphase `minX` if canonical ordering is required, and resolve the normal-versus-resimulation candidate-set discrepancy before replay-order tests can validate identity.
5. **Emission ID ownership:** define the narrow owner/API for stable logical emission IDs and enforce that every VFX/audio/shake side-effect path uses the full `(channel, occurrenceId, emissionId)` key. The deduplication tuple itself is already normative.
6. **Compatibility:** whether metadata is added as a third handler argument, a separate publication callback shape, or an opt-in typed EventBus API.

## 9. Recommendation

Do not implement the Gateway yet. First resolve the six decisions above, then implement publication metadata as a separately reviewable EventBus/World contract with focused tests. Only after replay-stable identity is demonstrated should PR3 consume it for local-authoritative admission.

No runtime implementation, migration, or test execution is included in this proposal.
