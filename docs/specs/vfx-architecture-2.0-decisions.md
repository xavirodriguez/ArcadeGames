# VFX Architecture 2.0 — Evidence-Based Decisions

**Date:** 2026-11-03
**Baseline:** `master` at `0df1f73d49394695ee2eefed6e61e4d4953cbbb4`

This document closes the architecture choices that can be supported by the current repository evidence. It does not authorize implementation of contracts that conflict with the P0 audit findings.

## 1. Fixed architectural decisions

| Decision | Resolution | Repository rationale |
|---|---|---|
| Effect IR | Minimal typed layer over existing primitives and mechanisms | `JuiceOrchestrator`, `JUICE_CATALOG`, `IDrawAdapter`, ECS `Render` + `TTL` already provide most of the execution path |
| Visual Lab | Early; PR 3 immediately after Foundation | The current code has no identified shared inspection harness; validate the contract before expanding the effect catalog |
| Visual profiles | Semantic tokens/profiles shared across games and drawers | Current per-game Juice profiles are event mappings with low-level tint/scale/TTL; they are not a shared semantic palette/style model |
| Development organization | Sequential | Foundation and renderer/lifecycle contracts must stabilize before family integration work branches out |

## 2. Minimal Effect IR boundary

The IR is a typed semantic descriptor and context boundary, not a new execution engine.

It may define:

- Stable effect identity and family.
- Typed family-specific context.
- A reference to an existing primitive/drawer or a small composition using existing adapter operations.
- Resolved semantic visual profile.
- Duration/lifetime metadata only where the existing TTL path cannot express the requirement.
- Optional deterministic seed/variant input for presentation-only variation.

It must not own:

- ECS entity creation or destruction.
- A second scheduler or timeline tick loop.
- A second TTL/lifetime manager.
- A particle pool or per-frame object graph.
- Canvas/Skia-specific draw code in effect definitions.
- Gameplay state transitions, physics, collision or timing.
- Runtime dependency on the upstream PixelFX package.

The exact TypeScript API remains a PR 2 deliverable. The illustrative `createState/update/draw` shape in the roadmap is not a mandate. The audit has not established that each effect needs independent mutable state or an update callback; TTL-derived progress and pure geometry may be sufficient for most transient effects.

## 3. Runtime and lifecycle ownership

1. `JuiceOrchestrator` remains the high-level spawn/event entry point until a measured limitation justifies a change.
2. Existing `JUICE_CATALOG` remains the event-to-profile mapping source during migration.
3. ECS `Transform`, `Render` and `TTL` remain the entity presentation/lifetime contract.
4. Existing `IDrawAdapter` remains the renderer-independent drawing surface.
5. `SharedVFX` and the current game renderer bootstraps remain the registration integration points.
6. Sprite-backed effects use the existing SpriteRegistry/SpriteAnimator path; the PixelFX manifest is metadata glue, not a parallel asset registry.
7. Hit-stop continues through `HitStopSystem` and core `GameplayFreeze`.

### Required runtime correction

The audited master version of `JuiceOrchestrator.spawn` does not centrally reject `world.isReSimulating`, despite the PixelFX integration spec claiming that it does. Central rollback suppression is a precondition for new shared VFX consumers. The guard must precede hit-stop, shake and entity/command creation.

## 4. Semantic context model

Contexts should express gameplay meaning, not drawer coordinates alone.

| Family | Semantic context fields (candidate set) | Explicit non-responsibility |
|---|---|---|
| Combat | direction, energy/intensity, source/target, impact point, material, threat/attack phase | Must not calculate damage, hit validity or combat timing |
| Traversal | velocity, direction, surface/material, take-off/landing, origin/destination, contact normal | Must not apply forces, friction, movement or collision |
| Interaction | source/target entities, distance, interaction medium, convergence/contact intensity | Must not implement pickup, magnetism or interaction rules |
| Temporal | presentation factor, visual duration, center/focal point, transition phase | Must not alter simulation delta, gameplay clocks or rollback |

Coordinates remain optional resolved presentation data. They do not replace semantic context.

Context types should be narrow per family and should be populated by real typed gameplay events. Avoid a universal `Record<string, unknown>` payload.

## 5. Semantic visual profiles

The visual profile is a semantic token mapping, not an independent drawer configuration.

Candidate semantic tokens:

- Palette roles: primary, secondary, accent, neutral, warning, energy, environment.
- Style roles: line weight, density, contrast, edge character, glow/ink treatment.
- Motion/shape modifiers only when they are presentation-wide concepts and not gameplay parameters.

A profile such as `sumi-e` should resolve semantic roles (e.g. impact → sumi ink, warning → vermilion, dispersion → dry-brush marks) while the same effect composition and timing remain shared. Arcade/neon profiles resolve the same roles to luminous colors and geometric fragments.

The exact token set should be derived from actual consumers and themes during PR 2. Do not freeze the illustrative `primary/secondary/accent/neutral` interface before reviewing current palettes and game theme contracts.

## 6. Time, rollback and determinism

The architecture must name three distinct concepts:

- **Simulation time:** advances gameplay and is controlled by the simulation schedule.
- **Presentation time:** advances visual-only animation and may be paused/scaled independently where existing runtime policy permits.
- **Effect lifetime:** bounds the existence of an ECS presentation entity, currently represented by TTL.

