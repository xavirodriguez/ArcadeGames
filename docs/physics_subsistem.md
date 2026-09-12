# Physics Subsystem

The Physics Subsystem in TinyAster provides a deterministic 2D simulation environment optimized for arcade-style games. It utilizes a decoupled architecture where dynamics (integration and solving) are separated from collision detection. The system is designed for high performance and memory efficiency, employing zero-allocation patterns such as object pooling and in-place sorting to minimize Garbage Collection (GC) pressure during the fixed-timestep simulation.

## Physics Pipeline Overview

The physics simulation follows a structured pipeline executed within the Simulation and Collision phases of the engine schedule.

**Sources:**

- `packages/core/src/physics/dynamics/PhysicsIntegrateSystem.ts` (1-30)
- `packages/core/src/physics/collision/CollisionSystems.ts` (48-138)
- `packages/core/src/physics/systems/BoundarySystem.ts` (17-26)
- `packages/core/src/physics/systems/TileCollisionSystem.ts` (17-47)
- `packages/core/src/physics/systems/PlatformerMovementSystem.ts` (8-13)
- `packages/core/src/physics/systems/PlatformerGravitySystem.ts` (10-14)
- `packages/core/src/physics/systems/MovingPlatformSystem.ts` (1-10)
- `packages/core/src/physics/systems/PlatformCarrySystem.ts` (1-10)

## Dynamics & Integration

TinyAster uses semi-implicit Euler integration for movement. Dynamics are split into two primary systems to ensure that forces and velocities are correctly applied before and after collision resolution.

### PhysicsIntegrateSystem

This system updates the `Transform` component's position based on the `Velocity` component. It is the "predictive" step where entities move to their intended new positions before collisions are checked.

- **Key Logic:** `transform.x += velocity.vx * dt`, `transform.y += velocity.vy * dt`  
  (`packages/core/src/physics/dynamics/PhysicsIntegrateSystem.ts` 75-76)
- **Angular:** Also updates `transform.rotation` using `velocity.angularVelocity`  
  (`packages/core/src/physics/dynamics/PhysicsIntegrateSystem.ts` 77-79)

### PhysicsSolveSystem

Executed after the collision phase, this system resolves overlaps (penetration) and applies impulse responses. It ensures that two solid objects do not occupy the same space by pushing them apart along the collision normal provided by the `NarrowPhase`.

(`packages/core/src/physics/dynamics/PhysicsSolveSystem.ts` 5-24)

### Friction & Movement

- **FrictionSystem:** Applies linear friction to entities with a `FrictionComponent`. It scales velocity by `(1 - friction * dt)`, preventing infinite sliding in games like Asteroids.  
  (`packages/core/src/physics/systems/FrictionSystem.ts` 20-23)
- **PlatformerMovementSystem:** Handles horizontal movement for platformer entities, applying acceleration and deceleration based on whether the entity is grounded or airborne. It also accounts for surface properties like ice.  
  (`packages/core/src/physics/systems/PlatformerMovementSystem.ts` 8-13)

**Sources:**

- `packages/core/src/physics/dynamics/PhysicsIntegrateSystem.ts` (7-25)
- `packages/core/src/physics/dynamics/PhysicsSolveSystem.ts` (5-24)
- `packages/core/src/physics/systems/FrictionSystem.ts` (1-25)
- `packages/core/src/physics/systems/PlatformerMovementSystem.ts` (15-77)

## Collision Pipeline

TinyAster implements a classic two-phase collision detection pipeline to balance accuracy with performance.

### Phase 1: BroadPhase (Sweep & Prune)

To avoid the O(n²) complexity of checking every entity against every other entity, the `BroadPhase` class uses a 1D Sweep and Prune algorithm.

- **AABB Generation:** Computes the Axis-Aligned Bounding Box for all colliders.  
  (`packages/core/src/physics/collision/BroadPhase.ts` 63-85)
- **Sorting:** Sorts entities along the X-axis using an in-place Shell sort. This is highly efficient for game worlds where entity positions change incrementally (temporal coherence).  
  (`packages/core/src/physics/collision/BroadPhase.ts` 87-101)
- **Overlap Check:** Iterates through the sorted list, only checking entities whose X-bounds overlap. It also checks for Y-axis overlap to identify potential collision pairs.  
  (`packages/core/src/physics/collision/BroadPhase.ts` 103-123)

### Phase 2: NarrowPhase (SAT)

