# VFX Architecture 2.0 — Repository Audit

**Audit date:** 2026-11-03
**Repository:** `xavirodriguez/ArcadeGames`
**Audited ref:** `master` at `0df1f73d49394695ee2eefed6e61e4d4953cbbb4`
**Scope:** shared rendering/VFX, Juice orchestration, PixelFX integration, Canvas/Skia registration, lifecycle, rollback, existing game-feel inventory, and the PixelFX PR sequence.

## Executive assessment

ArcadeGames already has the right low-level ingredients for the minimal Effect IR decision: `IDrawAdapter`, shared Canvas/Skia drawers, `JuiceOrchestrator`, `JUICE_CATALOG`, ECS `Render` + `TTL`, and the existing renderer registration paths. The procedural PixelFX-inspired effects are native ArcadeGames compositions; the PixelFX package is not a runtime dependency.

The architecture is not yet a coherent VFX platform. The main gaps are contract fragmentation, inconsistent rollback enforcement, semantic profile incompleteness, unresolved renderer/test parity, and legacy feedback paths. PR 2 must formalize and reuse these mechanisms rather than introduce another ECS, scheduler, entity lifetime, particle pool, sprite registry, or renderer abstraction.

**Recommendation:** proceed to Foundation only after the P0 findings below are corrected or explicitly accepted as blockers. Do not treat the open PixelFX PRs as integrated capabilities.

## Repository evidence

### Existing shared mechanisms

| Concern | Existing implementation | Audit conclusion |
|---|---|---|
| Drawing abstraction | `src/games/shared/rendering/DrawAdapter.ts` | Reuse `IDrawAdapter`; do not couple effect definitions to Canvas or Skia APIs |
| Procedural VFX | `src/games/shared/rendering/PixelFxProceduralVFX.ts` | Native shared drawer path; current master implementation needs reconciliation with its test and PR claims |
| Shared rendering | `src/games/shared/rendering/SharedVFX.ts` | Registers shared visual primitives and the procedural PixelFX drawer set |
| Orchestration | `src/games/shared/rendering/JuiceOrchestrator.ts` | Existing spawn/event/profile entry point; keep as the runtime integration point |
| Event profiles | `JUICE_CATALOG` in `JuiceOrchestrator.ts` | Typed per-game event maps already exist, but profiles are still low-level primitive/tint/scale/TTL bundles |
| Entity lifetime | ECS `Render` + `TTL` | Existing lifecycle is sufficient for transient effects; no second lifetime manager |
| Sprite-sheet integration | `src/games/shared/pixelfx/` | Manifest/export adapter layer reuses the existing SpriteRegistry/SpriteAnimator pipeline |
| Hit-stop | `src/games/shared/rendering/HitStopSystem.ts` and core `GameplayFreeze` | Existing ownership must remain canonical; no third time-freeze path |
| Prior game-feel inventory | `docs/audit/2026-10-27-game-feel-audit-inventory.md` | Useful baseline, but some findings require re-verification against current master |

### Procedural effects currently represented in source

The current `PixelFxProceduralVFX.ts` source registers only:

- `pixelfx_impact`
- `pixelfx_slash`
- `pixelfx_explosion`

The specification `docs/specs/pixelfx-procedural-pilots.md` documents an additional five compositions (`dust`, `pickup`, `muzzle`, `shield_crack`, `ink_burst`). The current test file imports and calls all eight drawer functions, but the fetched implementation on the audited master ref defines/registers only the original three. The same test asserts eight Canvas registrations but three Skia registrations while expecting the eight-name list in both cases.

This is a source/test/contract inconsistency, not a cosmetic documentation issue. Resolve it before Foundation is built on top of the procedural registry.

### PixelFX sprite-sheet layer

The merged sprite-sheet integration work establishes a deliberately thin layer:

- `PixelFXManifestEntry` maps stable IDs to existing sheet IDs, clips, anchors, duration and fallback names.
- `PixelFXCatalog.ts` labels its entries as candidates and explicitly requires exact source-ID confirmation and visual review.
- `PixelFXRuntime.ts` marks the procedural createFx/composite runtime as deferred.
- `PixelFXInstanceManager.ts` marks a dedicated instance manager/pool as deferred.
- `docs/audit/PIXELFX_INTEGRATION_AUDIT.md` says the layer scaffold/export spike is present, but PNG/JSON assets are not registered in `SPRITE_SHEET_CATALOG`; SpriteAnimator Canvas/Skia parity and art review remain blockers.

Keep this path separate from the procedural drawer catalog. PixelFX is an optional content/build-time source, not an Effect IR runtime dependency.

## P0 findings — resolve before PR 2

### P0.1 — Rollback guard is not enforced centrally in current master

The PixelFX integration docs and spawn-helper comments state that `JuiceOrchestrator.spawn` returns `null` during `world.isReSimulating`. The fetched current-master implementation of `spawn` does not contain that guard before hit-stop, shake, entity reservation/creation or component writes.

