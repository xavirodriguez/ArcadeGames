# Vertical Shmup — Bomb contract (AUD-P2-01)

- **Date:** 2026-11-16
- **Status:** Implemented (`ShmupBombSystem`)

## Intent

Limited **emergency clear**: remove hostile bullets, brief invulnerability, light damage to enemies, large VFX.

## Rules

| Rule | Value |
|------|--------|
| Stock | `BOMB_STOCK_INITIAL` (default **3**), stored in `ShmupGameState.bombsRemaining` |
| Trigger | Edge-triggered action `bomb` / KeyB / touch `bomb` |
| On empty stock | No effect |
| Enemy bullets | All `ShmupEnemyBullet` reclaimed |
| Enemies | Non-boss: `BOMB_ENEMY_DAMAGE` (default 2); boss: `BOMB_BOSS_DAMAGE` (default 1) |
| Player | `invulnerableRemaining = max(..., BOMB_INVULN_DURATION)` (default 1.5 s) |
| VFX | `spawnLayeredExplosion` type `boss` at player + death juice |
| Event | `shmup:bomb` |

## Negative cases

1. Game over / paused → no detonation.
2. Stock 0 → no clear.
3. Held input → only one detonation until release (edge).

## Files

- `systems/ShmupBombSystem.ts`
- Config keys `BOMB_*`
- UI: bomb touch button + B key; HUD `BOMBS`
