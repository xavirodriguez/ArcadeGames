# ADR-005: Moving-platform support velocity and passenger momentum

- **Status:** Implemented baseline; pending CI verification
- **Date:** 2026-11-02
- **Scope:** Locomotion v1 B5

## Context

Moving platforms advance before character resolution. Passenger carrying must avoid applying the same support displacement both as a transform delta and again through velocity integration. Locomotion also needs an authoritative support contact so input is evaluated relative to the moving surface.

## Decisions

1. MovingPlatformSystem evaluates its fixed-step trajectory, updates the platform transform and publishes its average world-space velocity. PhysicsIntegrateSystem skips MovingPlatform entities because their transforms are already advanced.
2. PlatformCarrySystem runs after jump resolution and before PhysicsIntegrateSystem. Contact-aware passengers are rebased to the current support velocity and integrated once; legacy passengers without PhysicsContactState retain transform-delta carrying.
3. PlatformCarrySystem publishes an upward PhysicsContact with the platform entity and surfaceVelocity. TileCollisionSystem preserves live moving-platform contacts across its contact refresh.
4. Jump resolution includes the full vertical support impulse before detachment. PlatformCarrySystem removes the full support component and reapplies only the configured preserveMomentum fraction.
5. Edge detachment applies LocomotionProfile.momentum.preserveMomentum. Entities without a locomotion profile retain legacy detach behavior.
6. Moving-platform support remains opt-in through RegisterPlatformerSystemsOptions.includeMovingPlatforms.

## Consequences and limits

- The moving-platform path supports solid AABB Collider2D platforms and sine trajectories.
- Contact state and support velocity are ECS data and participate in snapshots/replay.
- Rotating supports, arbitrary platform geometry and generic CollisionSystem2D manifold merging are out of scope.
