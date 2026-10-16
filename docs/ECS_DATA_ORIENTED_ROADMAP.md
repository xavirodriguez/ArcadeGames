# Roadmap ECS — Migración hacia diseño orientado a datos

> Estado: **propuesta**. Documento de planificación para endurecer la arquitectura ECS del monorepo (`@tiny-aster/core`) sin romper determinismo, rollback ni API pública.
> Alcance principal: `packages/core`. Impacto colateral en `packages/gameplay-kit`, `packages/network`, `server` y juegos en `src/games`.

---

## 0. Principios y "gates" (invariantes no negociables)

| Gate | Criterio |
| --- | --- |
| **Determinismo** | Mismo seed + inputs ⇒ mismo `hash()` (FNV-1a) en todas las plataformas. Test de replay dorado. |
| **Rollback/Replay** | Snapshots AoS y SoA hacen round-trip sin pérdida; `restore()` reconstruye índices. |
| **API pública** | `World`, `System`, `Query`, `CommandBuffer` mantienen firmas. Cambios internos detrás de flag. |
| **Server safety** | Ninguna migración puede introducir estado mutable compartido entre `World`s (Colyseus multi-sala). |
| **No regresión** | `pnpm run check:duplication` y suite de tests en verde por fase. |

**Estrategia clave:** la migración grande (Fase 2) va detrás de una **feature flag** (`UseSparseSetStorage`) para poder volver atrás y comparar A/B con el mismo binario.

---

## Fase 0 — Red de seguridad y métricas · (L) · *prerequisito de Fase 2*

Sin esto, el cambio de storage es a ciegas.

| # | Tarea | Archivos |
| --- | --- | --- |
| 0.1 | Benchmark de tick: N entidades (100/1k/5k) midiendo `ms/tick`, allocs/tick, tiempo de `snapshot()`, memoria. | `packages/core/src/__benchmarks__/` (nuevo) |
| 0.2 | **Test de determinismo dorado**: correr el mismo replay y comparar `hash()` tick a tick. | `packages/core/src/replay/__tests__/` |
| 0.3 | Test de round-trip de snapshot AoS **y** SoA (snapshot → restore → snapshot → hash igual). | `packages/core/src/snapshots/__tests__/` |
| 0.4 | Test de aislamiento multi-World (dos `World` en paralelo no se contaminan). | `packages/core/src/ecs/__tests__/` |

**DoD:** baseline numérico registrado en `docs/ecs-baseline.md`; CI corre los 3 tests de invariantes.

---

## Fase 1 — Quick wins de bajo riesgo · (M) · *paralelizable*

Arregla los problemas concretos detectados en la auditoría, sin tocar la arquitectura.

| # | Tarea | Archivos | Detalle |
| --- | --- | --- | --- |
| 1.1 | 🔴 **BroadPhase: pools fuera del módulo** | `BroadPhase.ts`, `CollisionSystems.ts` | Eliminar `const boundsPool`/`pairsPool` globales. Crear `BroadPhaseScratch` y pasarlo como argumento desde la instancia del sistema (cada `World` tiene sus sistemas). |
| 1.2 | 🟠 **Par de entidad numérico en colisión** | `CollisionSystems.ts` | Sustituir `getPairId()` string por pack numérico de índices (20 bits c/u ⇒ 40 bits, seguro en `number`). `activePairs`/`currentFramePairs` → `Set<number>`. |
| 1.3 | 🟠 **Eliminar `new Set` por tick** | `CollisionSystems.ts` | El `seen` de merge `Collider`/`Collider2D` → scratch reuse (patrón ya usado en `CombatSystem`). |
| 1.4 | 🟠 **Freeze declarativo** | `System.ts`, `Schedule.ts`, `TTLSystem.ts`, `JuiceSystem.ts`, `ParticleSystem.ts` | Añadir flag `runsWhileFrozen` al `System`; quitar comparación por `constructor.name`. |
| 1.5 | 🟡 **Cachear key de query** | `World.ts` (`getQuery`) | Evitar `[...types].sort().join(",")` por llamada (normalizar a un set canónico / cachear el string). |
| 1.6 | 🟡 **Freeze solo en `readComponent`** | `World.ts` | Quitar/atenuar el `Object.freeze`/doble-freeze en `getComponent` (dev), moverlo al flag de modo estricto. |

