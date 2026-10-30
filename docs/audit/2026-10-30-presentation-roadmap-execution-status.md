# Presentation roadmap execution status

**Repository:** `xavirodriguez/ArcadeGames`  
**Base branch:** `master`  
**Base commit:** [`024b96cd976c0ac1062f3b83d0dc49545e46af15`](https://github.com/xavirodriguez/ArcadeGames/commit/024b96cd976c0ac1062f3b83d0dc49545e46af15)  
**Working branch:** `refactor/presentation-hitrun-entities`  
**Continuation PR:** [#995 — migrate Hit & Run actors and projectiles](https://github.com/xavirodriguez/ArcadeGames/pull/995)  
**Review date:** 2026-10-30

## Phase status

| Phase | Status | Evidence in this branch | Remaining acceptance criteria |
|---|---|---|---|
| 0. Validate baseline | Blocked | [Baseline record](2026-10-30-presentation-roadmap-baseline.md) | Candidate-branch CI, API-reference workflow, focused tests, full `pnpm run ci`, and real Canvas/Skia baseline are not yet confirmed. |
| 1. Session per game | Implemented in source; validation pending | [Shared registry session bridge](../../src/games/hitandrun/rendering/theme/HitRunPresentationSession.ts) | Execute isolation/lifecycle tests and inspect restart/destroy behavior under the real game loop. |
| 2. Boundaries, snapshots and determinism | Partial | Shared `PresentationThemeRegistry` owns session/tokens/disposal; session RNG is injected into Sumi-e; architectural source guards were updated. | The full painter/snapshot boundary is not wired into legacy theme methods. Verify deterministic output across frame-rate variation and complete architecture tests. |
| 3. Resource lifecycle and preload | Partial | Theme instances are owned and disposed by the shared session; resize work is de-duplicated; Hit & Run's React provider receives that session's tokens. | Connect a complete presentation asset manifest and missing-resource fallbacks; run repeated create/restart/destroy memory tests. |
| 4. Canvas/Skia scene migration | Partial — HUD/banner plus entity/projectile vertical slice migrated | [Migration gate](2026-10-30-hitrun-canvas-skia-migration-gate.md) | Actor, Samurai fallback and projectile drawers now use typed snapshots and separate Canvas/Skia painter adapters. Backdrop, feedback, placeholders and Lancero remain legacy. Real-backend parity and screenshot acceptance remain open. |
| 5. Visual, accessibility and performance acceptance | Partial | [Painter gradient ownership fix](https://github.com/xavirodriguez/ArcadeGames/commit/7eaae3b4d6746580f254da41d5929d3180c83901); [acceptance protocol](2026-10-30-presentation-performance-and-visual-acceptance.md) | Unit test is added for cross-painter gradient ownership. Screenshot comparisons, injected font resolver in production, accessibility validation, GC/heap measurements and performance budgets remain unverified. |
| 6. Retire legacy global selection | Implemented in source; validation pending | [Legacy retirement audit](2026-10-30-presentation-legacy-retirement.md); updated architecture test | CI must confirm the source guards and all consumers. The legacy drawing contract remains intentionally as an adapter; this is not the same as legacy selection state. |
| 7. Validate a second game | Pending | [Second-game preflight](2026-10-30-second-game-pilot-preflight.md) | A real second-game session and alternate visual theme must use the shared contract; then test both backends and unchanged simulation output. |

## Commits, one squash commit per phase

1. Phase 0: [`7e290b87`](https://github.com/xavirodriguez/ArcadeGames/commit/7e290b87feaff7fb8a818032b0e2483d5206e37b) — baseline and validation gates.
2. Phase 1: [`f18e3b93`](https://github.com/xavirodriguez/ArcadeGames/commit/f18e3b93c1034e7efc98a1dc420683ccce3dedbf) — Hit & Run session uses the shared registry; legacy drawing stays behind a bridge.
3. Phase 2: [`30182b40`](https://github.com/xavirodriguez/ArcadeGames/commit/30182b40c86f6ce7feb108b847e06f3261a921bc) — isolation, ownership and source-boundary tests.
4. Phase 3: [`2e3f47a8`](https://github.com/xavirodriguez/ArcadeGames/commit/2e3f47a8ab3875f6c78ddda0c06adbc39f126132) — session token projection to React and per-session resize handling.
5. Phase 4: [`4701a390`](https://github.com/xavirodriguez/ArcadeGames/commit/4701a39062348aa54d8d478a1cdfb2d0997f630e) — explicit backend-migration acceptance gate.
6. Phase 5: [`7eaae3b4`](https://github.com/xavirodriguez/ArcadeGames/commit/7eaae3b4d6746580f254da41d5929d3180c83901) — enforce Skia gradient instance ownership and record acceptance protocol.
7. Phase 6: [`1f8492bc`](https://github.com/xavirodriguez/ArcadeGames/commit/1f8492bc7e60d8be5a4d850875ddf75f7d20882b) — remove process-wide active theme selection.
8. Phase 7: preflight record and status report are committed separately from code migration; this phase remains open until a real second-game pilot is implemented and validated.

## Post-push validation

- The branch was pushed successfully and then synchronized with the two newer `master` commits. Current master head at sync time: [`d72cd3c5897662820093dbcfd5c8143dcd4c009a`](https://github.com/xavirodriguez/ArcadeGames/commit/d72cd3c5897662820093dbcfd5c8143dcd4c009a). The sync merge is [`5b6e0026`](https://github.com/xavirodriguez/ArcadeGames/commit/5b6e00261998ecbd89982dceb673e01dd656dda0).
- At the first sync point with `master` at `d72cd3c`, the branch was ahead by 9 commits and behind by 0. After syncing PR #989 and completing the final source cleanup, the code branch compared **12 commits ahead and 0 behind** immediately before this report refresh. The 8 phase-level squash commits remain intact; the other commits are master-sync, validation-record, and cleanup commits.
- Final source review found a duplicated `resizeHitRunPresentationSession()` definition in the session bridge. It was removed in [`0c377f38`](https://github.com/xavirodriguez/ArcadeGames/commit/0c377f38da66508ae3ff303a9c0397c375042f72); the branch file now contains exactly one exported definition. No local test run was available to validate this cleanup.
- The repository's `.github/workflows/ci.yml` is configured to run on pushes to `master`/`develop` and pull requests targeting those branches. Since this request asked for a branch push and no PR was created, the normal CI workflow did not run against this branch. The documentation CI workflow also has no run associated with this branch in the observed Actions results.
- Pushes triggered [.github/workflows/restore-space-invaders.yml run 40973163323](https://github.com/xavirodriguez/ArcadeGames/actions/runs/40973163323), which ended in **failure**. Its job endpoint returned zero jobs, so the failure has no actionable job trace and has not been attributed to the presentation changes.
- The latest commit's combined status reports a [Vercel failure](https://vercel.com/javis-projects-0a2bd667?upgradeToPro=build-rate-limit) with a build-rate-limit destination. This is not a successful build result and does not identify a TypeScript or test failure.
- A local checkout was unavailable in this execution environment. Jest, `pnpm run ci`, E2E, real Canvas/Skia execution, and screenshot comparisons have **not** been run. No test result should be inferred from the presence of test files.

## Synchronization with latest master

After the first push, `master` advanced through [PR #989](https://github.com/xavirodriguez/ArcadeGames/pull/989), now at [`0a603ceb4233`](https://github.com/xavirodriguez/ArcadeGames/commit/0a603ceb4233be1c41dd12061da3d160b21c1425). This branch preserves its session refactor and now includes the relevant PR #989 updates: both Hit & Run renderer casts use `never` rather than `unknown`, and the Sumi-e integration test includes the corrected closing call. The synchronization is recorded as a merge commit with `master` as its second parent; the roadmap phase squash commits remain intact.

## Previous rollout history

The sections above titled “Post-push validation” and “Synchronization with latest master” record the earlier rollout branch that delivered the per-session architecture and was integrated through PR #994. The active continuation for Phase 4 is `refactor/presentation-hitrun-entities`, based on master commit `024b96cd976c0ac1062f3b83d0dc49545e46af15`, and tracked in PR #995. The earlier commit-count and workflow observations belong to that previous branch and are not claims about PR #995.

## Phase 4 progress: HUD and banner

The first vertical slice now uses the backend-neutral theme contract:

- ECS data is projected into typed HUD snapshots and a `PresentationFrame`.
- The shared theme bridge renders health, score and game-over state through `PresentationPainter`; Fantasy retains its top-bar HUD composition, while Sumi-e retains its seal/paper composition.
- Canvas and Skia register distinct HUD effects backed by `CanvasPresentationPainter` and `SkiaPresentationPainter`.
- The production HUD route no longer calls legacy `HitRunTheme.renderHud()` or `renderSectionBanner()`.
- Theme descriptors declare `hud` and `banner` capabilities; unit tests exercise both themes, reduced-motion/high-contrast banner behavior, snapshot projection and optional-resource fallbacks.

This is not full scene parity. The production frame currently supplies default `reduceMotion=false` and `highContrast=false`; the theme supports those flags, but this route does not yet source user preferences. Skia still uses its default typeface unless a font resolver is injected. Real-backend screenshots and migration of the backdrop, shadows, entities, projectiles and feedback remain open.

## Next action

## Phase 4 continuation: actors, ground shadows and projectiles

The current continuation adds the next presentation slice:

- ECS components are projected into typed `PresentationEntitySnapshot` values containing semantic identity, interpolated transform, elevation, facing, opacity, tint and immutable visual metadata. Themes do not receive ECS entities or component references.
- Player, popcorn, wall trooper, hopper, charger, elite, Samurai fallback, bullets and rockets call session-owned `renderGroundShadow`, `renderEntity` or `renderProjectile` methods.
- Canvas and Skia register separate drawer factories and use their respective `CanvasPresentationPainter` and `SkiaPresentationPainter` adapters.
- Fantasy and Sumi-e retain different actor/projectile compositions. Samurai's painter implementation restores armor details, shoulder guards, katana highlights, attack arc and hit-flash overlay.
- The ECS-facing session reader is typed against `World<CoreComponentRegistry>`; the new session bridge contains no `any` or untyped world reader.

The Samurai fallback is a painter reconstruction, not proven pixel-identical to the former Canvas implementation. Placeholder tilemap/fragment/core drawers, Lancero, backdrop and feedback remain outside this slice. The production frame still supplies default accessibility flags; this branch has not connected the user's reduced-motion or high-contrast preferences.

## Current validation and publication

- Branch: `refactor/presentation-hitrun-entities`.
- Draft PR: [#995](https://github.com/xavirodriguez/ArcadeGames/pull/995).
- The source was committed as one squash commit for this continuation before updating the branch reference.
- CI, E2E and Documentation CI were queued for the earlier PR head. A new head after the squash push will trigger fresh runs; queued results are not passes.
- No local checkout was available, so `pnpm run ci`, Jest, E2E and real Canvas/Skia screenshot comparisons have not been executed.

The next Phase 4 slice is feedback effects, followed by the backend-neutral backdrop/environment contract. Placeholder shapes and Lancero still need backend-specific drawers. Keep visual parity and Phase 5 acceptance open until real Canvas/Skia screenshots and performance measurements exist.
