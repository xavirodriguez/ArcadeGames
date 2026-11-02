# Locomotion v1 — Repository Audit

**Repository:** `xavirodriguez/ArcadeGames`  
**Branch:** `feat/locomotion-v1`  
**Audit baseline:** default branch `master`, inspected 2026-11-01  
**Scope:** existing platformer movement, input, physics, collision, ECS lifecycle and determinism contracts.

## 1. Executive summary

The repository already contains a reusable platformer movement stack. Locomotion v1 must extend that stack rather than introduce a second controller. Existing capabilities include horizontal acceleration/deceleration, asymmetric jump gravity, variable jump-height input handling, coyote/jump-buffer timers, tile collision, and a generic rigid-body collision pipeline.

The current implementation is not yet sufficient for the requested locomotion contract. In particular, jump execution is split between the game-specific input system and a shared timer system; the input system previously stored edge history in a private `Map`; coyote/buffer durations are seconds rather than ticks; tile collision is axis-separated and grid-based; ground state exposes neither a contact normal nor a material identity; and no slide posture/clearance protocol or slope solver is present.

## 2. Existing physics architecture

### Integration and dynamics

- `PhysicsIntegrateSystem` integrates `Velocity` into `Transform` using explicit position integration (`position += velocity * dt`). It does not own input acceleration or gravity.
- `VelocityComponent` is a shared linear/angular velocity component.
- `RigidBodyComponent` and the generic physics dynamics pipeline exist for rigid-body mass/inertia and collision response.
- `PhysicsSolveSystem` consumes collision entries from `CollisionEvents`, resolves penetration and applies normal/tangential impulses for generic collider pairs.
- `PlatformerGravitySystem` applies rise/fall gravity and optional apex scaling by mutating `Velocity.vy`.

### Collision

- `CollisionManifold` and `Collision` expose a normal (`normalX`, `normalY`), penetration depth and contact points.
- `CollisionSystem2D` is registered in the shared platformer schedule.
- `TileCollisionSystem` resolves tilemap AABB collisions in separate X then Y passes. It handles one-way tiles, ice multiplier, bounce/hazard tile effects and updates `PlatformerGroundState.isGrounded`. `TileDefinition` already exposes optional `friction` and `bounce` fields, but the current ground-state contract only publishes an ice multiplier.
- Tile collision currently resolves against axis-aligned tile boundaries. It does not produce a stable ground contact normal, surface identity, or continuous slope contact.
- The generic manifold pipeline has normals, but those normals are not currently unified with tilemap ground-state data.

## 3. Existing ECS components and reusable contracts

| Component / contract | Existing responsibility | Locomotion v1 implication |
|---|---|---|
| `Transform` | World position and transform state | Keep position ownership in physics integration/resolution |
| `Velocity` | Shared linear and angular velocity | Reuse as the sole physical velocity; do not add a parallel momentum store |
| `PlatformerInput` | `moveDir`, jump pressed/held/released | Extend the existing input contract for slide intent if required |
| `PlatformerMovementConfig` | Ground/air acceleration, deceleration, max speed | Extend or replace fields compatibly; avoid a duplicate movement config |
| `PlatformerGravityConfig` | Rise/fall gravity, jump velocity, short-hop threshold, apex options | Reuse the existing asymmetric gravity model |
| `PlatformerJumper` | Coyote timer, jump buffer timer, multi-jump counters | Preserve component ownership but migrate temporal semantics deliberately |
| `PlatformerGroundState` | `isGrounded`, optional `iceMultiplier`, optional carrier | Extend minimally for contact normal/material only if grounded data can be authored reliably |
| `Collider2D` | AABB/circle 2D collider with mutable dimensions | Candidate for slide posture, subject to safe-clearance query support |
| `CollisionEvents` / `Collision` | Per-entity contacts and normals | Reuse for generic collider contact data |

## 4. Existing systems and registration

- `PlatformerMovementSystem`: accelerates/decelerates `Velocity.vx` toward input target speed. It selects ground vs air rates using `PlatformerGroundState.isGrounded`; ice currently scales both acceleration and deceleration via `iceMultiplier`.
- `PlatformerGravitySystem`: applies rise/fall gravity and optional apex multiplier.
- `PlatformerCoyoteSystem`: advances coyote and jump-buffer timers only.
- `PlatformerJumpSystem`: single authority for grounded/coyote/buffered/multi-jump execution and short-hop clamping.
- Game-specific `PlatformerInputSystem`: samples control intent and derives ECS-backed jump button edges.
- `PhysicsIntegrateSystem`: integrates velocity to position.
- `CollisionSystem2D` and `TileCollisionSystem`: run in the Collision phase.
- `registerCommonPlatformerSystems` is shared by Platformer and Echo Runner; changes here must be regression-tested against both.