Rules:

1. A VFX must not change simulation delta or gameplay outcomes.
2. Rollback/resimulation must not create duplicate presentation effects or consume gameplay RNG.
3. A deterministic visual capture must record the effect identity, semantic context, profile, seed/variant, renderer, dimensions and sampled presentation time.
4. TTL remains authoritative for transient expiry unless a concrete persistent/cancellable use case proves otherwise.
5. Do not introduce a second timeline scheduler to support scrubbing. Visual Lab should evaluate/render the existing effect definition at a selected presentation time through a controlled development harness.

Current evidence shows TTL-derived progress in procedural drawers and `VFXWorldState.timePhase` for shared ambient effects. The three time domains are not yet represented as a unified explicit contract.

## 7. PR 1 → PR 8 gates

| PR | Gate before starting |
|---|---|
| PR 1 — Audit | Repository snapshot, PR ancestry/overlap, source/test discrepancies and blockers documented |
| PR 2 — Foundation | P0 rollback guard and procedural registry/test discrepancy resolved; exact API justified by current code |
| PR 3 — Visual Lab MVP | Foundation tests and both renderer registrations pass; no duplicate implementation |
| PR 4 — Combat | Combat contexts/profiles validated; all events are real gameplay transitions |
| PR 5 — Traversal | Surface and locomotion events exist; VFX cannot mutate physics |
| PR 6 — Interaction & Temporal | Entity-following semantics and presentation-time contract validated |
| PR 7 — Hardening | Single registration path, rollback/cancellation/expiry and performance baselines verified |
| PR 8 — Visual Lab regression | Reproducible scenarios, tolerance policy, references and performance reports automated |

## 8. Immediate reconciliation actions

Before PR 2:

1. Compare the head commits and file diffs of #1040 and #1041. Select one canonical branch; do not merge duplicate implementations.
2. Reconcile #1036's five additional drawers with current master source, tests and docs. The current drawer implementation and test suite disagree.
3. Verify the actual #1037 and #1039 merge ancestry and retain their valid procedural/sprite-sheet work.
4. Add or verify a central rollback no-op in `JuiceOrchestrator.spawn`.
5. Make Canvas and Skia registration assertions identical.
6. Run focused Jest, typecheck, build/CI and visual smoke tests in a capable local/Jules environment. The GitHub connector used for this audit cannot execute those commands.

## 9. Explicit non-goals

- Replacing `JuiceOrchestrator`.
- Replacing `SharedVFX` or `IDrawAdapter`.
- A general-purpose visual scripting language.
- A second ECS or entity manager.
- A second particle engine or scheduler.
- A runtime PixelFX dependency.
- Forcing every game-specific effect into a universal abstraction.
- Pixel-perfect equality between Canvas and Skia where rasterization differences are expected.

**Decision status:** the four strategic choices are closed. The implementation contract is intentionally not frozen until PR 2 resolves the P0 findings and validates the exact existing extension points.


---

## Repository reconciliation — 2026-11-03 follow-up

The PR merge graph has now been verified. #1040 and #1041 are both merged, with #1041 as the final integration pass; #1042 and #1043 are also merged. The previous instruction to compare/select between #1040 and #1041 is obsolete and withdrawn.

Post-merge source contains thirteen procedural drawers. Canvas and Skia registration tests both describe the same thirteen-shape contract. The current work is therefore consolidation/hardening, not recovery of missing drawers.

Two concrete correctness gaps remain in the post-merge tree and are being corrected before Foundation:

1. `JuiceOrchestrator.spawn` lacks a central `world.isReSimulating` guard despite the PixelFX integration documentation claiming this behavior. Call-site guards reduce exposure but do not protect direct/future callers. The follow-up patch adds an early return before any presentation side effect and a regression test.
2. The Brick Shatter drawer now draws its rotated rectangular outline using line primitives, while its test still expects `strokeRect`. The follow-up patch asserts the actual 28 line calls.

Allocation claims are deliberately not closed: `readEffectState` allocates a state object per draw and older impact/explosion helpers return temporary point objects. Establish a performance baseline in Foundation/Hardening before refactoring these paths.

Sprite-sheet PixelFX remains a separate optional asset pipeline. Its candidate manifest is not evidence that sprite sheets are registered or Canvas/Skia animation parity has been validated.

**Updated gate:** the PR merge reconciliation is complete. PR 2 may begin after the rollback and Brick Shatter test fixes pass focused Jest, typecheck and CI. No such execution is claimed by this documentation update; the GitHub connector cannot run the repository toolchain.


### Additional decision — hit-stop is not yet one runtime contract

The current implementation has a split ownership model: `HitStopSystem` maintains priority/cooldown in `VFXWorldState.hitStopTimer`, whereas the core scheduler reads `GameplayFreeze`. Hit & Run calls the core freeze helpers directly; `JuiceOrchestrator` calls the separate VFX timer. The earlier wording that suggested these were already unified is withdrawn.

VFX 2.0 must not add a third hit-stop system. Foundation may preserve the existing profile fields for compatibility, but Combat integration must not assume that `hitStopMs` pauses simulation until the existing Juice consolidation work routes accepted requests through the canonical core freeze resource and verifies the configured schedules. Priority, override and cooldown semantics must survive that migration.
