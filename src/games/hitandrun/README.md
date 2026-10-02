# Hit&Run

Platformer + run-and-gun (Metal Slug feel) on `@tiny-aster/core`.

**Branch:** `feature/hit-and-run` · **gameId:** `hitandrun` · **Route:** `/hitandrun`

---

## Sprint status

| Task | Status | Entry point |
|------|--------|-------------|
| **A — Juice** | ✅ | `registerHitRunFeedback(world)` |
| **B — Arsenal** | ✅ | `registerHitRunWeapons(world)` |
| **C — Wave Director** | ✅ | `registerHitRunWaves(world)` |

### Boot mínimo

```ts
registerHitRunFeedback(this.world);
registerHitRunWeapons(this.world);
registerHitRunWaves(this.world, { script: WAVE_OPENING });

// jugador
world.addComponent(player, {
  type: "HitRunWeapon",
  weaponId: "hmg",
  cooldownRemaining: 0
});
```

---

## Task A — Feedback

Events `combat:hit` / `combat:death` → `HitStopRemaining`, `HitRunScreenShake`, `Render.hitFlashFrames`.

## Task B — Arsenal

| Arma | consumption | category |
|------|-------------|----------|
| HMG | destroy-entity | bullet |
| Shotgun | destroy-entity | shotgun |
| Rocket | remove-component | explosive → AOE |

## Task C — Wave Director

```
waves/
  HitRunWaveTypes.ts
  HitRunEnemyArchetypes.ts   # popcorn, wall, hopper, charger, elite
  sampleWaves.ts             # opening, pressure, boss_lead, endless
  waveFormations.ts          # point, line, column, wall, scatter, drop
  HitRunEnemyPool.ts
  HitRunWaveSystem.ts
  registerHitRunWaves.ts
```

### JSON de oleada

```json
[
  { "t": 0, "type": "popcorn", "count": 6, "formation": "line" },
  { "t": 5, "type": "wall", "count": 5, "formation": "wall" },
  { "t": 8, "type": "hopper", "count": 4, "formation": "drop", "interval": 0.15 }
]
```

- `t`: segundos desde el inicio del script
- `formation`: `point` | `line` | `column` | `wall` | `scatter` | `drop`
- `interval`: stagger entre unidades del mismo evento
- `loop` + `loopDelay` en el script para endless

### Cambio de script en runtime

```ts
import { startWaveScript, WAVE_PRESSURE } from "./waves";
startWaveScript(world, WAVE_PRESSURE);
```

### Determinismo

- Timeline y formaciones fijas (sin `Math.random`)
- Scatter usa hash de índice reproducible
- Respeta `isSimulationFrozen` (hit-stop / pause)

---

## Próximos pasos opcionales

1. Detach completo de `EchoRunnerGame`
2. PrefabPool real por arquetipo de enemigo
3. Modos `kids` / `violent` (paleta + damage tables)
4. AI StateMachines por `behaviorTags`