## 5. Schedule and ordering observations

The shared registry currently adds movement, gravity and coyote systems in `Simulation`, followed by gameplay systems and `PhysicsIntegrateSystem` with priority `-10`; collision detection and tile collision are registered in `Collision`. The registry comment describes priority `-10` as late in Simulation, but the Schedule comparator is confirmed: priorities sort descending, so priority -10 runs after priority 0 within a phase.

The current coyote system executes before physics integration and before collision-phase ground-state refresh. Consequently, landing/buffer semantics depend on the previous tick's grounded state. A v1 controller should make the tick boundary explicit: consume prior resolved contacts for current-tick decisions, then publish the next grounded state after collision resolution.

No schedule change is required solely to make priority -10 late in Simulation: the comparator sorts descending. Input and Simulation still precede Collision, so the controller consumes the previous completed tick's resolved contact.

## 6. Determinism and snapshot risks

1. `PlatformerInputSystem` stores jump-edge history in a private `Map<Entity, boolean>`. This state is outside ECS snapshots and is not naturally restored during rollback.
2. `PlatformerCoyoteSystem` and `PlatformerJumper` store durations as floating-point seconds and decrement by `deltaTime`; the requested v1 contract is tick-based timers.
3. Jump resolution was split across the game-specific input system and the shared coyote system in the audit baseline; the current implementation increment consolidates impulse application in `PlatformerJumpSystem`.
4. Touch input mutates the same input component and consumes tap events. The input sampling boundary should be preserved, while simulation-relevant edge state must be serializable.
5. The existing shared system registry is used by Platformer and Echo Runner, so changing jump semantics globally could change both games.

## 7. Existing limitations against Locomotion v1

- No first-class locomotion mode component/state (Grounded/Airborne/Sliding).
- No slide intent, duration, friction profile, collider posture transition, or safe stand-up clearance query.
- No centralized surface material contract. Tile definitions currently expose tile-kind behavior and an ice special case rather than a general physical material.
- No slope-following collision solver; tile collision is axis-aligned.
- No unified contact representation for tile contacts and generic manifold contacts.
- No explicit relative-to-surface velocity or surface velocity contract. Existing carrier support is specialized to moving platforms and should not be duplicated.
- No evidence yet that the current Platformer player blueprint uses the same collider representation queried by the tile collision path in every game setup; confirm builder output before changing collider behavior.

## 8. Contracts to preserve

- ECS gameplay state must be stored in serializable components/resources, not mutable system-instance fields.
- Register systems through the existing `World.addSystem` / `SystemPhase` schedule.
- Preserve `Velocity` as the canonical physical velocity and `PhysicsIntegrateSystem` as position integrator.
- Preserve the shared Platformer/Echo Runner setup and add compatibility tests before changing shared behavior.
- Respect command-buffer/lifecycle rules for structural mutations.
- Keep simulation fixed-step and input-driven; no wall-clock timers or non-seeded randomness.
- Do not make the core package depend on renderer/UI packages.

## 9. Minimal change strategy

1. [x] Consolidate jump edge, buffering, coyote and variable-height decisions into one ECS-backed path while retaining existing component compatibility where practical.
2. Add a serializable locomotion state/profile contract; keep acceleration logic and gravity application as composable systems.
3. Add slide posture handling with a collision-world clearance query before restoring the standing collider.
4. Introduce a surface material identifier/definition and grounded contact data. Resolve materials outside the controller.
5. Add a slope-capable contact path only where the existing collision representation can supply stable normals; avoid pretending axis-aligned tile resolution supports slopes.
6. Define velocity projection/transfer at contact transitions without creating a second momentum integrator.
7. Add unit/integration/replay tests and a standalone Locomotion Lab after the mechanics are stable.

## 10. Risks

- **Shared behavior regression:** Platformer and Echo Runner both consume shared movement systems.
- **Double jump compatibility:** Platformer currently initializes `maxJumps: 2`; the v1 single-jump requirements must not silently remove an existing game mechanic.
- **Timer migration:** seconds-to-ticks changes can alter gameplay tuning and snapshots; migration must be explicit.
- **Collider mismatch:** `PlatformerGame` player setup uses `withCollider`, while tile collision queries `Collider2D`; inspect builder semantics before modifying player collider dimensions.
- **Slope scope:** genuine slope support may require a minimal extension to tile collision/contact queries, not merely a material coefficient.
- **Schedule order:** collision-resolved grounding is available in a later phase than current input/jump processing.

