# Presentation roadmap execution status

**Repository:** `xavirodriguez/ArcadeGames`  
**Base branch:** `master`  
**Base commit:** [`db8a38345e3dd020f61dd013a91aef562a693914`](https://github.com/xavirodriguez/ArcadeGames/commit/db8a38345e3dd020f61dd013a91aef562a693914)  
**Working branch:** `refactor/presentation-roadmap-rollout`  
**Review date:** 2026-10-30

## Phase status

| Phase | Status | Evidence in this branch | Remaining acceptance criteria |
|---|---|---|---|
| 0. Validate baseline | Blocked | [Baseline record](2026-10-30-presentation-roadmap-baseline.md) | Candidate-branch CI, API-reference workflow, focused tests, full `pnpm run ci`, and real Canvas/Skia baseline are not yet confirmed. |
| 1. Session per game | Implemented in source; validation pending | [Shared registry session bridge](../../src/games/hitandrun/rendering/theme/HitRunPresentationSession.ts) | Execute isolation/lifecycle tests and inspect restart/destroy behavior under the real game loop. |
| 2. Boundaries, snapshots and determinism | Partial | Shared `PresentationThemeRegistry` owns session/tokens/disposal; session RNG is injected into Sumi-e; architectural source guards were updated. | The full painter/snapshot boundary is not wired into legacy theme methods. Verify deterministic output across frame-rate variation and complete architecture tests. |
| 3. Resource lifecycle and preload | Partial | Theme instances are owned and disposed by the shared session; resize work is de-duplicated; Hit & Run's React provider receives that session's tokens. | Connect a complete presentation asset manifest and missing-resource fallbacks; run repeated create/restart/destroy memory tests. |
| 4. Canvas/Skia scene migration | Blocked / incomplete | [Migration gate](2026-10-30-hitrun-canvas-skia-migration-gate.md) | Ground shadows, entities, projectiles, feedback, HUD and banners still use the legacy `HitRunTheme` contract. Only the backdrop has a native Skia method. No full production route to `PresentationPainter` or real-backend parity run yet. |
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
- The branch is now **ahead by 9 commits and behind by 0** relative to master. Eight commits correspond to the eight roadmap phases; the ninth is the master synchronization merge.
- The repository's `.github/workflows/ci.yml` is configured to run on pushes to `master`/`develop` and pull requests targeting those branches. Since this request asked for a branch push and no PR was created, the normal CI workflow did not run against this branch. The documentation CI workflow also has no run associated with this branch in the observed Actions results.
- Pushes triggered [.github/workflows/restore-space-invaders.yml run 40972690980](https://github.com/xavirodriguez/ArcadeGames/actions/runs/40972690980), which ended in **failure**. Its job endpoint returned zero jobs, so the failure has no actionable job trace and has not been attributed to the presentation changes.
- The latest commit's combined status reports a [Vercel failure](https://vercel.com/javis-projects-0a2bd667?upgradeToPro=build-rate-limit) with a build-rate-limit destination. This is not a successful build result and does not identify a TypeScript or test failure.
- A local checkout was unavailable in this execution environment. Jest, `pnpm run ci`, E2E, real Canvas/Skia execution, and screenshot comparisons have **not** been run. No test result should be inferred from the presence of test files.

## Next action

Create a pull request when ready to trigger the repository's configured CI workflows. Before declaring the roadmap complete, resolve any actual checks that fail and complete Phase 4's production migration to `PresentationPainter`, the Phase 5 visual/performance/accessibility acceptance, and Phase 7's real second-game pilot.
