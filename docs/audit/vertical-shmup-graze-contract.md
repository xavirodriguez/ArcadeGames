# Vertical Shmup — Graze contract (AUD-P2-01)

- **Date:** 2026-11-16
- **Status:** SPEC ONLY — not implemented in simulation systems yet
- **Depends on:** collision matrix (`vertical-shmup-collision-matrix.md`), `ParticlePool` for optional VFX

## Intent

Reward the player for **near-misses** against hostile projectiles (enemy bullets) without taking damage. Classic vertical-shmup feel: tight movement through bullet patterns.

Graze does **not** apply to enemy bodies (body contact is damage via P2-01).

## Geometry

Let:

- `R_hit` = player collider radius (from `EntityFactory.createPlayer`)
- `R_graze` = graze outer radius = `R_hit + GRAZE_MARGIN`
- Default `GRAZE_MARGIN = 12` world units (tunable in config later)

A hostile bullet **grazes** when, in a simulation tick:

1. Distance `d` from player center to bullet center satisfies `R_hit < d <= R_graze`
2. Player is **not** invulnerable in a way that cancels graze (policy: graze **allowed** during invulnerability — skill still counts)
3. Bullet has not already been marked as grazed by this player for its lifetime (one graze credit per bullet entity)

If `d <= R_hit`, that is a **hit**, not a graze (CombatSystem / body-or-bullet damage path).

## Scoring & feedback

| Event | Score | Notes |
|-------|-------|--------|
| Successful graze | `+GRAZE_SCORE` (default **10**) | Added to `ShmupGameState.score` |
| Optional meter | future | Bomb meter not in this contract |

Presentation (when implemented):

- Brief spark / ring at graze point (reuse small explosion or particle)
- Optional HUD counter `grazeCount` on `ShmupGameState` for session stats

## Cooldown / anti-farm

- **Per-bullet once:** each enemy bullet entity grants at most one graze.
- **No global cooldown** required if per-bullet once is enforced.
- Dense patterns still score once per bullet that enters the annulus and exits or dies.

## Layer / mask note

Enemy bullets live on layer `ENEMY` with mask `PLAYER`. Geometric graze is a **narrow-phase distance check** (or a second trigger collider with layer that does not deal `Damage`). Preferred v1: **distance check in a dedicated system** after movement, without adding a second physics body.

Do **not** put `Damage` on a graze ring.

## Positive cases (tests must lock)

1. Bullet at `d = R_hit + 1` → graze credit, score +10, no HP loss.
2. Two ticks with same bullet still in annulus → only **one** graze credit.
3. Bullet at `d = R_hit + GRAZE_MARGIN` (on outer edge) → graze credit.

## Negative cases

1. Bullet at `d <= R_hit` → hit path, **not** graze.
2. Bullet at `d > R_graze` → no graze.
3. Player bullet near player → never graze (friendly).
4. Enemy **body** in annulus → not graze (body contact is separate).

## Implementation checklist (future PR)

- [ ] `GRAZE_MARGIN` / `GRAZE_SCORE` on `ShmupConfigSchema`
- [ ] Optional `grazeCount` on `ShmupGameState`
- [ ] `ShmupGrazeSystem` (Simulation or GameRules phase, after movement)
- [ ] Mark bullet component flag `grazedByPlayer` or ephemeral set on world resource
- [ ] VFX hook (optional)
- [ ] Wire tests against live world once system exists

## Pure helpers

See `src/games/vertical-shmup/graze/grazeMath.ts` — geometry only, no ECS.
