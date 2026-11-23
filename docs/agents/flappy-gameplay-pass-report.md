# Flappy Bird gameplay pass — execution report

**Branch:** `feat/flappy-gameplay-pass`  
**Base:** `15031604d8ef9cf6e34326d8146f90fde5f62158`  
**Scope:** `src/games/flappybird/`

## Implementation commits

| Task | Commit | Result |
|---|---|---|
| T1 — Hyper Warp scoring and Combo types | `a006331d34d072593a8d41a81949dc36fa8bc081` | Separate score factor; effective HUD multiplier; Combo mutations typed. |
| T2 — Scenario and sector announcements | `b0f8fdb8c9270a7c3d8b47412cd32638ce4c60ae` | Theme-owned copy and direct EventBus presentation consumer. |
| T3 — Near-miss glide recharge | `89ebdcbabdcf368b1e9fecf30ce47360d461d935` | Proportional recharge with cap and overheat guard. |
| T4a — Scenario gap size | `59ee80e1974275b95d0180b77768a7f6575aacaf` | Scenario override applied before narrow-gap factor. |
| T5 — Global difficulty ramp | `e44f95d3fa05a0829e5894dff6f45386931220e5` | Deterministic speed/gap ramp, explicit caps, and oscillation-aware vertical-reach check. |
| T6 — Integration regressions and report | Current commit | Actual scenario transition events and persistent execution report. |

## Behaviour changes

- `hyper_warp` doubles score earned for a passed pipe without mutating `Combo.multiplier`; the HUD shows the effective multiplier.
- Scenario transitions use their declared `GAP_SIZE` values. Narrow gaps apply the existing 0.7 factor afterwards.
- Near-miss restores up to `NEAR_MISS_GLIDE_ENERGY = 25` energy, scaled by geometric closeness; overheated glide energy does not recharge.
- A global ramp starts after one full four-scenario cycle (20 pipes with the default five pipes per scenario). It leaves `PIPE_SPAWN_INTERVAL` unchanged.
- Scenario and sector announcements resolve their wording from the active aesthetic theme. The office-paper theme has its own copy.
- Flappy Bird registers the shared Canvas/Skia VFX drawers, including the `floating_text` shape used by the announcements.

## Ramp defaults and feasibility model

- `DIFFICULTY_RAMP_ENABLED = true`
- Speed increment: `0.05` per lap; maximum speed factor: `1.2`.
- Gap reduction: `0.03` per lap; minimum ramped gap: `90 px`.
- The worst stacked speed case is Warp Corridor (150 px/s base, 1.0 scenario speed factor) × Hyper Warp (1.4) × ramp cap (1.2) = `252 px/s`.
- The passage window is `(60 + 2 × 15) / 252 = 0.357 s`, above the 0.2 s flap cooldown.
- At 60 Hz, the discrete flap/gravity update over the 1.8 s Warp Corridor spawn interval permits approximately `384 px` of upward travel.
- Warp Corridor's oscillation amplitude is reduced from 50 px to 20 px. The regression models the maximum relative offset between consecutive sine waves using the actual 1.8 s spawn cadence and phase seed. With a 90 px gap, the modeled required travel is approximately `371 px`.
- This is a deterministic geometric/kinematic bound for the modeled spawn cadence, not a substitute for hands-on balance testing.

## Regression coverage added

`FlappyBirdGameplayPass.test.ts` covers:

- Hyper Warp score factor, event end, and HUD multiplier.
- Theme-specific announcement text, non-overlapping placement, and no initial/restart announcement.
- Real scenario transition publication of `flappy:scenario_changed` and its associated `flappy:sector_event_started` event.
- Near-miss proportional recharge, max-energy cap, overheat guard, cooldown, and the frontal pipe-face hypothesis.
- Scenario gap overrides and narrow-gap application.
- Ramp lap zero, monotonic factors, cap, disable switch, determinism, composed speed factors, and oscillation-aware vertical/passage-window feasibility.

## Validation status

No Jest, application typecheck, guardrail, documentation check, or local baseline command was executed in this environment: the repository could not be cloned because the environment could not resolve `github.com`, and no local checkout was available.

The repository's CI workflow runs on pushes to `master`/`develop` and pull requests targeting those branches; it does not run for a push to this feature branch. The E2E workflow has a manual dispatch option, but that does not execute the missing CI gates. No pull request was created because the task rules prohibit it.

Manual gameplay remains necessary to assess ramp feel, dynamic obstacle fairness, and announcement timing/legibility. No balancing claim is made.

## Architecture note

The announcement consumer subscribes directly to the typed EventBus and owns only transient presentation entities. The repository's PresentationGateway remains a proposed architecture item, not an implemented runtime API; this pass does not invent a Gateway or claim full conformance with that proposal.
