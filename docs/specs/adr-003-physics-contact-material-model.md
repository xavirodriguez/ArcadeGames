# ADR-003: Physics contact and surface material model

- **Status:** Accepted for Locomotion v1 B3
- **Date:** 2026-11-02

## Context

The platformer tile solver resolves axis-aligned AABB collisions and publishes only a grounded boolean plus a legacy ice multiplier. Movement cannot distinguish traction, sliding friction, restitution, or conveyor velocity without re-querying tilemap geometry. Generic collision manifolds expose normals, but tile contacts are not represented by the same ECS contract.

## Decision

1. TileCollisionSystem remains the authoritative producer of tile contacts.
2. PhysicsContactState is a serializable ECS component containing contacts from the latest collision phase, a selected upward-facing groundContact, and isGrounded.
3. Each PhysicsContact identifies the surface entity, world-space point, unit normal, separation, optional material ID, surface velocity, and resolved material data. Including resolved data prevents downstream tilemap re-queries.
4. TileDefinition.materialId resolves against Tilemap.physicsMaterials, a declarative serializable map of PhysicsMaterial definitions.
5. Material response is opt-in. Existing tilemaps without materialId keep their previous ice and bounce behavior.
6. Grounded movement consumes contact material data: traction limits input acceleration; dynamic friction opposes relative horizontal velocity; static friction stops sufficiently small un-driven drift. Conveyor velocity is the surface-relative velocity baseline.
7. Material restitution controls normal bounce on landing when configured above zero. Legacy kind=bounce and bounce remain supported when no material restitution override is configured.

## Consequences

- Movement and future slide/jump/platform systems consume one resolved contact contract rather than querying tilemaps independently.
- Contact state is snapshot-friendly because it is ordinary ECS component data and contains entity IDs rather than object references.
- B3 publishes stable axis-aligned normals only. Slope geometry and walkable-angle classification remain B4 work.
- Static/dynamic friction coefficients are converted to horizontal acceleration using configured fall gravity (or 980 units/s² when no gravity config exists). Defaults are gameplay tuning and require calibration.
- Generic collider manifolds are not yet merged into PhysicsContactState; this increment covers the tilemap contact producer used by Platformer and Echo Runner.

## Validation

Focused tests cover contact publication, surface velocity, material restitution, movement response, and stale-contact clearing. Full repository CI remains the integration gate.
