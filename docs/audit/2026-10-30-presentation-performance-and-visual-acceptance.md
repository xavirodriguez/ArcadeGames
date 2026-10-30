# Presentation visual, accessibility and performance acceptance

**Branch:** `refactor/presentation-roadmap-rollout`  
**Review date:** 2026-10-30

## Correctness gates

- A gradient is owned by the exact painter instance that created it. A gradient from another Skia painter must be rejected, even though it has the same internal class.
- Canvas and Skia operations require conformance coverage for alpha, state save/restore, transforms, clipping, strokes, gradients, font resolution, and missing images.
- The production Skia path must inject a font resolver when the chosen theme requires a particular family or weight. The default typeface is only a fallback, not evidence of typographic parity.
- Reduced-motion and high-contrast behavior must be observed in the full game, not inferred from the presence of fields in a context type.

## Performance and memory measurement protocol

Measure a fixed-seed Hit & Run scene with a fixed viewport and representative counts of entities, projectiles and effects. Record the device/runtime and backend.

Capture:
1. Snapshot construction time and allocations per rendered frame.
2. Median and p95 renderer time over a warmed-up interval.
3. Garbage-collection pause count/duration where the runtime exposes it.
4. Heap/resource counts before creating a session, during sustained rendering, after destroying it, and after repeated create/destroy cycles.

Do not establish arbitrary budgets or add a general-purpose object pool before obtaining a baseline. Set budgets from the measured baseline and target frame time. A stable memory plateau is the acceptance criterion; a single post-disposal sample is insufficient.

## Status

The painter gradient ownership check is now instance-specific, with a regression test using two real painter instances. The complete cross-backend screenshot comparison, accessibility run, performance baseline, and resource-stress run remain open until the production theme path is migrated and executed against real backends.

## Validation constraint

The available workflow in this execution was GitHub source/API access, not a local repository checkout. Jest and `pnpm run ci` have not been run locally. Do not represent mocked unit tests as pixel-level or runtime validation.
