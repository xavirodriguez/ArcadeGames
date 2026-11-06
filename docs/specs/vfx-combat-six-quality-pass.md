# VFX Combat Six — Visual Quality Pass

Status: implementation baseline
Scope: Impact, Hitstun, Stagger, Guard Break, Armor Break and Ricochet
Rendering contract: existing `IDrawAdapter`, Canvas and Skia production drawers

## Objective

Give six combat events distinct visual identities. The quality target is not particle count or glow intensity: it is immediate semantic recognition, a readable silhouette, deliberate temporal evolution and a stable result across renderers.

This pass deliberately keeps the existing production drawer registration, normalized TTL progress, adapter primitives and deterministic geometry. It does not add a renderer, scheduler, clock, RNG stream or new drawing primitive.

## Visual contracts

| Effect | Primary silhouette | Motion language | Must not be confused with |
| --- | --- | --- | --- |
| Impact | Contact core, expanding shock ring and unequal radial wedges | Fast outward impulse followed by dissipation | A prolonged stun cue |
| Hitstun | Compact pulsing core with three separated orbit marks | Repeated short pulse; small orbit expansion | A body losing balance |
| Stagger | Three broken arcs and an off-axis displaced mass | Shear, wobble and directional instability | A symmetric impact burst |
| Guard Break | Six-sided shield contour with intentional tears | Fractures branch from the pressure point and open outward | Armor plates breaking off |
| Armor Break | Six closed angular plates peeling away from a central shell | Heavy radial separation with a short flash | A shield-shaped defensive failure |
| Ricochet | Incoming segment, contact point and a clearly redirected outgoing path | Deflection along a new trajectory with tangential sparks | A radial explosion |

## Temporal review checkpoints

The Visual Lab now contains four fixed, reproducible samples for every effect in this slice:

| Progress | Review question |
| ---: | --- |
| 0.04 — Contact | Is the event origin immediately legible? |
| 0.28 — Expansion | Is the intended motion direction clear? |
| 0.58 — Peak | Does the effect communicate its unique gameplay meaning? |
| 0.88 — Dissipation | Does it resolve cleanly without a confusing residual silhouette? |

Each preset fixes effect, profile, size, rotation and seed. This makes visual review repeatable and avoids comparing unrelated scenarios.

## Acceptance rubric

Score each dimension from 0 to 5, then apply the weight.

| Dimension | Weight | Acceptance question |
| --- | ---: | --- |
| Semantic legibility | 25 | Can a viewer name the gameplay event without reading its label? |
| Silhouette and composition | 20 | Does the monochrome silhouette remain distinct at gameplay scale? |
| Temporal evolution | 20 | Are contact, expansion/peak and dissipation meaningfully different? |
| Visual hierarchy | 15 | Is the primary mark dominant over secondary details? |
| Material/event identity | 10 | Does the geometry express the type of failure, impact or deflection? |
| Gameplay integration | 10 | Does it remain readable amid actors, projectiles and camera movement? |

Target: at least 85/100, with no critical failure in semantic recognition, determinism or Canvas/Skia parity. A high numeric score cannot compensate for a critical semantic ambiguity.

## Required review protocol

1. Review all four temporal presets for each effect.
2. Inspect the silhouette in monochrome before judging color or glow.
3. Review at native gameplay size and at 0.75x scale.
4. Compare on both dark and light backgrounds; use the profile's own semantic palette.
5. Compare Canvas and Skia using identical preset parameters.
6. Repeat with at least two rotations and with the same preset seed.
7. Run a gameplay capture with overlapping combat events; check that effects do not merge into one undifferentiated flash.
8. Record any ambiguity between Impact/Hitstun, Hitstun/Stagger, Guard Break/Armor Break and Impact/Ricochet.

## Technical invariants

- All six effects remain pure drawer functions over the current world state.
- Progress comes from the existing TTL contract; no effect owns a clock.
- Geometry is deterministic for the same entity state and parameters.
- Canvas and Skia use the same registered drawer and adapter vocabulary.
- No draw-time random calls, wall-clock reads or persistent mutable animation state.
- Fracture branches that have not reached their temporal start are not emitted as zero-alpha geometry.

## Evidence still required

This code pass adds deterministic temporal review presets and semantic geometry tests. It does not constitute screenshot evidence or prove pixel-level parity. Before calling the six effects visually approved, attach matched Canvas/Skia captures for all four checkpoints and complete the weighted review rubric in the actual gameplay scene.