**Riesgo:** bajo.
**DoD:** benchmarks muestran ↓allocations/tick y ↓ms/tick en escenas con muchas colisiones; test 0.4 en verde.

---

## Fase 2 — Storage data-oriented (sparse sets) · (L) · *el cambio grande*

Objetivo: eliminar `Map<Entity, unknown>` y la *pointer chasing*, habilitando iteración contigua.

### 2A. Abstracción

| # | Tarea | Detalle |
| --- | --- | --- |
| 2.1 | Interfaz interna `ComponentStorage<T>` (`get/set/delete/has/entities()/values()/size`). | Reemplaza el contrato implícito de `Map`. |
| 2.2 | Implementar `SparseSetStorage<T>`: `dense: T[]`, `denseEntities: Entity[]` (paralelos), `sparse: Int32Array` indexado por `unpackEntityIndex`, con validación de generación. | `packages/core/src/ecs/storage/` (nuevo) |

### 2B. Integración en `World`

| # | Tarea | Detalle |
| --- | --- | --- |
| 2.3 | `componentMaps: Map<string, ComponentStorage<unknown>>`. Mantener `componentIndex`, `entityComponentSets`, `queries`. | Cambio interno; `getComponent`/`addComponent`/`removeComponent` conservan firmas. |
| 2.4 | Feature flag `UseSparseSetStorage` (resource) con fallback al `Map` actual. | Permite A/B y rollback. |

### 2C. Serialización (punto de integración crítico)

| # | Tarea | Detalle |
| --- | --- | --- |
| 2.5 | Actualizar `InternalWorldAccess`/`SnapshotInternalAccess` para exponer `entities()`/`values()`. | ⚠️ Los serializers iteran `map.forEach`. |
| 2.6 | Adaptar `SnapshotSerializer` y `SnapshotSerializerSoA` a la nueva API de iteración **sin cambiar el formato del snapshot**. | El hash debe permanecer idéntico. |

### 2D. (Opcional / siguiente iteración) Índices por arquetipo

| # | Tarea | Detalle |
| --- | --- | --- |
| 2.7 | Evaluar archetypes para queries (evitar re-sort O(N log N) y matching por entidad). | Solo si 2A–2C no bastan. |

**Riesgo:** alto.
**Mitigación:** flag + Fase 0 como red + comparación de hashes.
**DoD:** `hash()` idéntico pre/post en todos los replays dorados; ms/tick y allocs/tick mejoran en el benchmark; snapshots AoS/SoA intactos.

---

## Fase 3 — Resources tipados y contrato de mutación · (M)

| # | Tarea | Archivos | Detalle |
| --- | --- | --- | --- |
| 3.1 | Registry tipado de resources (`TResources` genérico en `World`). | `World.ts` | Sustituir los `"GameplayFreeze"`, `"IsPaused"`, `"UseSoASnapshots"` mágicos y `assertResourceShape` manual. |
| 3.2 | Endurecer el contrato de mutación: `mutateComponent` como única vía, o `getComponent` devuelve vista de solo lectura tipada. | `World.ts` | Elimina el riesgo `[OWNERSHIP]` de mutación que no incrementa `stateVersion`. |
| 3.3 | Unificar `TimeScale` (hoy se lee con dos formas y `||`). | `Schedule.ts` | Un solo tipo. |

**Riesgo:** medio-bajo (toca firmas de recursos, no de ECS).
**DoD:** sin strings mágicos de resource; type-check de resources.

---

## Fase 4 — Calidad TypeScript y limpieza · (M)

