# VFX Architecture 2.0 — Repository Audit

**Audit date:** 2026-11-03  
**Audited ref:** `master` at `5e4e289d8e51802f9fc2c53850762d68e62798a0` (merge of #1044)  
**Scope:** shared VFX runtime, procedural drawers, renderer registration, lifecycle, rollback, time ownership, and Foundation readiness.

## Executive assessment

The repository has the low-level mechanisms needed for a minimal Effect IR: `JuiceOrchestrator` / `JUICE_CATALOG`, `IDrawAdapter`, shared Canvas/Skia drawers, ECS `Transform` + `Render` + `TTL`, and existing renderer registration paths. VFX 2.0 should formalize a typed semantic boundary over these mechanisms, not introduce a second ECS, scheduler, lifetime manager, particle engine, or renderer registry.

**Foundation is unblocked by the procedural PixelFX reconciliation and rollback defects addressed in #1044.** The remaining hit-stop split is a constraint for later Combat integration, not a reason to delay the minimal Foundation contract.

## Verified repository baseline

| Concern | Current implementation | Decision |
|---|---|---|
| Drawing abstraction | `src/games/shared/rendering/DrawAdapter.ts` | Reuse `IDrawAdapter`; effect definitions remain renderer-independent |
| Procedural drawers | `PixelFxProceduralVFX.ts` | Thirteen native ArcadeGames compositions; not a PixelFX runtime dependency |
| Shared registration | `SharedVFX.ts` and game renderer bootstraps | Preserve current Canvas/Skia registration entry points |
| Event orchestration | `JuiceOrchestrator.ts`, `JUICE_CATALOG` | Keep as compatibility and runtime dispatch boundary |
| Entity lifecycle | ECS `Transform`, `Render`, `TTL` | Continue to own transient effect placement, drawing data and expiry |
| Sprite-backed assets | `SPRITE_SHEET_CATALOG`, SpriteRegistry, SpriteAnimator | Keep separate from procedural drawers and Effect IR |
| Hit-stop | `HitStopSystem.ts` and core `GameplayFreeze` | Existing split must be reconciled before Combat depends on hit-stop |

### Procedural drawer contract

The current source defines thirteen drawers:

- `pixelfx_impact`, `pixelfx_slash`, `pixelfx_explosion`
- `pixelfx_dust`, `pixelfx_pickup`, `pixelfx_muzzle`, `pixelfx_shield_crack`, `pixelfx_ink_burst`
- `pixelfx_paddle_impact`, `pixelfx_brick_shatter`, `pixelfx_flap_gust`, `pixelfx_hop`, `pixelfx_phase_dash`

The procedural registration test asserts the same thirteen names and count for Canvas and Skia. The earlier three/eight-drawer discrepancy and Brick Shatter `strokeRect` expectation are stale and resolved by merged work, including #1044.

### Rollback

#1044 adds a central early return in `JuiceOrchestrator.spawn()` when `world.isReSimulating`, before VFX state reads and all presentation side effects. Its regression test covers the no-spawn/no-hit-stop contract. Do not describe this guard as missing.

### PixelFX sprite-sheet path

The sprite-sheet scaffold is distinct from the thirteen procedural drawers. Manifest entries remain candidate metadata; the scaffold is not proof that source PNG/JSON assets are registered in `SPRITE_SHEET_CATALOG`, nor that SpriteAnimator frame synchronization is validated across Canvas and Skia. Keep those tasks outside Foundation unless a concrete Foundation consumer requires them. PixelFX is not a runtime dependency.

## Remaining architecture constraints

1. **Hit-stop ownership is split.** `HitStopSystem.requestHitStop` maintains `VFXWorldState.hitStopTimer`, priority and cooldown. Core `Schedule.update()` freezes simulation through `GameplayFreeze`. Hit & Run uses the core freeze helpers directly, while `JuiceOrchestrator.spawn()` requests the separate VFX timer. These are not one canonical mechanism. Do not add a third path. Coordinate consolidation with the Juice/core-freeze work and add an end-to-end scheduler test before Combat profiles rely on `hitStopMs` to pause simulation.
2. **Allocation behavior is unmeasured.** `readEffectState` returns an object per draw; older impact/explosion paths use object-returning `rotatePoint`. This is a profiling candidate, not evidence of a measured bottleneck. Do not claim zero-allocation.
3. **Legacy feedback remains distributed.** Inline emitters and direct freeze/shake writes exist in individual games. Revalidate each consumer before migrating; do not mass-migrate as part of Foundation.
4. **Time domains need an explicit contract.** Simulation time, presentation time and effect lifetime are distinct. Existing transient lifetime remains ECS TTL; do not add another scheduler.

## Foundation scope and gate

Foundation may now begin. It should:

- Define the smallest typed semantic descriptor and family-specific contexts justified by current consumers.
- Resolve semantic visual profiles independently of gameplay parameters.
- Adapt existing Juice dispatch, `IDrawAdapter`, shared drawers, renderer registration and ECS `Render` + `TTL`.
- Preserve the #1044 rollback boundary and verify the new dispatch path.
- Preserve current public Juice APIs or provide a narrow compatibility adapter.

Foundation must not include Visual Lab UI (PR3), game-wide migrations/new effect families (PR4–PR6), sprite-sheet registration, unmeasured allocation optimization, or hit-stop redesign. Hit-stop consolidation is a dependency before Combat integration relies on simulation freeze, not a Foundation blocker.

## Validation and evidence limits

This audit is based on the GitHub default-branch source and merged commit history at the audited ref. The repository connector does not execute the project toolchain. No Jest, typecheck, build, profiling, or visual smoke-test execution is claimed here; use actual CI/local results for those claims.

## Historical corrections

Earlier sections/versions of this audit described #1040/#1041 as open duplicates, only three procedural drawers, missing central rollback suppression, and a stale Brick Shatter assertion. Those statements described a pre-merge snapshot and are superseded by the verified post-#1044 baseline above. They are not active blockers.
