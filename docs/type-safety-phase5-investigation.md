# Fase 5 — Investigación de mejoras opcionales de tipos (P4)

> Estado: **cerrada**. Fase de investigación, no de refactorización obligatoria; no se
> realizaron cambios de código de producción. Las mediciones y el cierre de la rama
> `chore/tipos-fase5` se archivaron en `docs/HISTORICAL_RECORD.md` §1. No reabrir estas
> conclusiones sin una evidencia nueva.

## Conclusión vigente

| Opción | Resultado | Por qué no se adoptó |
| --- | --- | --- |
| Branded types (`EntityId`) | Descartado | El spike dio 1689 errores en la rama temporal `temp/entity-brand`. El ECS ya distingue `Entity` (empaquetado) del índice de storage con `packEntity` / `unpackEntityIndex`. |
| `emitDeferred` con `string` | Premisa falsa | Ya es genérico sobre `CombinedEvents<TEvents>`, igual que `emit`, `on`, `once` y `off`. |
| `noUncheckedIndexedAccess` en core | No aplicado | 689 errores (657 en producción). Queda como candidato incremental en `network` (18 errores). |
| Template literal types para eventos | No introducido | El registro ya valida el payload; el coste de cambiar firmas supera el beneficio. |
| Zod en server | Patrón ya presente | `BaseRoom`, `AsteroidsRoom`, `SpaceInvadersRoom` y `GeometryWarsRoom` ya usan `safeParse` en opciones, input y joins. |
| Eliminación de casts | Parcial | El ratchet mide `as any`/`as unknown` (832); las aserciones a tipos concretos no se contabilizan. Algunos casts son necesarios por varianza de contexto (ver F3). |

## Riesgo real pendiente (no confundir con lo anterior)

Existen casts a `EventBus` no genérico que borran el registro y permiten nombres
arbitrarios. Aparición documentada en `BaseGameStateSystem`, `CombatSystem`,
`SpawnDirectorSystem`, `AchievementSystem`, `HitRunCombatSystem` y
`StoryDirectorSystem`. Endurecerlos exigiría constreñir `TEvents` en esos sistemas;
está fuera del alcance de la fase cerrada.

## Fuentes

- `docs/HISTORICAL_RECORD.md` §1 — cierre de fase, mediciones completas y texto original.
- `docs/agents/types-ledger.md` — contratos de tipos protegidos por CI.
- `docs/TECHNICAL_DEBT_RATCHETS.md` — baselines y objetivos de reducción de casts.
