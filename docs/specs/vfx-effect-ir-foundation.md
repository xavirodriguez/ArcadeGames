# VFX Architecture 2.0 — Foundation Contract

**Implementation branch:** `feat/vfx-foundation-ir`  
**Baseline:** post-#1044 master

## Contract

`src/games/shared/rendering/VFXEffectIR.ts` introduces a deliberately small typed boundary:

- `VFXEffectDescriptor` binds stable identity, an existing `SharedVFXPrimitiveName`, one of four semantic families, a family-specific context, a semantic visual profile, and optional presentation placement/lifetime.
- `CombatVFXContext`, `TraversalVFXContext`, `InteractionVFXContext`, and `TemporalVFXContext` are discriminated by `family`. No universal `Record<string, unknown>` payload is used.
- `VFX_VISUAL_PROFILES` supplies `arcade-neon` and `sumi-e` token maps. The neon profile reuses `src/theme/colors.ts`; Sumi-e reuses the validated `SUMI_E_SEMANTIC_TOKENS` palette.
- `resolveVFXSemanticColor` maps family meaning to a semantic token, independent of primitive identity.
- `resolveVFXPlacement` maps only typed presentation coordinates/direction to the existing spawn placement. Explicit presentation placement overrides contextual placement.

## Runtime ownership

`JuiceOrchestrator.spawnEffect()` resolves the profile and placement, then delegates to the existing `spawn()` method. Therefore entity creation, ECS `Render` + `TTL`, low-stimulation handling, hit-stop/shake compatibility fields, command-buffer behavior, and the central #1044 rollback guard remain owned by the existing orchestrator.

The descriptor does not add a renderer registry or update loop. `SharedVFX` exports the contract; existing Canvas/Skia shape registration and `IDrawAdapter` are unchanged. Transient lifetime remains TTL.

The family contexts are typed inputs to the presentation boundary. They do not execute gameplay rules. The Foundation pilot resolves family color and basic placement; it does not yet migrate `JUICE_CATALOG` consumers or add new gameplay events.

## Time and determinism

- Simulation time remains owned by the core schedule.
- Presentation-time animation remains in existing renderers/systems.
- Effect lifetime remains the ECS TTL component.
- Dispatch does not consume gameplay RNG or mutate gameplay state.
- Resimulation remains suppressed by the existing early guard in `spawn()`.

Hit-stop is intentionally not redesigned here. The VFX timer and core `GameplayFreeze` remain split; do not treat `hitStopMs` as a guaranteed core simulation pause until that separate ownership gap is consolidated and tested.

## Validation status

Focused Jest coverage is added for two profiles rendering the same primitive with distinct semantic colors, typed combat context placement, TTL reuse, and rollback suppression. These tests have been authored but must be executed in CI/local tooling; no execution result is claimed by this connector workflow.
