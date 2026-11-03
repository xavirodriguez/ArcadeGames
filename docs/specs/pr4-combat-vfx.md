# PR4 — Combat VFX

## Scope

PR4 extends the existing procedural VFX contract. It does not introduce a parallel renderer registry, a second lifetime system, or new gameplay mechanics.

The four production drawers are:

| Primitive | Visual purpose | Gameplay status |
| --- | --- | --- |
| `pixelfx_ricochet` | Contact spark and reflected trajectory | Visual Lab only; no verified projectile-bounce mechanic is being claimed |
| `pixelfx_charge` | Directional energy core and backward speed streaks | Hit & Run charger `Anticipation → Charge` transition |
| `pixelfx_shield_pulse` | Expanding defensive shell and separated arcs | Visual Lab only; not evidence of an implemented shield |
| `pixelfx_target_warning` | Pulsing lock-on brackets | Hit & Run telegraphed `Anticipation` entry |

## Architecture

- Drawers consume the existing `IDrawAdapter` and read progress from ECS `TTL`.
- `registerPixelFxProceduralVFX` registers the same four names for Canvas and Skia.
- `SharedVFXPrimitiveName` is the shared spawn contract; Visual Lab references the production drawer functions rather than copying their drawing code.
- Hit & Run emits cues at existing FSM entry transitions. The helper delegates to `JuiceOrchestrator.spawn`, which owns transient entity creation and the rollback/resimulation presentation guard.
- No effect changes hitboxes, damage, velocity, AI decisions, or other authoritative gameplay state.

## Reproducible Visual Lab presets

- `ricochet-neon`
- `charge-neon`
- `shield-pulse-sumi`
- `target-warning-neon`

Each preset fixes effect identity, semantic profile, progress, size, rotation, and seed metadata.

## Validation

Focused tests cover:
- all 17 production drawers appear exactly once in the Visual Lab catalog;
- Canvas and Skia register the same ordered set of 17 names;
- each PR4 drawer emits adapter primitives while its TTL is alive;
- expired TTLs produce no drawing calls;
- the charger FSM emits target-warning and charge effect entities at the corresponding transitions.

The PR checks remain the source of truth for CI execution. A passing unit test does not replace visual review in Visual Lab on both renderers.