## 11. Implementation progress — 2026-11-02

- `PlatformerInputComponent` now has optional `previousJumpHeld` state, included by the generic component snapshot serializer.
- `PlatformerInputSystem` now samples input and derives jump edges without a system-instance `Map`; touch taps are treated as discrete press/release edges and consumed once per frame.
- Added `PlatformerJumpSystem` as the single authority for grounded/coyote jump impulses, buffered landing jumps, configured multi-jump consumption and short-hop release clamping.
- `PlatformerCoyoteSystem` now advances coyote and buffer timers only; it no longer applies jump impulses.
- Registered the jump resolver after the timer system in the shared Platformer/Echo Runner system registry.
- Added focused tests for ECS-backed input edge persistence and jump resolution (ground jump, short hop, coyote, buffer, double-jump exhaustion).
- Tests/typecheck have not been executed in this environment; the draft PR is intended to receive CI and integration validation.

## 12. Remaining audit items before broader implementation

- Trace `EntityBuilder.withCollider` and `ArcadeEntityBuilder.withCollider2D` to resolve the player collider mismatch risk.
- Inspect tile definition schema and collision tests for existing slope/one-way assumptions. Tile definitions currently support `normal | ice | spike | bounce`, optional friction and bounce; this is not a slope geometry contract.
- Inspect Platformer and Echo Runner tests and defaults to define backward-compatible profile migration.
- Add controller profiles, slope/contact geometry, slide posture and clearance, and inherited surface/platform velocity as separate tested increments.


## 13. Verified audit addendum — implementation branch baseline

- `PlatformerMovementSystem` uses `moveTowards` with only acceleration/deceleration and the legacy `iceMultiplier`; it does not distinguish explicit braking from direction reversal.
- `TileCollisionSystem` queries `Collider2D`. The Platformer player blueprint currently calls `EntityBuilder.withCollider`, which adds `Collider` only; Echo Runner calls `ArcadeEntityBuilder.withCollider2D`. This is a concrete collider-contract mismatch, not an assumption.
- `MovingPlatformSystem` writes the platform's next position and also writes its computed velocity before `PhysicsIntegrateSystem`; the latter integrates every Transform+Velocity entity. This can advance the platform twice in a tick.
- `PlatformCarrySystem` directly offsets the passenger Transform while the passenger retains its own Velocity, which is then integrated. The support displacement/relative-velocity ownership must be clarified before extending B5.
- `CollisionSystems.ts` supports both `Collider` and `Collider2D` for generic narrowphase, but this does not make the tilemap solver support both.
- The schedule's default phases are Input, Simulation, Transform, Collision, GameRules, Presentation; priorities are descending within each phase.
- Existing ADRs are `adr-001-game-feel-architecture.md` and `adr-002-presentation-architecture.md`. Neither is a locomotion contact-model ADR.
- Existing regression coverage includes `packages/core/tests/PlatformerSystems.test.ts`, `packages/core/tests/PlatformerJumpSystem.test.ts`, Platformer game tests and Echo Runner schedule snapshots. Replay and snapshot-hash infrastructure exists under `packages/core/src/snapshots` and `packages/core/tests`.
- The schedule uses `Date.now()` only to timestamp diagnostic registration/shutdown errors. The inspected locomotion systems do not use wall-clock APIs or `Math.random`; the moving-platform sine path is driven by accumulated simulation delta.

## 14. B1 implementation notes

- Added an optional ECS `LocomotionProfile` component with ground, air, momentum and optional slide data.
- Added Responsive, Momentum and Heavy presets as plain serializable data.
- The movement system selects the new algorithm only when the component exists; entities without it retain the existing legacy calculation path.
- The profile path distinguishes passive deceleration, explicit braking, acceleration and direction reversal. Air steering scales acceleration authority, never current velocity.
- `preserveMomentum` is declared for the later support-detachment block; B1 does not consume it.


## 15. B3 implementation notes — physics materials and contacts

