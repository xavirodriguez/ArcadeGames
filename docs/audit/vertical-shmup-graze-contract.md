# Vertical Shmup — Graze contract (AUD-P2-01)

- **Date:** 2026-11-16 (updated 2026-11-23)
- **Status:** Implemented (`ShmupGrazeSystem`)
- **Depends on:** collision matrix, player collider radius from config, pooled projectile tagging

## Intent

Reward near-misses against **enemy bullets** without taking damage. Does **not** apply to enemy bodies (body contact is P2-01 damage).

## Geometry

- `R_hit` = `PLAYER_COLLIDER_RADIUS`
- `R_graze` = `R_hit + GRAZE_MARGIN` (default margin **12**)
- Graze when `R_hit < d <= R_graze`
- One credit per enemy-bullet entity lifetime

## Scoring and rewards

| Event | Effect |
|-------|--------|
| Graze | `score += GRAZE_SCORE` (default **10**), `grazeCount += 1` |
| Every 40th graze | `bombsRemaining += 1`, clamped to `BOMB_STOCK_MAX` (default 5) |
| Event | `shmup:graze` deferred |

Credits use `grazeBombRewards(previous, next, GRAZE_BOMB_THRESHOLD)`; the cumulative `grazeCount` is never reset, so the remainder carries over to the next threshold. Reward mutation runs while `world.isReSimulating`; only sparks, flash, floating text and SFX are presentation-only and suppressed.

## Implementation

- `src/games/vertical-shmup/graze/grazeMath.ts` — pure helpers
- `src/games/vertical-shmup/systems/ShmupGrazeSystem.ts` — GameRules phase
- `src/games/vertical-shmup/bombs/bombEconomy.ts` — pure reward helpers
- Config: `GRAZE_MARGIN`, `GRAZE_SCORE`, `GRAZE_BOMB_THRESHOLD`, `BOMB_STOCK_MAX`

## Projectile tagging and rollback safety

`EntityPool.ts` tags pooled projectiles as `ShmupEnemyBullet` / `ShmupPlayerBullet`, matching `ShmupComponentRegistry`. The generic `EnemyBullet` / `PlayerBullet` names do **not** exist in this game and previously made graze and bomb systems no-ops on real pooled bullets.

The "already grazed" flag lives on `ShmupEnemyBullet.grazed` (serializable state), not in a system-owned `Set`. `EntityPool.extraComponents` resets it to `false` on every acquire, so pool reuse and snapshot rewind cannot duplicate or lose a credit.
