# Vertical Shmup — Bomb contract (AUD-P2-01)

- **Date:** 2026-11-16 (updated 2026-11-23)
- **Status:** Implemented (`ShmupBombSystem`, `ShmupCollisionSystem`, `bombs/bombEconomy.ts`)

## Intent

Limited **emergency clear**: remove hostile bullets, brief invulnerability, light damage to enemies, large VFX + SFX. Bombs are scarce; they can also be earned (see [Rewards](#rewards)).

## Rules

| Rule | Value |
|------|--------|
| Stock | `BOMB_STOCK_INITIAL` (default **3**), stored in `ShmupGameState.bombsRemaining` |
| Cap | `BOMB_STOCK_MAX` (default **5**); rewards are clamped, overflow is forfeited |
| Trigger | Edge-triggered action `bomb` / KeyB / touch `bomb` |
| On empty stock | No effect |
| Enemy bullets | All `ShmupEnemyBullet` reclaimed (real pooled bullets included) |
| Enemies | Non-boss: `BOMB_ENEMY_DAMAGE` (default 2); boss: `BOMB_BOSS_DAMAGE` (default 1) |
| Player | `invulnerableRemaining = max(..., BOMB_INVULN_DURATION)` (default 1.5 s) |
| VFX | `spawnLayeredExplosion` type `boss` at player + death juice |
| SFX | `PlaySFX` `explosion_large` (skipped on re-sim) |
| Event | `shmup:bomb` |

## Rewards

| Source | Rule |
|--------|------|
| Boss kill | `BOSS_KILL_BOMB_REWARD` (default **1**) via `grantBombs`, granted in `ShmupCollisionSystem` |
| Grazes | One bomb per `GRAZE_BOMB_THRESHOLD` (default **40**) cumulative grazes via `grazeBombRewards` in `ShmupGrazeSystem` |

Both rewards mutate `ShmupGameState` during resimulation; only presentation/SFX is suppressed when `world.isReSimulating`. Boss rewards are guarded by the serializable `ShmupEnemy.bombRewardGranted` flag, so a second process of the same dead boss cannot pay twice. Graze rewards use `floor(next/threshold) - floor(previous/threshold)`, so thresholds cannot be paid twice and the graze remainder is preserved.

## Related combat SFX (ShmupCollisionSystem)

| Event | Cue |
|-------|-----|
| Enemy kill | `explosion_small` |
| Boss kill | `explosion_large` |
| Player hit | `hit` |
| Player death | `explosion_large` + `game_over` |

Assets: `SHARED_AUDIO_MANIFEST` in `@tiny-aster/core`.

## Negative cases

1. Game over / paused → no detonation.
2. Stock 0 → no clear.
3. Held input → only one detonation until release (edge).
4. Reward at cap → stock stays at `BOMB_STOCK_MAX`; no banked overflow.

## Files

- `systems/ShmupBombSystem.ts`
- `systems/ShmupCollisionSystem.ts` (kill/hit SFX, boss kill reward)
- `systems/ShmupGrazeSystem.ts` (graze threshold reward)
- `bombs/bombEconomy.ts` (pure helpers)
- Config keys `BOMB_*`, `BOSS_KILL_BOMB_REWARD`, `GRAZE_BOMB_THRESHOLD`
- UI: bomb touch button + B key; HUD `BOMBS`
