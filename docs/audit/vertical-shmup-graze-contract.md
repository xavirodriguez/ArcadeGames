# Vertical Shmup — Graze contract (AUD-P2-01)

- **Date:** 2026-11-16
- **Status:** Implemented (`ShmupGrazeSystem`)
- **Depends on:** collision matrix, player collider radius from config

## Intent

Reward near-misses against **enemy bullets** without taking damage. Does **not** apply to enemy bodies (body contact is P2-01 damage).

## Geometry

- `R_hit` = `PLAYER_COLLIDER_RADIUS`
- `R_graze` = `R_hit + GRAZE_MARGIN` (default margin **12**)
- Graze when `R_hit < d <= R_graze`
- One credit per enemy-bullet entity lifetime

## Scoring

| Event | Effect |
|-------|--------|
| Graze | `score += GRAZE_SCORE` (default **10**), `grazeCount += 1` |
| Event | `shmup:graze` deferred |

## Implementation

- `src/games/vertical-shmup/graze/grazeMath.ts` — pure helpers
- `src/games/vertical-shmup/systems/ShmupGrazeSystem.ts` — GameRules phase
- Config: `GRAZE_MARGIN`, `GRAZE_SCORE`
- State: optional `grazeCount` on `ShmupGameState`

Bombs remain out of scope.
