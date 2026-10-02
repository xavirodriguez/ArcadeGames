# Hit&Run

**Option A clone** of `echorunner` — platformer + run-and-gun (Metal Slug feel).

## Status

- Branch: `feature/hit-and-run`
- `gameId`: `hitandrun`
- Route: `/hitandrun`

## Task A — Juice / Feedback ✅

```
systems/HitRunFeedbackSystem.ts
registerHitRunFeedback(world)
```

Resources: `HitStopRemaining`, `HitRunScreenShake`  
Events: `combat:hit` / `combat:death` → hit-stop, shake, `hitFlashFrames`

## Task B — Arsenal data-driven ✅

```
weapons/
  HitRunWeaponTypes.ts      # defs + ExplosivePayload + combat:explosion
  HitRunWeaponCatalog.ts    # hmg | shotgun | rocket
  HitRunBulletPool.ts       # PlayerBulletPool resource
  fireWeapon.ts             # single / cone / rocket spawn
  HitRunWeaponSystem.ts     # cooldown + fire + recoil
  HitRunExplosionSystem.ts  # radial chain (remove-component → AOE)
  registerHitRunWeapons.ts
```

| Arma | Cadencia | Consumption | Category (juice) | Notas |
|------|----------|-------------|------------------|-------|
| **HMG** | 0.08s | destroy-entity | `bullet` | Hitbox pequeña, recoil |
| **Shotgun** | 0.55s | destroy-entity | `shotgun` | 5 pellets, cono 0.45 rad |
| **Rocket** | 1.1s | remove-component | `explosive` | AOE `combat:explosion` |

### Integración

```ts
import { registerHitRunFeedback } from "./systems/registerHitRunFeedback";
import { registerHitRunWeapons } from "./weapons";

// onRegisterSystems:
registerHitRunFeedback(this.world);
registerHitRunWeapons(this.world);

// Al spawnear jugador, añadir:
world.addComponent(player, {
  type: "HitRunWeapon",
  weaponId: "hmg", // | "shotgun" | "rocket"
  cooldownRemaining: 0
});
// PlatformerInput debe exponer firePressed / fireHeld (y opcional aimX/aimY)
```

**CombatSystem no se modifica.** Solo se rellenan `Damage.amount`, `category`, `consumption` al acquire del pool.

## Task C — Wave Director (pendiente)

JSON declarativo de spawns por tiempo.

## Run

```bash
git checkout feature/hit-and-run
pnpm start
```
