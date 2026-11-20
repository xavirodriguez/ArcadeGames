# Fase 5 — Investigación de mejoras opcionales de tipos (P4)

> Fase de investigación, no de refactorización obligatoria. Ningún cambio de código de producción se realizó en esta fase.

## 1. Branded types

Búsqueda realizada (patrones más amplios que `__brand`): `type X = string &`, `type X = number &`, `Brand<`, `Opaque<`. No se encontraron branded types en `src/`, `packages/` ni `server/`.

**Candidatos propuestos originalmente:** `EntityId`, `Tick`, `Seed`, `NetworkSequence`, `EntityIndex`, `GameId` (ya es unión de literales).

**Evidencia de confusión de tipos:** no se identificaron bugs ni call sites donde un `Tick` se pase donde se espera un `EntityId` (o viceversa) en el código accesible. Los identificadores se usan en contextos bien delimitados (snapshots, input frames, entidades).

**Conclusión:** no hay evidencia suficiente para justificar una PR de branded types. Mantener como investigación opcional. Si se implementa, empezar por `Tick`/`Seed` en `BaseGame`/snapshots, con constructores de solo compilación y verificación de serialización SoA.

## 2. Template literal types para eventos

Los nombres de eventos están tipados mediante `EventRegistry` (`Record<string, unknown>`) y registros por juego (p. ej. `AsteroidsEventRegistry` con `"combat:hit": CombatHitEvent`). El `EventBus.emitDeferred(name, payload)` acepta `string`.

**Evaluación:** convertir a template literal types (`type CombatEvent = `combat:${"hit"|"death"}`) aportaría seguridad en el nombre del evento, pero el sistema actual ya valida payload por registro. El coste sería alto (cambiar firmas de `EventBus`, todos los registros y consumidores) y el beneficio marginal.

**Conclusión:** no introducir una convención global de eventos con template literals sin un problema de tipado demostrado. Mantener como línea de investigación P4.

## 3. `noUncheckedIndexedAccess`

Prueba ejecutada sobre `packages/core` (solo typecheck, sin cambios):

```
npx tsc --noEmit --noUncheckedIndexedAccess -p tsconfig.json
```

Resultado: **689 errores** (657 en código de producción, 32 en tests).

Los errores son en su mayoría accesos a arrays/records indexados (`arr[i]`, `map[key]`) que ahora se consideran `T | undefined`. Corregirlos requeriría narrowing sistemático en hot paths de simulación (GridPathfinding, snapshots, storage).

**Recomendación:** adopción incremental por paquete, empezando por `packages/core` con un baseline de errores y reducción gradual. No habilitar globalmente sin planificación.

## 4. Zod en boundaries de server

Inspección de `server/src`: `BaseRoom`, `AsteroidsRoom`, `SpaceInvadersRoom`, `GeometryWarsRoom` ya usan `zod` (`safeParse`) para opciones de sala, frames de input y joins. Cobertura parcial pero presente en el límite de confianza.

**Recomendación:** completar schemas para payloads de snapshot/delta si se exponen al cliente; mantener el patrón actual.

## 5. Eliminación de casts en módulos de alto riesgo

Módulos con casts restantes en producción (tras Fases 1–4):
- `src/games/shared/rendering/SharedVFX.ts`: 5 (`as unknown` en `SkiaCanvasOps`)
- `src/games/geometrywars/scenes/GeometryWarsGameScene.ts`: 9
- `packages/renderer-canvas/src/CanvasRenderer.ts`: 7
- `packages/core/src/physics/systems/PlatformerMovementSystem.ts`: 5
- `packages/core/src/runtime/NullBaseGame.ts`: 0 (completado en F2)
- `packages/gameplay-kit/src/combat/systems/CombatSystem.ts`: 1 (cast a `Parameters<...>` en `addComponent`, no contabilizado)

Cada uno requiere investigación individual (F3 demostró que algunos casts son necesarios por varianza de contexto).

## 6. Conclusión de Fase 5 (medida)

Los resultados medidos en `FASE5_CIERRE.md` refinan la conclusión original:

- **Branded types (`EntityId`):** descartado. Spike arrojó 1689 errores (umbral < 40); muestreo de 40 no encontró ninguna mezcla real de id/índice. El ECS ya distingue `Entity` (empaquetado) del índice de storage vía `packEntity`/`unpackEntityIndex`, pero tiparlo como brand tiene coste prohibitivo.
- **`emitDeferred`:** ya es genérico sobre `CombinedEvents<TEvents>`; la afirmación original era falsa. El riesgo real son los casts a `EventBus` no genérico en 8 call sites (no corregidos).
- **`noUncheckedIndexedAccess`:** 689 errores en core (657 producción). Muestreo de 30: ~1–2 potenciales bugs reales, ~24 invariantes no vistas, ~2 SoA storage, ~2 otros. Recomendación: dejar apagado en core; candidato incremental: `network` (18 errores).
- **Zod en server:** presente en opciones/joins/input; `start_game`, `metrics`, `jump`, `move`, `sync_tick` no validados (no se añadieron schemas).
- **Casts:** el ratchet cuenta solo `as any`/`as unknown`; las aserciones a tipos concretos (`as Parameters<...>`, `as HealthComponent`, etc.) no se contabilizan. Recuento total por AST en los 5 módulos de la tabla: 15, 30, 22, 18, 24 (frente a 0, 5, 9, 7, 5 del ratchet).

**Conclusión revisada:** la mayoría de mejoras opcionales no tienen evidencia suficiente para una refactorización inmediata; la excepción es `noUncheckedIndexedAccess` en `network` (coste bajo) y el endurecimiento de `EventBus` genérico en los call sites con cast (coste medio). Ambas quedan como tareas futuras.
EOF
echo done