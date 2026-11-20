# Plan de refactorización de seguridad de tipos — Tiny Aster (ArcadeGames)

> Derivado de la auditoría contrastada con el código (revisión `c72f967`) y de `docs/analysis-typescript-patterns.md`.
> Objetivo: que los contratos de tipos representen mejor la arquitectura que ejecuta el motor, **sin** comprometer determinismo, compatibilidad, rendimiento ni límites entre paquetes.
> Fase 0 completada: inventario AST en `docs/typecast-inventory.json` y `scripts/typecast-inventory.ts`.

## Fase 0 — Validar diagnóstico y métricas (P0) ✅

**Entregable:** informe cuantitativo reproducible.

Resultados (AST, excl. dist/.turbo/compiled-js/*.d.ts):

| Área | `as any` | `as unknown` | total |
|---|---|---|---|
| Producción | 64 | 165 | **229** |
| Tests | 575 | 57 | 632 |
| Scripts | 0 | 0 | 0 |
| **Total** | 639 | 222 | 861 |

Hotspots de producción: `SharedVFX.ts` (24), `GeometryWarsGameScene.ts` (9), `CanvasRenderer.ts` (7), `CombatSystem.ts` (6), `PlatformerMovementSystem.ts` (5), `NullBaseGame.ts` (5), `FlappyBirdGame.ts` (5).

**Conclusión de F0:** la deuda real en producción es ~229 casts, no 862 (que incluía tests). No fijar objetivos de reducción arbitrarios; priorizar por riesgo de contrato.

## Fase 1 — Fortalecer contrato de `CombatSystem` (P1)

**Archivo:** `packages/gameplay-kit/src/combat/systems/CombatSystem.ts`

### Tareas
1. Inventariar consumidores: `AsteroidsGame`, `ArkanoidGame`, `ShmupGameScene`, `GeometryWarsGameScene`, `SpaceInvadersGameScene`, `TowerDefenseGame`, tests (`CombatSystem.test.ts`, `CombatRollbackResimulation.test.ts`, escenas).
2. Inventariar registros de componentes/eventos de cada consumidor (Damage/Faction presentes solo en Asteroids, GeometryWars, SpaceInvaders, TowerDefense; ausentes en Arkanoid).
3. Diseñar restricción genérica mínima compatible (probablemente `TComponents extends CoreComponentRegistry` + acceso condicional a Damage/Faction), sin forzar componentes inexistentes.
4. Eliminar casts resolubles por narrowing/contratos; mantener los que son adaptación legítima.
5. Revisar `WorldCommandBuffer.addComponent` para `Dead` (línea ~151) y acceso a `EventBus`.
6. Añadir pruebas de tipos (`tsc --noEmit` sobre consumidores) y regresión de combate.
7. Verificar determinismo/rollback en consumidores afectados.

### Criterio de aceptación
No se debilitan contratos genéricos; no se altera orden de resolución de daño; sin regresión en consumidores.

### Riesgo
Medio-alto (daño, muerte, eventos, destrucción). No combinar con cambios de lifecycle/rollback.

## Fase 2 — Revisar `NullBaseGame` y `GameplayFreezeMixin` (P2)

**Archivo:** `packages/core/src/runtime/NullBaseGame.ts`

### Tareas
1. Inspeccionar contrato completo de `WorldSnapshot`; construir snapshot vacío tipado sin `as unknown as WorldSnapshot` (línea ~snapshot()).
2. Revisar casts de `GameplayFreezeMixin` (`enterGameplayFreeze`, `exitGameplayFreeze`, `isGameplayFrozen`, `getGameplayFreezeRemaining`) que usan `this._world as unknown as World`.
3. Determinar si las firmas del mixin admiten `World<TComponents, TEvents>` sin casts.
4. Añadir pruebas de snapshot y freeze; verificar consumidores.
5. Preservar comportamiento no-op (Null Object).

### Criterio de aceptación
`NullBaseGame` sigue siendo Null Object; sin cambio de comportamiento.

## Fase 3 — Investigación de casts en `SharedVFX` (P2, auditoría)

**Archivo:** `src/games/shared/rendering/SharedVFX.ts`

### Tareas
1. Inventariar los 24 casts (22 `unknown`).
2. Determinar causa: incompatibilidad `ComponentRegistry` vs `CoreComponentRegistry`, firma de `ShapeDrawer`, adaptación de contexto.
3. Verificar si `IDrawAdapter`/`CanvasDrawAdapter`/`SkiaDrawAdapter` (ya existentes) cubren la necesidad — **no** introducir nueva abstracción global.
4. Eliminar solo casts con solución verificable.
5. Puede producir informe sin cambios de código si los casts son necesarios.

### Criterio de aceptación
Sin nueva abstracción redundante; paridad Canvas/Skia intacta.

## Fase 4 — Evaluar duplicación semántica de type guards (P3)

### Tareas
1. Clasificar implementaciones de `isRecord` (`World.ts`, `BlueprintInterpreter.ts`, `resolveVisualScene.ts`, `DebugOverlay.tsx`) — diferenciar exclusión de arrays.
2. Identificar otros guards duplicados.
3. Consolidar solo donde haya equivalencia semántica y sin dependencias innecesarias.

### Criterio de aceptación
No centralizar guards con contratos distintos.

## Fase 5 — Mejoras opcionales de tipos (P4)

Investigación, no refactorización obligatoria:
- Branded types (`EntityId`, `Tick`, `Seed`, `NetworkSequence`) — solo si se demuestra confusión de tipos en consumidores.
- Template literal types para eventos (`combat:hit`/`combat:death`) — solo si los mecanismos actuales no resuelven tipado.
- `noUncheckedIndexedAccess` por paquete (empezar por `packages/core`).
- Zod en boundaries restantes de server.
- Eliminación de casts en módulos de alto riesgo.

Cada propuesta debe justificar beneficio y coste.

## Lo que NO se hará (sin evidencia suficiente)

- No crear nuevo sistema universal de renderizado (ya existe `IDrawAdapter`).
- No aumentar artificialmente el número de type guards (27 → 60).
- No eliminar indiscriminadamente todos los casts.
- No introducir branded types en todas las entidades/números.
- No reescribir el sistema de eventos con template literal types.
- No centralizar todos los `isRecord`.
- No modificar rollback/snapshots como parte de F1.
- No cambiar implementaciones Canvas/Skia sin incompatibilidad demostrada.

## Orden de ejecución

F0 (✅ métricas) → F1 (PR acotada) → F2 → F3 (auditoría) → F4 → F5 (opcional).

## Guardrails a ejecutar en cada fase

`pnpm run check:agent-guardrails`, `pnpm run ci`, suite Jest relevante, y (si aplica) `pnpm run ratchet:update` solo tras verificación. Toda reducción de casts debe actualizar baseline mediante el ratchet existente.
EOF
echo created