For pairs that pass the BroadPhase, the `NarrowPhase` performs precise geometric checks using the Separating Axis Theorem (SAT). It supports:

- **Circles:** Simple distance checks.  
  (`packages/core/src/physics/collision/NarrowPhase.ts` 44-50)
- **Boxes:** Optimized OBB (Oriented Bounding Box) checks.  
  (`packages/core/src/physics/collision/NarrowPhase.ts` 52-65)
- **Convex Polygons:** Projection of vertices onto edge normals to find a separating axis.  
  (`packages/core/src/physics/collision/NarrowPhase.ts` 67-90)

If no separating axis is found, the shapes are colliding, and a `CollisionManifold` is generated containing the normal, penetration depth, and `contactPoints`.

(`packages/core/src/physics/collision/CollisionTypes.ts` 5-20)

### CollisionSystem2D

The `CollisionSystem2D` orchestrates the broad-phase and narrow-phase collision detection. It queries for entities with `Transform` and `Collider` or `Collider2D` components.

(`packages/core/src/physics/collision/CollisionSystems.ts` 167-170)

It then uses `BroadPhase.sweepAndPrune` to get candidate pairs and `NarrowPhase.test` for precise collision manifolds.

(`packages/core/src/physics/collision/CollisionSystems.ts` 175-176)

This system also manages collision events:

- **onCollision:** Registers callbacks for physical collisions.  
  (`packages/core/src/physics/collision/CollisionSystems.ts` 67-72)
- **onTriggerEnter:** Registers callbacks when an entity first enters a trigger volume.  
  (`packages/core/src/physics/collision/CollisionSystems.ts` 75-80)
- **onTriggerExit:** Registers callbacks when an entity exits a trigger volume.  
  (`packages/core/src/physics/collision/CollisionSystems.ts` 83-88)

It populates `CollisionEvents` components on entities, which other systems like `CollectibleSystem` or `CombatSystem` can then process.

(`packages/core/src/physics/collision/CollisionSystems.ts` 200-201)

The system tracks `activePairs` and `currentFramePairs` to correctly identify `onTriggerEnter` and `onTriggerExit` events.

(`packages/core/src/physics/collision/CollisionSystems.ts` 56-57)

**Sources:**

- `packages/core/src/physics/collision/BroadPhase.ts` (32-127)
- `packages/core/src/physics/collision/NarrowPhase.ts` (1-50)
- `packages/core/src/physics/collision/CollisionSystems.ts` (50-250)
- `packages/core/tests/CollisionPipeline.integration.test.ts` (30-33)

## Core Physics Components

| Component                  | Purpose                                                           | Key Properties                                                                              |
| -------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `Transform`                | Position, rotation, and scale in the world.                       | `x`, `y`, `rotation`, `worldX`, `worldY`                                                    |
| `Velocity`                 | Linear and angular movement vectors.                              | `vx`, `vy`, `angularVelocity`                                                               |
| `Collider`                 | Geometric definition for collisions (general 2D/3D).              | `shape`, `layer`, `mask`, `isTrigger`                                                       |
| `Collider2D`               | Geometric definition for 2D collisions (AABB/Circle).             | `shape` (aabb or circle), `halfWidth`, `halfHeight`, `radius`, `layer`, `mask`, `isTrigger` |
| `CollisionEvents`          | Stores collision and trigger events for the current frame.        | `collisions`, `activeTriggers`, `triggersEntered`, `triggersExited`                         |
| `Boundary`                 | Constraints for the game world area.                              | `width`, `height`, `mode` (wrap/bounce/destroy)                                             |
| `PlatformerGroundState`    | Tracks if a platformer entity is grounded and surface properties. | `isGrounded`, `iceMultiplier`                                                               |
| `PlatformerMovementConfig` | Configuration for platformer movement.                            | `maxSpeed`, `acceleration`, `deceleration`, `airAcceleration`, `airDeceleration`            |

**Sources:**

- `packages/core/src/ecs/CoreComponents.ts` (8-71)
- `packages/core/src/physics/PhysicsTypes.ts` (1-10)
- `packages/core/src/physics/collision/CollisionTypes.ts` (22-30)

## Spatial Queries

The `PhysicsQuery` utility allows systems to query the physical world without waiting for the collision phase. This is useful for AI line-of-sight, mouse picking, or immediate explosion radius checks. It enforces strong type-safety by parameterizing over the world's `ComponentRegistry`.

