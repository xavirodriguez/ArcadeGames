# Locomotion v1 — Repository Audit

**Repository:** `xavirodriguez/ArcadeGames`  
**Branch:** `feat/locomotion-v1`  
**Audit baseline:** default branch `master`, inspected 2026-11-01  
**Scope:** existing platformer movement, input, physics, collision, ECS lifecycle and determinism contracts.

## 1. Executive summary

The repository already contains a reusable platformer movement stack. Locomotion v1 must extend that stack rather than introduce a second controller. Existing capabilities include horizontal acceleration/deceleration, asymmetric jump gravity, variable jump-height input handling, coyote/jump-buffer timers, tile collision, and a generic rigid-body collision pipeline.

The current implementation is not yet sufficient for the requested locomotion contract. In particular, jump execution is split between the game-specific input system and a shared timer system; one system stores edge history in a private `Map`; coyote/buffer durations are seconds rather than ticks; tile collision is axis-separated and grid-based; ground state exposes neither a contact normal nor a material identity; and no slide posture/clearance protocol or slope solver is present.

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
- `PlatformerCoyoteSystem`: refreshes/decrements coyote and jump-buffer timers and executes a buffered landing jump.
- Game-specific `PlatformerInputSystem`: derives input edges, performs jump/coyote/double-jump execution and short-hop clamping.
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
3. Jump input handling is split across a game-specific input system and a shared core system. The input system directly sets vertical velocity and resets ground state; the coyote system separately executes buffered jumps.
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

1. Consolidate jump edge, buffering, coyote and variable-height decisions into one ECS-backed controller path while retaining existing component compatibility where practical.
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

## 11. Next audit items before implementation

- Verify snapshot serialization/cloning of new component data.
- Trace `EntityBuilder.withCollider` and `ArcadeEntityBuilder.withCollider2D` to resolve the player collider mismatch risk.
- Inspect tile definition schema and collision tests for existing slope/one-way assumptions. Tile definitions currently support `normal | ice | spike | bounce`, optional friction and bounce; this is not a slope geometry contract.
- Inspect Platformer and Echo Runner tests and defaults to define backward-compatible profile migration.
