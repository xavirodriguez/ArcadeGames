# VFX Architecture 2.0 — Visual Lab MVP

**Implementation branch:** `feat/vfx-visual-lab-mvp`  
**Baseline:** Foundation merged on `master` at `b9f850d`

## Purpose

Provide an in-app workbench for inspecting and tuning the twenty existing PixelFX-inspired procedural compositions. The Lab is a developer tool and a consumer of production presentation code, not a new VFX runtime.

## Included

- Effect Browser for all twenty registered `pixelfx_*` drawers.
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
- Canvas and Skia register the same twenty names and use the same composition functions through their existing adapters.

## Explicit MVP limitations

- Canvas live preview is available on web. The Skia picture preview is rendered through the native Skia surface when the Skia runtime is available.
- The Lab reports the shared 20/20 registration contract; it does not claim pixel-diff parity or visual equivalence across Canvas and Skia.
- Presets are built-in reproducible configurations, not persisted user-authored scenarios.
- No effect authoring, new gameplay events, ECS entities, scheduler, animation clock, lifetime manager, particle engine or PixelFX runtime dependency is introduced.

## Validation

The focused model test verifies the thirteen unique production drawers, family-correct descriptor creation and distinct semantic profile resolution. CI/Jest and app typecheck results must be read from the PR checks; authored tests are not a claim of execution.
