# Procedural VFX Core — PR1–PR3

This change introduces three renderer-independent helper modules under
`src/games/shared/rendering`. It does not replace the ECS VFX lifecycle,
`IDrawAdapter`, `SharedVFX`, `JuiceOrchestrator`, or game-specific procedural
geometry.

## PR1 — Deterministic Core

`vfx-core.ts` provides finite/range validation, interpolation, clamping,
smoothstep, a seeded Mulberry32 PRNG, and deterministic seed derivation. The
module has no global RNG or shared mutable scratch state.

## PR2 — Geometry & Dynamics

`vfx-geometry.ts` provides harmonic contours, star polygons, circle and rounded
box SDFs, polynomial/exponential smooth minimum, closed-form one-dimensional
ballistics with linear drag, energy scaling, and seeded radial fragments.
Inputs are validated at public boundaries. Fragment output is stable for a
given seed and count.

## PR3 — Pixel & Color

`vfx-pixel-color.ts` provides sRGB/OKLab/OKLCH conversion, perceptual ramps,
OKLab interpolation, RGB hex conversion, posterization, 4×4 Bayer ordered
dithering, perceptual nearest-palette mapping, SDF coverage/rasterization, and
integer nearest-neighbor RGBA upscaling.

## PR4 — Stateless Temporal Sampling

`vfx-timeline.ts` adds normalized, history-free temporal sampling. It supports
linear, smoothstep, quadratic ease-in/ease-out and symmetric ease-in-out curves.
Ordered, non-overlapping phases can be sampled at arbitrary progress values;
gaps hold the preceding value. The sampler is renderer-independent and performs
no per-sample allocation. `createVFXTimelineSampler` validates and snapshots the
phase definitions once, then supports repeated sampling without per-frame setup.
The one-shot `sampleVFXTimeline` helper validates the complete definition on each
call and is intended for non-hot-path use. This is a calculation primitive, not
an effect lifecycle.

## Integration contract

- Pure utilities only: no Canvas, Skia, React Native, ECS or wall-clock access.
- Determinism comes from explicit seeds and coordinates.
- Canvas and Skia consumers can share these exact math results.
- Existing rendering registration and effect lifetimes remain unchanged.
- The focused Jest suite is `src/games/shared/rendering/__tests__/vfx-procedural-core.test.ts`.

## Deliberate boundaries

The utilities are opt-in and are not wired into existing production drawers in
this PR. That avoids changing the visual output of shipped games without
Visual Lab comparison. The style-metrics module from the earlier proposed
source was not present on the repository default branch, so no replacement
was invented here.
