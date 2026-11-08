# Technical-debt ratchets and reduction targets

This document defines the baseline semantics, no-regression rules and measurable reduction targets for the three debt ratchets included in `pnpm run check:agent-guardrails`.

## Committed baseline snapshot

The following values come from the versioned baseline files on `master` at the start of this work (2026-11-04). The color baseline records its own generation time. They are baseline-file values, not claims that the scanners were executed during this documentation change.

| Metric | Baseline | Source |
| --- | ---: | --- |
| `as any` type assertions | 640 | `scripts/typecast-baseline.json` |
| `as unknown` type assertions | 223 | `scripts/typecast-baseline.json` |
| Total `as any` / `as unknown` assertions | 863 | `scripts/typecast-baseline.json` after removing the ratchet's own unsafe cast |
| Files with these type assertions | 196 | `scripts/typecast-baseline.json` |
| Duplicated lines | 1,930 | `scripts/duplication-baseline.json` |
| Duplicate clones | 240 | `scripts/duplication-baseline.json` |
| Duplication ratio | 1.31% | `scripts/duplication-baseline.json` |
| Lines scanned by jscpd | 147,387 | `scripts/duplication-baseline.json` |
| Color-literal occurrences | 594 | `scripts/color-literals-baseline.json`, generated 2026-10-31 |
| Unique color-literal location keys | 593 | `scripts/color-literals-baseline.json` |

The color baseline's `count` is the number of scanner hits; `keys` is a set of path/line/value keys, so the counts can differ when repeated hits share the same key.

## What each ratchet actually checks

### Type assertions

Command: `pnpm run check:ratchet`

- Scans TypeScript files under `packages/`, `src/`, `server/` and `scripts/`, including tests.
- Counts only type assertion expressions whose target is `any` or `unknown` (for example, `value as any` and `<unknown>value`). It does not count every type annotation such as `const value: any`.
- Compares `as any` and `as unknown` counts independently per file. A reduction in one category cannot mask an increase in the other.
- Reductions are reported; update the baseline only after reviewing the exact diff and confirming the assertions were removed rather than moved.

### Code duplication

Command: `pnpm run check:duplication`

- Runs jscpd using `.jscpd.json`: `packages/core/src`, `packages/arcade-sound-kit/src` and `src/games/`; tests and generated/build outputs are excluded by the configuration.
- Fails if duplicated lines increase, if the percentage exceeds the baseline by more than 0.05 percentage points, or if the absolute percentage exceeds 1.60%.
- Clone count and total lines are reported for context; they are not independent failure conditions in the current ratchet.

### Color literals

Command: `pnpm run check:color-literals`

- Scans TypeScript/JavaScript source under `src/`, root `components/` and each package's `src/`; tests, comments and generated folders are excluded.
- Allows literals under `src/theme/`, package theme directories and the explicitly listed `COLOR_LITERAL_ALLOWLIST`.
- Fails when a scanned path/line/value key does not exist in the committed baseline. The current implementation is location-sensitive: moving a literal to another line can produce a new key even when its value is unchanged.
- Also enforces a per-file occurrence ceiling using `byFile`. This catches repeated identical literals on the same line, which share one location key in the set.
- The check blocks new keys and per-file occurrence increases; it does not independently require the baseline count to decrease.

## No-regression policy

1. Do not increase any debt metric above the behavior enforced by its existing ratchet. Type assertions are guarded independently by category; color literals are guarded by location and per-file occurrence count.
2. Do not update a baseline merely to make a failing check pass. The pull request must include the remediation, before/after counts, the exact affected scope and an explanation for any approved exception.
3. Review baseline JSON diffs as code. A baseline increase requires explicit justification and must not be used to hide newly introduced debt.
4. Keep tests in the type-assertion scan. Do not remove test files from the scan to improve the metric.
5. For color exceptions, prefer moving a genuine palette/token into the theme system. Any new exception must have a specific path and reason; do not broaden the allowed directory prefixes.
6. Report both the absolute count and ratio for duplication, because a changing source denominator can make percentages alone misleading.

## 90-day reduction target

Target date: **2027-02-02** (90 days after the baseline review on 2026-11-04).

| Metric | Starting baseline | Target by 2027-02-02 | Minimum reduction |
| --- | ---: | ---: | ---: |
| Total `as any` / `as unknown` assertions | 863 | **776 or fewer** | At least 87 (10.1%) |
| Duplicated lines | 1,930 | **1,737 or fewer** | At least 217 (10.0%) |
| Duplication ratio | 1.57% | **1.50% or lower** | 0.07 percentage points |
| Color-literal occurrences | 594 | **534 or fewer** | At least 60 (10.1%) |

These are project reduction targets, not new CI failure thresholds. Existing ratchets continue to prevent regressions immediately; target attainment is reviewed by rerunning the three scanners and recording the measured values. Do not change the baseline just to match the target.

## Baseline maintenance workflow

For a cleanup pull request:

1. Run `pnpm run check:ratchet`, `pnpm run check:duplication` and `pnpm run check:color-literals` before editing.
2. Record the observed values and identify the largest concrete debt clusters.
3. Remove or consolidate the debt at its owning abstraction and run the same commands again.
4. Update only the baselines whose measured debt decreased or whose scope changed intentionally. Use `pnpm run ratchet:update`, `pnpm run duplication:update-baseline` or `pnpm run colors:update-baseline` respectively.
5. Include before/after results and the reason for any baseline change in the pull request.

A baseline update is a measurement checkpoint, not a substitute for fixing the code.
