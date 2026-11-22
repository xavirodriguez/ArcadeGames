# E2E static server — evidence

Date: 2026-11-22. Branch: `chore/e2e-static-server`. Base: `chore/hitrun-1-1-validation` @ `bfd5380d`.

## Local commands

| Command | SHA | Result | Duration |
|---|---|---|---|
| `git rev-parse HEAD` | bfd5380d | base branch confirmed | — |
| `pnpm install --frozen-lockfile` | bfd5380d | OK | 9.8s |
| `gh run view 44928298036` | — | 12m49s, failed; OOM near heap limit | — |
| `pnpm exec playwright test --list` | bfd5380d | 40 tests / 13 files | — |
| `EXPO_PUBLIC_E2E_HOOKS=true pnpm exec expo export --platform web --output-dir dist-e2e` (no turbo build) | 62f0315d | OK, 25 static routes | 22.34s real, peak RSS 775 MB |
| `pnpm exec playwright test --list --project=ci` | 55e9b5a5 | 27 tests / 3 files | — |
| `pnpm exec playwright test --list --project=baseline` | 55e9b5a5 | 5 tests / 2 files | — |
| `pnpm exec playwright test --list --project=diag` | 55e9b5a5 | 8 tests / 8 files | — |
| `pnpm exec playwright test e2e/games.spec.ts` | 45425de8 | 20/20 passed | 1.8m |
| `pnpm exec playwright test e2e/vfx-lab.spec.ts` | 45425de8 | 3/3 passed | 31.3s |
| `pnpm exec playwright test e2e/hitandrun.spec.ts` | 45425de8 | 4/4 passed | 1.0m |
| `pnpm exec playwright test e2e/hitandrun.spec.ts --repeat-each=3` | 45425de8 | 12/12 passed | 2.4m |
| `pnpm run test:e2e:baseline` | 32d665ae | 3 failed (hudOverlaps), 2 passed | 58.7s |
| `pnpm run typecheck:app` | 45425de8 | OK | — |
| `pnpm run lint` | 45425de8 | 0 errors, 11 warnings (pre-existing) | 15.6s |
| `pnpm run docs:check` | 45425de8 | OK | — |

## Remote runs (Tarea 4)

To be appended after `gh workflow run e2e.yml`.

## Tarea 3 classification

`hudOverlaps`: **A — real overlap**. HUD panel at `top: 52`, ~78 px height, covers rows 1–2 at 390×844, 360×800 and 1280×720. Measurement verified (selector, canvas rect, row band). Controls measurement corrected (B): now measures `[role="button"]` elements; still overlaps bottom rows. Open defect recorded in `docs/frogger/FROGGER_VISUAL_BASELINE.md`. Spec remains failing and outside default job (`baseline` project).