Some callers add their own guards (for example Platformer damage and Hit & Run feedback), but caller-level guards are not a reliable global contract. A new consumer can accidentally duplicate presentation effects during resimulation.

**Required resolution:** add a central early no-op in the orchestrator before every presentation side effect, or document and test a single equally strong central dispatch boundary. Add a regression test proving no hit-stop, shake, entity reservation, or component command occurs during resimulation.

### P0.2 — Procedural drawer source and tests disagree

The implementation has three registered drawers, while the current test imports five additional functions and expects eight names. The Canvas and Skia expected call counts are themselves inconsistent (8 vs 3), although both expected name arrays contain eight names.

**Required resolution:** reconcile the source, tests, documentation and actual PR diffs into one canonical list. Assert the exact same names and count for both renderers.

### P0.3 — PixelFX PR overlap and merge state are unresolved

Relevant PR state observed through GitHub:

| PR | State observed | Scope / consequence |
|---|---|---|
| #1035 | Closed | Initial three procedural pilots; current master contains their three drawer implementations |
| #1036 | Closed | Five additional procedural compositions; its described full implementation is not present in the audited drawer source |
| #1037 | Closed; merge commit exists on master | Procedural pilots branch |
| #1039 | Closed; merge commit exists on master | Sprite-sheet integration scaffold |
| #1040 | Open | Five gameplay-specific effects: Pong, Arkanoid, Flappy Bird, Frogger, Platformer |
| #1041 | Open | Same five gameplay-specific effects, plus claims to restore the five missing earlier drawers |
| #1042 | Open | CI/build stability changes; relevant to interpreting validation status |

PR #1040 and #1041 overlap materially. Do not merge both independently. PR #1041 appears to be the broader candidate, but that must be confirmed against the actual head diffs and commit ancestry before choosing a canonical branch. The connected repository inspection available for this audit exposed PR metadata/comments and default-branch files, but not the full head diffs for those open PRs; no claim is made that their changes are integrated.

**Required resolution:** compare #1040 and #1041 head commits against master and each other; identify unique commits/files; select one canonical integration path; close or retarget the duplicate only after the comparison. Preserve valid work from #1036 if it is not already included.

### P0.4 — Allocation claims need source-level verification

The current procedural drawer helper `readEffectState` returns a newly allocated object for each draw. `rotatePoint` also returns an object and is called repeatedly from shard drawing paths. The Canvas/Skia drawer wrappers construct adapters in their draw callbacks.

This conflicts with the intended zero-avoidable-allocation-per-frame target and with the no-allocation claims in the open PR descriptions. It does not prove a runtime performance problem by itself, but it means the claim is not currently demonstrated.

**Required resolution:** use scalar locals or reusable scratch state where profiling justifies it; measure hot-path behavior instead of assuming the helpers are allocation-free. Keep any state cache bounded and renderer-safe.

## P1 findings — Foundation design constraints

1. **No second lifecycle:** transient effect entities continue to use ECS `Render` + `TTL`; persistent/cancellable behavior must reuse existing entity/component lifecycle patterns.
2. **No second scheduler:** TTL and existing presentation systems remain authoritative. Do not add a parallel timeline runner.
3. **No second renderer registry:** Canvas/Skia share semantic drawer definitions through `IDrawAdapter` and existing registration entry points.
4. **No second sprite registry:** PixelFX sheets remain under `SPRITE_SHEET_CATALOG` / SpriteRegistry / SpriteAnimator.
5. **Effect IR remains minimal:** a typed semantic descriptor/context that adapts existing primitives and lifecycle. Avoid a general-purpose declarative graph, per-effect object tree, plugin runtime, or new ECS.
6. **Semantic profiles are missing as a shared concept:** `JUICE_CATALOG` maps game events to primitive + visual scalar options. PixelFX theme variants are build-time sheet IDs. Neither is yet the semantic token/profile contract described by VFX Architecture 2.0.
7. **Time domains are not formally separated:** transient progress is currently derived from TTL; shared background effects also use `VFXWorldState.timePhase`. Define simulation time, presentation time and effect lifetime explicitly without changing gameplay time.
8. **Family contexts must be typed at the boundary:** combat/traversal/interaction/temporal data should describe gameplay meaning; drawers should receive resolved presentation parameters and must not own gameplay rules.
9. **Hit-stop has an existing canonical route:** `HitStopSystem` delegates to core `GameplayFreeze`. Do not add a third freeze/timing path.
10. **Legacy integration remains:** the 2026-10-27 inventory identifies inline emitters, direct `GameplayFreeze` writes, duplicated screen-shake sources and per-event orchestrator construction. Re-check each entry before migrating; do not blindly apply stale inventory statements.

## Visual Lab

No existing Visual Lab implementation was identified in the inspected source/docs. PR 3 should be a thin development harness over the exact production effect definitions, profiles, adapters and registration path. It must not contain its own effect simulation or renderer implementations.

