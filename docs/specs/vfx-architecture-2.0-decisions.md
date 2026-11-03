# VFX Architecture 2.0 — Evidence-Based Decisions

**Date:** 2026-11-03  
**Baseline:** `master` at `5e4e289d8e51802f9fc2c53850762d68e62798a0` (post-#1044)

This document records the four closed strategic decisions and the implementation constraints supported by the current repository. The exact TypeScript API is a Foundation deliverable, not a preordained interface.

## 1. Fixed strategic decisions

| Decision | Resolution | Rationale |
|---|---|---|
| Effect IR | Minimal typed layer over existing primitives and mechanisms | `JuiceOrchestrator`, `JUICE_CATALOG`, `IDrawAdapter`, and ECS `Render` + `TTL` already provide the execution path |
| Visual Lab | Early; PR3 immediately after Foundation | The contract should be inspected against production definitions before expanding integrations |
| Visual profiles | Semantic profiles/tokens | Shared style meaning should resolve independently of gameplay identity and parameters |
| Development organization | Sequential | Each PR is validated before the next begins |

## 2. Minimal Effect IR

The IR is a typed semantic dispatch boundary, not an execution engine. Its minimum useful responsibility is to describe:

- Stable effect identity and semantic family.
- Narrow, family-specific context for real consumers.
- The existing primitive/drawer to invoke.
- A semantic visual profile (or the resolved profile selected for the consumer).
- Only the lifetime/variant metadata needed by existing runtime behavior.

It must not own ECS entity creation/destruction, update loops, scheduling, particles, gameplay rules, physics, collision, simulation clocks, or Canvas/Skia drawing. Existing systems remain responsible for those concerns.

The API should be justified by the current consumers. Do not create a universal untyped payload, a graph language, a plugin runtime, a parallel effect object tree, or speculative family fields without a real call site.

## 3. Runtime ownership and compatibility

1. `JuiceOrchestrator` remains the high-level spawn/event boundary for this phase.
2. `JUICE_CATALOG` remains supported as the existing per-game event map; the IR may adapt it but must not silently break its public call shape.
3. ECS `Transform`, `Render`, and `TTL` remain authoritative for transient effect placement, rendering and expiry.
4. `IDrawAdapter` remains the renderer-independent drawing surface.
5. `SharedVFX` and current game renderer bootstraps remain the registration integration points.
6. Sprite-backed effects continue through SpriteRegistry/SpriteAnimator; PixelFX manifest metadata is not a parallel asset registry.
7. The central `world.isReSimulating` early return in `JuiceOrchestrator.spawn()` is present after #1044 and must remain ahead of every presentation side effect.

## 4. Typed family contexts

Contexts express gameplay meaning; they do not implement gameplay. Candidate family boundaries are:

| Family | Context candidates | Must not do |
|---|---|---|
| Combat | direction, impact point, intensity/energy, source/target, material, attack phase | Damage, hit validation, combat timing |
| Traversal | velocity, direction, surface/material, take-off/landing, contact normal | Forces, friction, movement, collision |
| Interaction | source/target, distance, interaction medium, contact intensity | Pickup, magnetism or interaction rules |
| Temporal | focal point, transition phase, presentation factor/duration | Simulation delta, gameplay clocks, rollback |

Keep context types narrow and optional fields evidence-driven. Coordinates may be included as resolved presentation placement, but do not reduce all semantics to x/y/rotation.

## 5. Semantic visual profiles

Profiles map semantic roles to visual tokens. They must not encode gameplay identity, damage, speed, collision, or event-specific mechanics.

Derive the token vocabulary from actual themes and consumers during Foundation. Demonstrate at least two meaningfully different profiles (for example arcade/neon and Sumi-e) resolving the same semantic roles through the same drawer definitions. Do not duplicate drawers to obtain a style variant and do not freeze a speculative exhaustive token list.

## 6. Time, lifecycle, rollback and determinism

Keep three concepts explicit:

- **Simulation time:** advances gameplay under the core schedule.
- **Presentation time:** advances visual-only presentation; it must not change gameplay delta or outcomes.
- **Effect lifetime:** bounds transient ECS presentation entities and remains represented by `TTL`.

Rules:

- VFX dispatch must not mutate gameplay state or consume gameplay RNG.
- Resimulation must not create duplicate presentation effects; preserve the central #1044 guard and test the new dispatch path.
- Do not add a timeline scheduler or second TTL manager.
- Deterministic visual capture metadata may be added by Visual Lab (PR3), not by inventing a runtime clock in Foundation.

## 7. Hit-stop constraint

Hit-stop ownership is split in the current repository. `HitStopSystem.requestHitStop` maintains the priority/cooldown state in `VFXWorldState.hitStopTimer`; core `Schedule.update()` freezes simulation using `GameplayFreeze`. Hit & Run uses the core freeze helpers, while `JuiceOrchestrator.spawn()` requests the separate VFX timer.

Foundation must not add a third freeze path or claim these mechanisms are unified. Preserve current Juice profile fields for compatibility. Before Combat integration relies on `hitStopMs` to pause simulation, consolidate the existing request policy with the Juice/core-freeze work and add an end-to-end scheduler test that preserves priority, override and cooldown semantics.

## 8. Sequential roadmap and gates

| PR | Deliverable | Gate |
|---|---|---|
| PR1 — Audit | Repository evidence and constraints | Complete; baseline reconciled after #1044 |
| PR2 — Foundation | Minimal typed contract, semantic profiles, dispatch compatibility, lifecycle/rollback tests | Focused Jest, typecheck, relevant build and CI pass; docs match implementation |
| PR3 — Visual Lab MVP | Thin harness over production definitions, profiles and renderer registrations | PR2 validated; no duplicate renderer/effect runtime |
| PR4 — Combat | Typed combat contexts and integrations | Hit-stop contract consolidated before relying on simulation freeze |
| PR5 — Traversal | Surface/movement presentation contexts | Gameplay physics remain authoritative |
| PR6 — Interaction & Temporal | Typed interaction/temporal semantics | Presentation time remains separate from simulation |
| PR7 — Integration & Hardening | Revalidated consumers, rollback, parity and measured performance | Baselines and migration evidence |
| PR8 — Visual Lab Regression | Reproducible scenarios, references and regression checks | Capture metadata and tolerance policy established |

## 9. Explicit non-goals

- Replacing `JuiceOrchestrator`, `SharedVFX`, or `IDrawAdapter`.
- A second ECS, entity manager, scheduler, timeline, TTL manager or particle engine.
- Runtime dependency on PixelFX.
- A general-purpose visual scripting language or plugin runtime.
- Mass migration of all game-specific feedback in Foundation.
- Sprite-sheet asset registration or SpriteAnimator parity work.
- Zero-allocation claims or optimization without a measured baseline.
- Hit-stop redesign inside Foundation.

**Decision status:** the four strategic choices are closed. Foundation is authorized to implement the smallest contract justified by existing consumers. The stale pre-merge blockers (duplicate/open #1040/#1041, three/eight drawer mismatch, missing rollback guard, and Brick Shatter test mismatch) are resolved by the merged repository state and #1044; they must not be repeated as active findings.
