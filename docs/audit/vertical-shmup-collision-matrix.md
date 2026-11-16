# Vertical Shmup — Collision layer / mask matrix

- **Date:** 2026-11-16
- **Scope:** `src/games/vertical-shmup/` entity factories and pools
- **Source of truth:** `CollisionLayers` in `@tiny-aster/gameplay-kit`

## Layer constants

```ts
CollisionLayers = {
  PLAYER:     0x0001,
  ENEMY:      0x0002,
  PROJECTILE: 0x0004,
  DEBRIS:     0x0008,
  BOUNDARY:   0x0010,
}
```

## Entity assignment

| Entity | Layer | Mask | Damage component |
|--------|-------|------|------------------|
| Player | `PLAYER` | `ENEMY` | none |
| Enemy body (scout / armored / boss) | `ENEMY` | `PLAYER \| PROJECTILE` | `amount: 1`, `category: "shmup_body"`, `consumption: "none"` |
| Player bullet | `PROJECTILE` | `ENEMY` | from projectile pool (player faction) |
| Enemy bullet | `ENEMY` | `PLAYER` | from projectile pool (enemy faction) |

Enemy bodies and enemy bullets share the `ENEMY` layer. The player mask includes `ENEMY`, so both body contact and hostile projectiles can generate collision pairs against the player.

## Positive cases (must collide / deal damage)

1. **Player bullet ↔ enemy body** — player projectile damages enemy; bullet is consumed by pool policy.
2. **Enemy bullet ↔ player** — hostile projectile damages player (subject to invulnerability and single-hit guard).
3. **Enemy body ↔ player (body contact)** — enemy `Damage` with category `shmup_body` damages the player once per tick while not invulnerable; enemy is not destroyed by the contact.

## Negative cases (must not collide or must not deal damage)

1. **Player bullet ↔ player** — different factions; player has no `Damage` incoming from own bullets; layer/mask does not pair them.
2. **Enemy ↔ enemy** — same faction; `friendlyFire` is false on body damage.
3. **Player bullet ↔ enemy bullet** — player bullet mask is only `ENEMY` (bodies/hostile shots on that layer may still pair; gameplay relies on faction + Damage resolution, not geometric separation of bullet families).
4. **Player invulnerable** — `Health.invulnerableRemaining > 0` blocks further damage application in `CombatSystem`.
5. **Multiple simultaneous enemy contacts in one tick** — `ShmupSingleHitGuardSystem` keeps at most one damaging collision with an enemy-faction `Damage` source per player per tick.

## Design notes

- Body contact does **not** destroy the enemy (consumption `none`). Only player projectiles remove enemies via combat death + `ShmupCollisionSystem`.
- Boss and armored enemies use the same body-damage contract as scouts (1 HP to the player per accepted hit).
- Graze and bombs are **out of scope** for this matrix (AUD-P2-01); do not assume they exist.

## Related code

- `EntityFactory.createPlayer` / `createEnemy`
- `EntityPool` player/enemy bullet prefabs
- `ShmupSingleHitGuardSystem`
- `CombatSystem` (`@tiny-aster/gameplay-kit`)
