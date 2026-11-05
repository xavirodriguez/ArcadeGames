# VFX Architecture 2.0 — Visual Lab MVP

**Implementation branch:** `feat/vfx-visual-lab-mvp`  
**Baseline:** Foundation merged on `master` at `b9f850d`

## Purpose

Provide an in-app workbench for inspecting and tuning the twenty-seven existing PixelFX-inspired procedural compositions. The Lab is a developer tool and a consumer of production presentation code, not a new VFX runtime.

## Included

- Effect Browser for all twenty-seven registered `pixelfx_*` drawers.
- Semantic profile selector: `arcade-neon` and `sumi-e`.
- Browser Canvas live preview that invokes the real exported drawer functions with a minimal Render/TTL/Transform world fixture.
- Timeline progress control mapped to the existing normalized TTL contract.
- Size and rotation controls.
- Family/context/placement/color inspector backed by `VFXEffectIR`.
- Built-in deterministic presets for combat and traversal, including impact, ink burst, phase dash, hop, teleport, surface skid and mechanical motion.
- Arcade menu entry at `/vfx-lab`.

## Runtime and architecture boundaries

- The catalog in `VFXVisualLabModel` is a static developer-facing list of existing draw functions. It does not register shapes or create a second renderer registry.
- Preview invokes the same composition functions used by `registerPixelFxProceduralVFX`, through the existing `CanvasDrawAdapter`.
- The preview fixture implements only the component reads consumed by those drawers: `Render`, `TTL` and `Transform`. It does not instantiate a gameplay World or run an ECS schedule.
- Semantic colors and descriptor placement are resolved through the Foundation contract in `VFXEffectIR`.
- Canvas and Skia register the same twenty-seven names and use the same composition functions through their existing adapters.

## Explicit MVP limitations

- Canvas live preview is available on web. The Skia picture preview is rendered through the native Skia surface when the Skia runtime is available.
- The Lab reports the shared 27/27 registration contract; it does not claim pixel-diff parity or visual equivalence across Canvas and Skia.
- Presets are built-in reproducible configurations, not persisted user-authored scenarios. Their seed is passed as the stable entity identity; Explosion uses it for fragment variation.
- No effect authoring, new gameplay events, ECS entities, scheduler, animation clock, lifetime manager, particle engine or PixelFX runtime dependency is introduced.

## Validation

The focused model test verifies the twenty unique production drawers, family-correct descriptor creation and distinct semantic profile resolution. Explosion tests verify stable entity-seeded geometry. Charge, Shield Pulse and Ricochet now use compiled temporal samplers for staged buildup, delayed echoes, impact flashes and release arcs. CI/Jest and app typecheck results must be read from the PR checks; authored tests are not a claim of execution.


## Procedural animation evolution — Parry

The production catalog includes `pixelfx_parry`, a combat composition for a successful deflection:

- Two opposing guard arcs converge around a compact clash point.
- A short flash confirms the timing window.
- A delayed radial counter-burst communicates the release of force.
- Clash radius, flash envelope and burst reach are sampled from compiled temporal curves; the drawer remains stateless and uses the existing TTL progress contract.
- The same drawer is registered for Canvas and Skia and is exposed in the Visual Lab with a reproducible Neon preset.

The Visual Lab route is covered by a Playwright smoke test that opens `/vfx-lab` directly and verifies the title, renderer preview and effect browser. This is a route-load check, not a claim of pixel-level renderer parity.


## Procedural animation evolution — Combat batch 02

Three production combat compositions extend the temporal sampler catalog:

- `pixelfx_perfect_block`: guard shell compression, timed confirmation flash and expanding segmented ring.
- `pixelfx_critical_hit`: two-beat core flash and staggered radial fragments.
- `pixelfx_projectile_deflection`: curved incoming-to-outgoing projectile path with a timed clash point and radial sparks.

All three are stateless drawers driven by the existing TTL progress, share Canvas/Skia adapter registration, and are available in the Visual Lab with reproducible presets. The browser smoke test asserts that all three are visible after the route loads.

## Procedural animation evolution — Combat batch 03

Three further combat compositions use the compiled temporal sampler and the existing TTL progress contract:

- `pixelfx_guard_break`: compressed guard sigil, staggered radial fractures and a short confirmation flash.
- `pixelfx_armor_break`: six angular armor plates peel away from a fractured shell, with a timed break flash.
- `pixelfx_combo_finisher`: anticipation pulse, decisive sweeping arc and terminal shock ring.

The drawers are stateless, deterministic, and registered through the shared Canvas/Skia adapter path. Each is exposed in the Visual Lab with a reproducible preset; the route smoke test checks all three labels after direct navigation.
