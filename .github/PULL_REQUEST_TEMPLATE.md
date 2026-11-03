## Descripción / Description

<!-- Describe el problema, la causa raíz y el resultado esperado. -->

## Causa raíz y prevención

- **Causa raíz confirmada:**
- **Frontera/contrato afectado:**
- **Prueba de regresión o guarda añadida:**
- **Productores y consumidores revisados:**

## Checklist de Arquitectura y Buenas Prácticas

- [ ] He leído `AGENTS.md` y `docs/agents/OPERATING_CONTRACT.md`.
- [ ] He comprobado la implementación y el contrato canónico; no he inferido el contrato a partir del síntoma.
- [ ] He revisado los productores, consumidores, serializadores/adaptadores y backends afectados.
- [ ] He añadido o reforzado una prueba de regresión o una guarda ejecutable.
- [ ] He actualizado los ledgers/documentación cuando cambia un contrato o una regla.
- [ ] Determinismo: he usado `runWithUnlockedRandomAndMutators` cuando corresponde.
- [ ] Colisionadores: he reutilizado `createPaddleColliderConfig` cuando corresponde.
- [ ] Pooling: he evaluado `SharedEntityPool` para proyectiles/partículas en hot paths.
- [ ] Tests: he registrado la configuración Jest del juego cuando corresponde.
- [ ] No he ocultado el problema con casts, mocks globales, silent fallbacks ni tests omitidos.

## Verificación ejecutada

| Comando | Resultado |
| --- | --- |
| `pnpm run check:agent-guardrails` | <!-- PASS / FAIL / NOT RUN + motivo --> |
| `pnpm run ci` | <!-- PASS / FAIL / NOT RUN + motivo --> |
| `pnpm run test:ci` o suites específicas | <!-- PASS / FAIL / NOT RUN + motivo --> |
| Validaciones específicas (sprites, Canvas/Skia, E2E, etc.) | <!-- PASS / FAIL / NOT RUN + motivo --> |

<!-- No marques como PASS un comando que no se haya ejecutado. -->
