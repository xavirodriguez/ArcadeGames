# Hit&Run

Platformer + run-and-gun (Metal Slug feel) on `@tiny-aster/core`.

**Branch:** `feature/hit-and-run` · **gameId:** `hitandrun`

---

## Boot

```ts
registerHitRunFeedback(this.world);
registerHitRunWeapons(this.world);
registerHitRunAI(this.world);      // FSMs + sensors + shoot cooldown
registerHitRunWaves(this.world, { script: WAVE_OPENING });

world.addComponent(player, {
  type: "HitRunWeapon",
  weaponId: "hmg",
  cooldownRemaining: 0
});
```

---

## AI por behaviorTags ✅

```
ai/
  behaviorTagResolver.ts   # tags → machineId + data
  hitRunStateMachines.ts   # hr_walk | hr_hop | hr_charge | hr_shooter | hr_tank
  enemyShoot.ts            # disparo data-driven
  attachEnemyAI.ts         # StateMachine + PlayerSensor + Patrol
  HitRunShootCooldownSystem.ts
  registerHitRunAI.ts
```

| Tag | Máquina | Comportamiento |
|-----|---------|----------------|
| `walk` / `block` | `hr_walk` | Patrulla, alerta, carga corta |
| `hop` | `hr_hop` | Idle → salto hacia el jugador |
| `charge` | `hr_charge` | Idle → charge a alta velocidad |
| `shoot_slow` | (con walk o `hr_shooter`) | Disparo periódico |
| `shoot_heavy` / `tank` | `hr_tank` | Lento + disparo pesado |

Los arquetipos en `HitRunEnemyArchetypes` ya llevan `behaviorTags`. Al spawnear, `HitRunEnemyPool` llama `attachEnemyAI` automáticamente.

### Añadir un comportamiento nuevo

1. Nueva entrada en `registerHitRunStateMachines`
2. Mapear tags en `resolveAIFromTags`
3. (Opcional) tag en el arquetipo JSON/catálogo

**Sin sistemas nuevos por enemigo** — solo datos + FSM registry.

---

## Tasks A / B / C

| Task | Entry |
|------|-------|
| Juice | `registerHitRunFeedback` |
| Arsenal | `registerHitRunWeapons` |
| Waves | `registerHitRunWaves` |
| AI | `registerHitRunAI` |