- Added the serializable PhysicsMaterial contract with static/dynamic friction, restitution, traction and optional conveyor velocity.
- TileDefinition can reference a material by materialId; Tilemap stores the material definition map. Existing tilemaps without materialId retain their legacy iceMultiplier and bounce behavior.
- Added PhysicsContact and PhysicsContactState ECS contracts. TileCollisionSystem publishes axis-aligned wall, ceiling and ground contacts, including resolved material data and surface velocity; stale contact state is cleared each collision update.
- TileCollisionSystem now accepts both Collider2D AABBs (Echo Runner) and Collider box shapes (Platformer), closing the collider mismatch documented in the audit.
- PlatformerMovementSystem consumes resolved contact data: traction scales grounded input/braking acceleration, dynamic/static friction oppose or stop relative horizontal drift, and conveyor velocity is handled as a surface-relative baseline.
- PlatformerJumpSystem consumes resolved contact state for grounded eligibility while retaining PlatformerGroundState as a compatibility path for existing carrier/platform support.
- Material restitution applies to landing normal velocity. B3 does not add slope geometry or merge generic rigid-body manifolds; those remain explicit limitations.
- Added PHYSICS_MATERIAL_PRESETS (normal, ice, mud, elastic, conveyor), focused tests, and ADR-003.
- Test execution is pending GitHub Actions for the final B3 commit; no local test run is claimed.


## 16. B4 — stable slope contacts

- Added opt-in TileSlopeDefinition to tile definitions. The line segment is expressed in tile-local coordinates and ordered left-to-right; axis-aligned tiles remain unchanged.
- TileCollisionSystem resolves the line surface, normalized upward normal and tangent; it projects the AABB support radius onto the plane (not just the collider center), preventing the rectangular collider from cutting through the ramp, and projects velocity onto the tangent.
- Per-slope maxWalkableAngleDegrees (default 50°) controls grounded eligibility. Steeper surfaces still produce a contact but do not set PlatformerGroundState, PhysicsContactState.isGrounded or jump eligibility.
- Per-slope snapDistance (default 8 units) tolerates fixed-step vertical error. Static/dynamic friction oppose downhill drift; the fallback coefficients for a slope without an authored material are 0.8/0.6.
- Added ascending/descending ramp, steep-slope, static-friction and snapshot-hash tests. One-way slopes only collide from above.
- Limits: tile-line slopes only; no polygon/curved surfaces or generic CollisionSystem2D manifold integration.


## 17. B2 — sliding posture and deterministic clearance

- Added the opt-in PlatformerPosture component with standing/sliding/blocked states, desired posture, full collider heights and fixed-step slide timers.
- Added slideHeld to PlatformerInputComponent. The game/input binding must populate this action; no key or controller mapping is assumed by core.
- Locomotion profile presets now include slide thresholds, steering/acceleration/friction multipliers and minimum/maximum durations.
- PlatformerSlideSystem enters only while grounded and at or above minEntrySpeed; collider height changes preserve the world-space foot position for Collider2D AABBs and legacy Collider boxes.
- Release exits only after minimum duration. Maximum duration requests exit even while held. If standing clearance is obstructed, posture remains blocked with the reduced collider and retries each fixed tick.
- Clearance checks solid tilemap cells and enabled, non-trigger box/AABB colliders that pass mutual layer/mask filters; it ignores the entity's own collider and one-way tiles.
- PlatformerMovementSystem applies reduced steering and profile/material-driven slide friction. Entities without PlatformerPosture and a slide profile stay on the previous movement path.
- Added tests for entry threshold/path, foot preservation, minimum duration, blocked ceiling retry, solid entity collider clearance, slide friction and opt-in compatibility.


## 18. B5 — moving-platform support velocity and momentum

- Moved MovingPlatformSystem to the start of the shared Platformer/Echo Runner simulation schedule so its transform and fixed-step velocity are available to locomotion in the same tick.
- PlatformCarrySystem now runs after jump resolution and before PhysicsIntegrateSystem. Contact-aware passengers are carried through a rebase of world velocity to the current support velocity, then integrated exactly once; legacy entities without PhysicsContactState retain transform-delta carrying. AABB landings use relative vertical velocity and snap to the already-advanced platform surface.
- Publishes an upward PhysicsContact with the platform entity and world-space support velocity. TileCollisionSystem preserves live moving-platform contacts through its collision-state reset so locomotion can consume the contact in the following fixed tick.
- On jump, edge exit or carrier removal, entities with LocomotionProfile inherit the configured fraction of support velocity. The calculation removes the support contribution before applying preserveMomentum, avoiding double-counting horizontal surface velocity. PhysicsIntegrateSystem skips MovingPlatform entities because MovingPlatformSystem already authored their next transform. Entities without a profile retain legacy detach velocity.
- MovingPlatformSystem now ignores non-positive/non-finite time steps, avoiding division by zero in velocity estimation.
- Conveyor material velocity remains authored through PhysicsMaterial.conveyorVelocity and is combined with character movement through the existing contact-relative velocity path.
