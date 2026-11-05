# VFX Visual Lab — PR3.1

## Scope

PR3.1 improves the existing Expo Router Visual Lab at `src/app/vfx-lab`. It does not replace the MVP or introduce another effect runtime.

## Audit findings

- The Lab already browsed all 13 production PixelFX drawers and invoked the shared production drawer functions.
- Its only live preview was an HTML Canvas 2D surface. Skia registration parity was represented by hard-coded `13 / 13` labels, not a rendered comparison.
- The context inspector exposed raw JSON for the descriptor and placement. It did not resolve the family-to-semantic-token mapping in a form useful for visual review.
- Four hard-coded presets could be applied, but there was no versioned serialization, import validation, or export path.
- The Lab did not persist presets beyond the current session.

## Delivered

### Semantic inspector

- Resolves the effect family to its semantic role: combat → warning, traversal → energy, interaction → reward, temporal → accent.
- Displays the active profile token palette and the exact resolved color used by the preview.
- Displays descriptor context fields, resolved placement, size, progress and TTL.

### Canvas / Skia comparison

- Draws the same production drawer with the same ECS-shaped preview state through `CanvasDrawAdapter` and `SkiaDrawAdapter`.
- The web Lab displays both surfaces side by side; native runtimes display Skia and explicitly identify the Canvas 2D limitation.
- The comparison is intended for human visual inspection. It is not a pixel-diff test and does not claim pixel parity.

### Reproducible presets

- Adds a versioned `VFXLabPreset` schema containing effect, profile, progress, size, rotation and seed.
- Adds stable IDs to the four built-in presets.
- Supports saving a named preset for the current screen session, JSON export, JSON import and strict schema/range validation.
- Seed is passed to both preview drawers as the stable entity identity. Explosion derives deterministic fragment variation from that identity without consuming gameplay RNG; effects that do not use entity-seeded variation remain visually unchanged when the seed changes.
- The temporal sampler is now used by four production compositions: Explosion, Charge, Shield Pulse and Ricochet. Charge uses a staged core buildup/release, Shield Pulse adds a delayed echo ring, and Ricochet choreographs its contact flash and expanding ring.
- Imported/exported presets are portable; user-created presets are not persisted across app restarts in this PR.

## Deliberate non-goals

- No new effect catalog or drawer implementations.
- No second renderer registry, scheduler, ECS, animation clock or lifecycle manager.
- No image-diff or screenshot-baseline infrastructure (reserved for PR8).
- No persistence backend or local-storage dependency.
- No claim that renderer registration counts establish visual parity.

## Validation

The model tests cover production catalog/registration alignment, semantic role resolution, preset round-trips, stable built-in IDs and invalid preset rejection. CI must execute the tests and app typecheck; no local execution result is asserted by this document.