(`packages/core/src/physics/query/PhysicsQuery.ts` 9-17)

- **`pointCast(world, x, y)`:** Evaluates point intersection against Circle, Box, and Convex Polygon geometries, accounting for world rotation and offsets.  
  (`packages/core/src/physics/query/PhysicsQuery.ts` 30-100)
- **`shapeCast(world, shape, x, y)`:** Evaluates narrowphase SAT overlap using `NarrowPhase.test` between the input shape and world colliders.  
  (`packages/core/src/physics/query/PhysicsQuery.ts` 114-128)

## Specialized Systems

### BoundarySystem

Enforces limits on entity movement. It is essential for arcade mechanics:

- **Wrap:** Used in Asteroids to teleport the ship from the left edge to the right.  
  (`packages/core/src/physics/systems/BoundarySystem.ts` 41-50)
- **Bounce:** Used in Pong for the ball hitting top/bottom walls.  
  (`packages/core/src/physics/systems/BoundarySystem.ts` 66-102)
- **Destroy:** Automatically cleans up bullets or off-screen entities via `WorldCommandBuffer` or `ObjectPool` recycling.  
  (`packages/core/src/physics/systems/BoundarySystem.ts` 51-65)

### Platformer Systems

For games requiring grid-based movement (like Platformer):

- **TileCollisionSystem:** Resolves AABB collisions against a Tilemap grid. It performs separate axis resolution (X followed by Y) and supports specialized tile behaviors like one-way platforms, ice friction, and spikes.  
  (`packages/core/src/physics/systems/TileCollisionSystem.ts` 38-46)  
  The system iterates over tiles within the entity's bounding box and adjusts position and velocity upon collision.  
  (`packages/core/src/physics/systems/TileCollisionSystem.ts` 103-142, 162-201)
- **PlatformerGravitySystem:** Implements asymmetrical gravity (higher gravity when falling than when jumping) to provide a "snappy" jump feel.  
  (`packages/core/src/physics/systems/PlatformerGravitySystem.ts` 17-56)
- **PlatformerCoyoteSystem:** Implements "coyote time" and "jump buffering" mechanics, allowing players to jump slightly after leaving a platform or before landing.  
  (`packages/core/src/systems/PlatformerCoyoteSystem.ts` 10-15)
- **PlatformCarrySystem / MovingPlatformSystem:** Manages entities standing on or moving with platforms.  
  (`packages/core/src/physics/systems/PlatformCarrySystem.ts` 1-10, `packages/core/src/physics/systems/MovingPlatformSystem.ts` 1-10)

### ShipPhysics Helper

A utility for Asteroids-style movement, calculating thrust vectors based on rotation and applying maximum velocity caps.

(`packages/core/src/physics/utils/ShipPhysics.ts` 1-40)

## Implementation Details: Memory Management

The physics subsystem is designed to be "GC-friendly" by avoiding object creation in the inner loops of the `GameLoop`. It utilizes static instance reusable pools for boundary calculations and collision pair tracking.

(`.jules/bolt.md` 16)

### Physics Subsystem Memory Optimization

- **Zero-Allocation Hot-Paths:** Systems like `CollisionSystem2D` use in-place splice and pre-allocated `tempQuery` arrays to avoid heap allocations.  
  (`.jules/bolt.md` 10)  
  `BroadPhase` reuses `boundsPool` and `pairsPool` to store AABB data and potential collision pairs without per-tick allocations.  
  (`packages/core/src/physics/collision/BroadPhase.ts` 19-20, 103-123)
- **Version Gating:** Systems read components with `getComponent` first and only invoke `world.getMutableComponent` if a mutation is required. This prevents unnecessary `stateVersion` increments and callback allocations.  
  (`.jules/bolt.md` 9, 15)  
  For example, `PhysicsIntegrateSystem` checks if `vx`, `vy`, or `angularVelocity` are non-zero before acquiring a mutable `Transform` component.  
  (`packages/core/src/physics/dynamics/PhysicsIntegrateSystem.ts` 67-68)
- **Resource Array Reuse:** `SpatialCullingSystem` and `PhysicsIntegrateSystem` reuse internal arrays (`candidateBuffer`, `tempQuery`) to store filtered entity lists, avoiding new allocations each frame.  
  (`packages/core/src/systems/SpatialCullingSystem.ts` 35, `packages/core/src/physics/dynamics/PhysicsIntegrateSystem.ts` 48-49)
