# ADR-004: Tile slope geometry and platformer slide posture

- **Status:** Implemented baseline; pending CI verification
- **Date:** 2026-11-02
- **Scope:** Locomotion v1 B4 and B2

## Context

The existing tile collision solver resolves axis-aligned full-tile AABBs. It cannot provide stable ramp normals, and a visual slope would not be a physical slope. Sliding also needs a stable foot anchor and deterministic clearance before restoring standing height.

## Decisions

1. A sloped tile is opt-in through a serializable TileSlopeDefinition on TileDefinition. It defines a top-surface line in tile-local coordinates, ordered left-to-right.
2. The collision solver computes a normalized surface normal and tangent from that line and resolves the AABB support radius against the plane, rather than snapping only the collider center. The per-tile walkable-angle threshold defaults to 50 degrees and can be authored explicitly. Contacts steeper than the threshold remain surface contacts but do not set grounded state or jump eligibility.
3. Walkable slope contact snaps the collider's foot to the surface and projects velocity onto its tangent. Static/dynamic friction oppose gravity-driven tangential motion; the default static/dynamic coefficients for slope-only tiles are 0.8/0.6.
4. Existing axis-aligned tiles keep their current collision path. Slope tiles do not use their full tile AABB as the top surface. One-way slope tiles are only contacted from above.
5. Sliding is opt-in through PlatformerPosture plus a LocomotionProfile.slide configuration. The slide system changes physical collider height while preserving the foot position.
6. Standing clearance checks solid tile geometry and enabled, non-trigger box/AABB colliders with compatible layer masks. The entity's own collider and one-way tiles do not block standing.
7. If standing clearance fails, posture remains blocked with the reduced collider and retries on subsequent fixed ticks. A maximum slide duration requests exit but never forces penetration through an obstruction.

## Consequences and limits

- This increment supports line-segment ramp surfaces inside tile cells, not arbitrary polygon collision or curved terrain.
- A slope is authored in tile-local units; endpoint validity and level-authoring UX remain content-pipeline responsibilities.
- Clearance currently checks tilemap solids and box/AABB colliders; circle colliders are intentionally non-blocking for this posture check.
- Input bindings must set PlatformerInput.slideHeld; the core does not assume a keyboard/gamepad mapping.
- Values are game-feel starting points and require calibration per title.


## B2 implementation notes

- The shared Platformer/Echo Runner schedule runs PlatformerSlideSystem before PlatformerMovementSystem.
- The core exposes slideHeld but deliberately does not bind a keyboard/gamepad key. Each game maps its own action into the ECS input component.
- Slide timing is fixed-step ECS state; no wall-clock or system-instance state is used.