The MVP should be gated on a stable Foundation contract and should capture enough metadata to reproduce a run (effect ID, context/parameters, profile, seed, renderer, dimensions, frame/time position). If the existing renderers cannot be hosted side by side, the first version may render them sequentially from the same scenario.

## Validation limitations

- This audit used the connected GitHub repository API to inspect the default-branch source, specifications, audit documents, PR metadata and PR comments.
- The connector does not provide a local shell/Jest/TypeScript execution path. No test, typecheck, build, or visual smoke test is claimed as executed by this audit.
- PR head diffs for #1040/#1041 were not available through the inspected operations; their content is treated as PR claims until verified against source.
- CI/preview comments on #1036/#1040/#1041 report Vercel deployment rate-limit failures. Those are infrastructure failures, not evidence of TypeScript/test success or failure.
- PR #1042 documents existing Jest/Playwright environment failures. Treat its claims as reported evidence, not independently reproduced results.

## Go / no-go

**No-go for PR 2 until P0.1–P0.3 are reconciled.** P0.4 requires a baseline measurement and explicit decision; it need not force premature optimization in Foundation.

Once those conditions are met, PR 2 can formalize the minimal shared contract around the existing `JuiceOrchestrator`, `IDrawAdapter`, `Render` + `TTL`, and shared renderer registration.


---

## Repository reconciliation — 2026-11-03 follow-up

The initial audit snapshot was taken before the latest PixelFX merges and is superseded where it conflicts with this addendum. The merge graph has now been checked directly:

- #1040 is merged (merge commit `f19b57d9034c01759fd081ed5c48cb3108000207`).
- #1041 is merged after #1040 (merge commit `6a70a300735b547e89f428a456f35a7365808919`). It is the final integration pass, restoring the five prior drawers and adjusting the five new compositions for orientation/rotation.
- #1042 is merged (CI/build stability repair, merge commit `7ec8f4ef788e57dcbd7d97408cabbeb9af68ea33`).
- #1043 (this audit's first documentation PR) is merged (merge commit `9350e44f676449d01e9ac5f85722c7ee96736ffc`).

Therefore #1040/#1041 are not outstanding merge conflicts or duplicate open PRs. Both changes are present in the merge history. The current procedural catalog contains thirteen drawer definitions, and the Canvas and Skia registration tests both specify thirteen names. The previous finding that master contained only three drawers and had eight-vs-three registration expectations was based on a stale pre-merge snapshot and is withdrawn.

### Current defects verified against the post-merge tree

1. **Rollback guard is still missing at the orchestrator boundary.** The current `JuiceOrchestrator.spawn` reads VFX state and can request hit-stop, screen shake, and create an ECS effect entity without first checking `world.isReSimulating`. New effect call sites include local guards, but direct/future callers can bypass them. This conflicts with the PixelFX integration docs' statement that the orchestrator itself no-ops during resimulation. A follow-up patch now adds the guard at the start of `spawn` and a regression test covering no entity and no hit-stop during resimulation.
2. **One procedural drawer test assertion is stale.** `drawPixelFxBrickShatter` was changed to construct its rotated rectangular outline from four `drawLine` calls, but the current test still expects `strokeRect`. The follow-up patch replaces this with an exact 28-line assertion (four outline edges plus 24 fragment edges).
3. **Allocation baseline remains unmeasured.** The five newest drawers avoid temporary arrays/point objects, but the shared `readEffectState` still returns an object per draw and the older impact/explosion paths call `rotatePoint`, which returns objects. This is a measurable optimization candidate, not a reason to add a new runtime abstraction. Do not claim zero-allocation until profiled and verified.

### Updated gate

The merge-reconciliation blocker is closed. The two concrete correctness issues above are addressed in the follow-up code changes and must pass focused Jest/typecheck/CI before PR 2. Sprite-sheet asset registration and Canvas/Skia SpriteAnimator parity remain separate PixelFX sprite-path blockers; they do not block procedural Effect IR design unless PR 2 explicitly depends on sprite-backed effects.

The repository connector does not execute tests. The follow-up changes are committed to a branch for CI/local validation; no test execution is claimed here.


### Additional architecture correction — hit-stop ownership

The canonical hit-stop bridge is now implemented in the Juice consolidation follow-up branch:

- `HitStopSystem.requestHitStop` arbitrates through snapshot-registered `JuiceHitStopPolicy`.
- Accepted requests write the active duration to core `GameplayFreeze`; `Schedule.update()` remains the only countdown owner.
- `VFXWorldState` no longer stores `hitStopTimer`, priority or cooldown.
- The system runs while frozen, and authoritative hit-stop requests are replayed while presentation output remains suppressed.
- Direct game-specific freeze writes remain separate owners and are not overridden by Juice.

This implementation still requires CI validation and end-to-end multiplayer rollback verification. Do not add another hit-stop scheduler or move the active duration back into VFX state.
