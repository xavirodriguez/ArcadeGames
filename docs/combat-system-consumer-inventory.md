# Inventario de consumidores de `CombatSystem` (Fase 1, pasos 1–2)

> Sin cambios de código. Base para diseñar la restricción genérica mínima.

## 1. Instanciaciones en producción

| Archivo | Generic args | Registro del World |
|---|---|---|
| `src/games/asteroids/AsteroidsGame.ts:215` | `new CombatSystem()` (default) | `AsteroidsComponentRegistry` / `AsteroidsEventRegistry` |
| `src/games/arkanoid/ArkanoidGame.ts:274` | `new CombatSystem()` (default) | `ArkanoidComponentRegistry` / `ArkanoidEventRegistry` |
| `src/games/vertical-shmup/scenes/ShmupGameScene.ts:94` | `new CombatSystem()` (default) | `ShmupComponentRegistry` (inferido) |
| `src/games/geometrywars/scenes/GeometryWarsGameScene.ts:94` | `new CombatSystem()` (default) | `GeometryWarsComponentRegistry` |
| `src/games/space-invaders/scenes/SpaceInvadersGameScene.ts:189` | `new CombatSystem()` (default) | `SpaceInvadersComponentRegistry` |
| `src/games/tower-defense/TowerDefenseGame.ts:290` | `new CombatSystem()` (default) | `TowerDefenseComponentRegistry` |

Ningún consumidor de producción instancia `CombatSystem<TheirRegistry, TheirEvents>()` explícitamente; todos usan los defaults (`CoreComponentRegistry`, `Record<string,unknown>`). Por tanto, el sistema se asigna al World por bivarianza de métodos y opera sobre un `World` tipado como `CoreComponentRegistry` en tiempo de compilación, aunque reciba un World más específico en runtime.

## 2. Registros de componentes (presencia de claves usadas por `CombatSystem`)

`CombatSystem` accede a: `CollisionEvents`, `Damage`, `Health`, `Faction`, `Dead` (y `EventBus`).

| Registro | `CollisionEvents` (core) | `Health` (core) | `Dead` (core) | `Damage` | `Faction` |
|---|---|---|---|---|---|
| `AsteroidsComponentRegistry` | ✅ (core) | ✅ (core) | ✅ (core) | ✅ (declarado) | ✅ (declarado) |
| `ArkanoidComponentRegistry` | ✅ (core) | ✅ (core) | ✅ (core) | ❌ (no declarado) | ❌ (no declarado) |
| `GeometryWarsComponentRegistry` | ✅ (core) | ✅ (core) | ✅ (core) | ✅ (declarado) | ✅ (declarado) |
| `SpaceInvadersComponentRegistry` | ✅ (core) | ✅ (core) | ✅ (core) | ✅ (declarado) | ✅ (declarado) |
| `TowerDefenseComponentRegistry` | ✅ (core) | ✅ (core) | ✅ (core) | ✅ (declarado) | ✅ (declarado) |
| `ShmupComponentRegistry` | (por verificar) | (por verificar) | (por verificar) | ✅ (declarado) | ✅ (declarado) |

Conclusión: `Arkanoid` usa `CombatSystem` **sin** declarar `Damage`/`Faction`. En runtime el sistema simplemente no encuentra `Damage` y retorna (no-op para daño), pero aún procesa `CollisionEvents` (sin efecto de daño). Por tanto, **una restricción genérica que exija `Damage`/`Faction` rompería Arkanoid** a menos que se declare como opcional o se elimine el uso de `CombatSystem` allí.

## 3. Eventos

Consumidores que declaran `combat:hit`/`combat:death` en su `EventRegistry`: Asteroids, Arkanoid, SpaceInvaders, TowerDefense, GeometryWars (por verificar Shmup). `CombatSystem` emite vía `EventBus.emitDeferred("combat:hit"/"combat:death")` con cast a `EventBus`.

## 4. Casts internos de `CombatSystem` (6)

| Línea | Cast | Resoluble por contrato genérico? |
|---|---|---|
| `colEventsKey` | `"CollisionEvents" as Extract<keyof TComponents,string>` | Parcialmente: `"CollisionEvents"` está en `CoreComponentRegistry`, así que si `TComponents extends CoreComponentRegistry`, el cast a `Extract` es innecesario si se tipa la clave como literal. |
| `colComp` | `as unknown as { collisions?; triggersEntered? }` | Sí si `TComponents["CollisionEvents"]` se estrecha al tipo del componente de colisión. Requiere que el componente esté tipado en core (ya lo está: `CollisionEventsComponent`). |
| `damageKey/healthKey/factionKey/deadKey` | `as Extract<keyof TComponents,string>` | Parcialmente: `Health`/`Dead`/`CollisionEvents` están en core; `Damage`/`Faction` no. |
| `damageComp` | `as unknown as DamageComponent` | Solo si `TComponents` garantiza `Damage: DamageComponent`. Para consumidores sin `Damage` (Arkanoid), debe ser opcional/condicional. |
| `healthComp` | `as unknown as { current; max; invulnerableRemaining? }` | Sí si `Health` está en core y su tipo se expone. |
| `factionA/B` | `as unknown as FactionComponent` | Solo si `TComponents` garantiza `Faction`. |
| `mutableHealth` | `as { current: number }` | Sí si `getMutableComponent` devuelve `TComponents["Health"]`. |
| `eventBus` | `as EventBus` | Revisar: `world.getEventBus()` podría tiparse mejor en `World` (retorna `EventBus` ya?). |
| `addComponent(target, {type: deadKey} as ...)` | `as unknown as Parameters<…>[1]` | Revisar contrato de `WorldCommandBuffer.addComponent`; posible tipado más fuerte. |

## 5. Diseño candidato (a validar)

Opción A — restricción mínima:
```
export class CombatSystem<
  TComponents extends CoreComponentRegistry = CoreComponentRegistry,
  TEvents extends EventRegistry = EventRegistry
> ...
```
Esto ya es el default actual, pero los consumidores no pasan `TheirRegistry`. Para que el compilador verifique, los consumidores deberían instanciar `new CombatSystem<TheirRegistry, TheirEvents>()`. Cambiar las 6 instanciaciones de producción. Luego los casts de `CollisionEvents`/`Health`/`Dead`/`EventBus` podrían eliminarse; los de `Damage`/`Faction` requieren acceso condicional (componente opcional en el registro) o mantener cast con guard.

Opción B — acceso condicional a Damage/Faction mediante tipos condicionales:
```
type OptionalComp<T, K extends string> = K extends keyof T ? T[K] : undefined;
```
Más complejo, pero evita forzar a Arkanoid a declarar componentes que no usa.

## 6. Riesgos y pruebas requeridas

- No alterar orden de resolución de daño ni eventos.
- Ejecutar `CombatSystem.test.ts`, `CombatRollbackResimulation.test.ts`, tests de escenas de los 6 juegos.
- Verificar determinismo/rollback donde existan consumidores afectados (CombatRollbackResimulation ya cubre core).
- Ejecutar `check:agent-guardrails` y `ci`.

## 7. Decisión pendiente

Antes de implementar, decidir:
- ¿Opción A (forzar instanciación genérica explícita) u Opción B (acceso condicional)?
- ¿Arkanoid debe seguir usando `CombatSystem` (no-op de daño) o eliminarse esa registración?

No se ha modificado código en esta fase.
EOF
echo done