| # | Tarea | Detalle |
| --- | --- | --- |
| 4.1 | `enum` → objetos `as const` (`SystemPhase`, `GameLifecycleState`). | Codemod mecánico. |
| 4.2 | Reducir `as any` / `as unknown as` en `packages/core` y `gameplay-kit`, empezando por los sistemas de juego. | P. ej. `CombatSystem.addComponent(target, { type: deadKey } as any)`. |
| 4.3 | Registrar tipos de componente con IDs numéricos internos (opcional). | Reduce hashing por string y refuerza tipos. |
| 4.4 | Revisar sistemas con caches no serializados: documentar contrato "reconstruible en 1 tick". | `SpatialPartitioningSystem` y similares. |

**Riesgo:** bajo.
**DoD:** `tsc --noEmit` estricto sin nuevos `any` en rutas de simulación.

---

## Secuencia, dependencias y esfuerzo

```text
Fase 0 ─┬─► Fase 2 ─► (2D opcional)
        │
Fase 1 ─┴─► Fase 3 ─► Fase 4
   (independiente, puede ir en paralelo desde el día 1)
```

| Fase | Esfuerzo | Riesgo | Bloquea a | Paralelizable |
| --- | --- | --- | --- | --- |
| 0 — Red de seguridad | L | bajo | 2 | no |
| 1 — Quick wins | M | bajo | — | sí (con 0) |
| 2 — Storage sparse-set | L | **alto** | 2D | no |
| 3 — Resources tipados | M | medio-bajo | — | sí |
| 4 — Calidad TS | M | bajo | — | sí |

---

## Métricas de éxito (antes/después, por fase)

- **ms/tick** a 1k y 5k entidades (objetivo Fase 2: −30/50%).
- **Allocaciones/tick** (Chrome DevTools / `--expose-gc`).
- **Tiempo de `snapshot()`** SoA (mantener o mejorar).
- **Memoria residente** de `World`.
- **Cero cambios** en `hash()` de replays dorados (gate binario).
- `check:duplication` bajo umbral.

---

## Registro de riesgos

| Riesgo | Fase | Mitigación |
| --- | --- | --- |
| Sparse set cambia orden de iteración → rompe determinismo | 2 | Ordenar por `denseEntities`/ID; comparar hashes. |
| Serializers acoplados a `Map` | 2C | Actualizar `InternalWorldAccess` primero, con tests de round-trip. |
| Multi-sala Colyseus | 1.1 | Pools por instancia/World. |
| Cambios de firmas de resources rompen juegos | 3 | Migración con alias deprecados y type-check. |
| Deuda de `as any` oculta bugs | 4 | Empezar por rutas de simulación; permitir `any` solo en tests. |

---

## Definition of Done global

1. Fase 0–1 completas con invariantes en CI.
2. Fase 2 detrás de flag, con hashes idénticos y mejora medible.
3. Sin estado mutable estático compartido entre `World`s.
4. Resources tipados, sin strings mágicos.
5. `tsc` estricto sin `any` nuevos en simulación.

---

## Referencias de código

- Storage de componentes actual: `packages/core/src/ecs/World.ts` (`componentMaps`, `componentIndex`, `entityComponentSets`).
- Entidades generacionales: `packages/core/src/ecs/Entity.ts`.
- Queries: `packages/core/src/ecs/Query.ts`.
- Schedule/fases: `packages/core/src/ecs/Schedule.ts`, `packages/core/src/ecs/System.ts`.
- Command buffer: `packages/core/src/ecs/WorldCommandBuffer.ts`.
- Broadphase: `packages/core/src/physics/collision/BroadPhase.ts`.
- Colisiones: `packages/core/src/physics/collision/CollisionSystems.ts`.
- Snapshots: `packages/core/src/snapshots/SnapshotSerializer.ts`, `SnapshotSerializerSoA.ts`, `SnapshotInternalAccess.ts`.
- Bucle: `packages/core/src/loop/GameLoop.ts`, `FrameScheduler.ts`.
- RNG: `packages/core/src/utils/RandomService.ts`.
- Runtime: `packages/core/src/runtime/BaseGame.ts`.
