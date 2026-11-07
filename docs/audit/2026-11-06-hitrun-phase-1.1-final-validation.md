# Hit & Run — Fase 1.1: final validation ledger

Fecha: 6 de noviembre de 2026  
Alcance: PR6–PR10, integridad de oleadas, hit reactions, death recovery y regresión web.

## Estado de integración

| PR | Alcance | Estado observado |
| --- | --- | --- |
| [#1133](https://github.com/xavirodriguez/ArcadeGames/pull/1133) | PR6 — Wave Integrity | Fusionada en `master`; merge commit `f2e6f398ee5d9f7989cd66264b95b6ba0496908c` |
| [#1134](https://github.com/xavirodriguez/ArcadeGames/pull/1134) | PR7 — Hit Reaction | Fusionada en la rama de integración `fix/hitrun-wave-lifecycle-integrity`; el código se incluye en la rama acumulativa de PR9, pero no se fusionó directamente en `master` |
| [#1135](https://github.com/xavirodriguez/ArcadeGames/pull/1135) | PR8 — Death Recovery | Fusionada en la rama de integración `fix/hitrun-wave-lifecycle-integrity`; el código se incluye en la rama acumulativa de PR9, pero no se fusionó directamente en `master` |
| [#1136](https://github.com/xavirodriguez/ArcadeGames/pull/1136) | PR9 — Gameplay E2E | Abierta contra `master`; contiene PR7/PR8 más los escenarios E2E y el hook de observabilidad |

Las PR apiladas 7 y 8 se integraron en la rama de trabajo que ya había aportado PR6. La PR9 se retargeteó a `master` porque los workflows del repositorio filtran los eventos `pull_request` para las ramas destino `master` y `develop`. La rama de PR9 contiene los commits acumulados y permite ejecutar la CI sobre el conjunto completo. Mantener el orden de integración documentado; no fusionar PR9 antes de revisar sus checks.

## Contratos y cobertura añadida

### PR6 — Wave Integrity
- El gate requiere timeline de spawn completo y cero enemigos vivos asignados a la sección actual.
- Una pausa entre eventos temporizados, un stagger pendiente o el delay de un script `loop` no abren la barrera.
- El ownership de sección existente se conserva y se prueba el reciclado del pool.
- El cleanup deja de inferir la validez del enemigo a partir del tamaño de Render.
- Pruebas: gaps entre eventos, stagger pendiente, loop delay, enemy de otra sección, pool recycling y enemigo pequeño con collider válido.

### PR7 — Hit Reaction
- El knockback se amortigua con `0.85 ^ (dt * 60)`, preservando la curva antigua a 60 Hz y evitando que el resultado cambie con la frecuencia de actualización.
- La FSM no debe escribir steering mientras el HitReaction lock está activo; vuelve a conducir al expirar el lock.
- Pruebas: equivalencia 30/60 Hz, retención de referencia, interrupción y recuperación de charger.

### PR8 — Death Recovery
- `TimeScale` se escribe como el objeto que consume el scheduler, no como un número.
- El countdown usa delta no escalado de un sistema `runsWhileFrozen`; no divide otra vez por el multiplicador.
- `IsPaused` suspende el timer.
- Los eventos letales repetidos y obsoletos no multiplican el contador ni reinician el flujo.
- Pruebas: escala 0.28, ventana 450 ms, duplicados/obsoletos y pause/resume.

### PR9 — Gameplay E2E
- El hook `window.__hitAndRunDebug` es de solo lectura y solo se instala con `EXPO_PUBLIC_E2E_HOOKS=true` en web.
- El modo E2E presenta el canvas aunque la pantalla de producción mantenga el menú antes de pulsar START.
- Playwright verifica carga/movimiento, separación melee/fire, enemigos vivos y combat-capable al terminar el timeline, y dos ciclos de muerte/slow-motion/restart.
- Tras el primer restart verifica que el nuevo World vuelve a aceptar input.

### PR10 — Determinism & closure evidence
- `HitRunWaveDeterminism.test.ts` reproduce el mismo guion a 30 Hz y 60 Hz con igual tiempo simulado y compara el stream completo de spawns y el estado del director.
- Es una prueba de determinismo del director y las posiciones de spawn; no pretende afirmar equivalencia byte-a-byte de todo el ECS, recursos de presentación o simulación completa.

## Comandos de validación confirmados en package.json

Los siguientes scripts existen en el repositorio:

```bash
pnpm run typecheck:core
pnpm run typecheck:app
pnpm run test:games:ci
pnpm run test:e2e
pnpm run check:core-boundaries
pnpm run check:input-contract
pnpm run check:game-patterns
```

La CI de `.github/workflows/ci.yml` además ejecuta build, lint, typecheck y tests mediante Turborepo, guardrails de agentes, documentación, benchmark de input, `test:games:ci` y `typecheck:app`. `.github/workflows/e2e.yml` ejecuta `pnpm test:e2e`; `.github/workflows/docs.yml` construye la referencia API.

## Evidencia de CI y despliegue — estado al crear este ledger

- PR6, commit `c542ad3b08d094dc3b031e89816c8a357c3585fd`: los checks `Continuous Integration`, `Playwright E2E` y `Build API Reference` aparecían `queued`, sin conclusión.
- PR9, commit `547879cc1442cf8b4186ff357ea7c04581af088b`, destino `master`: esos mismos tres checks aparecían `queued`, sin conclusión. PR9 es el run relevante para validar juntos los cambios acumulados de PR7/PR8/PR9 sobre la base que contiene PR6.
- Los commits originales de PR7 y PR8 no mostraban checks de Actions; sus ramas destino no coincidían con los filtros de workflows. Por eso se retargeteó PR9 a `master`.
- El status provider de Vercel mostraba `failure` para los commits originales de PR6, PR7, PR8 y también para el head de PR9. Los detalles están en:
  - [Vercel PR6](https://vercel.com/javis-projects-0a2bd667/asteroides-server/CCWSdym36aVmDsJKmnibbXRWsEFa)
  - [Vercel PR7](https://vercel.com/javis-projects-0a2bd667/asteroides-server/9ZmCDnn7vDF3FyWvJisfTpEde9Yb)
  - [Vercel PR8](https://vercel.com/javis-projects-0a2bd667/asteroides-server/FkUq1qiTJPBoE6u949ibHfB3Ur6K)
  - [Vercel PR9](https://vercel.com/javis-projects-0a2bd667/asteroides-server/EgJvEyrT4dDi9VDmoBU1z792YepT)
- El check `Vercel Preview Comments` en GitHub aparecía `success`, pero es distinto del status de deployment Vercel y no invalida el fallo del despliegue.
- No se han ejecutado localmente Jest, Playwright ni typechecks en esta sesión. La integración se ha hecho mediante GitHub; no dispongo de un runner local del checkout para ejecutar los comandos.

## Criterio de cierre

La Fase 1.1 **no se declara validada todavía**. Antes de cerrar:
1. Esperar a que CI, Playwright E2E y Build API Reference del head acumulativo de PR9/PR10 terminen, y resolver cualquier fallo.
2. Inspeccionar el log de Vercel y decidir si el fallo es de build, configuración o entorno; no considerarlo resuelto por el check de comentarios.
3. Ejecutar/confirmar las suites Hit & Run y el regresivo `test:games:ci`, los dos typechecks y el E2E de dos ciclos de muerte.
4. Revisar los resultados y el diff final en el orden PR9 → PR10 tras incorporar PR7/PR8 desde la rama de integración.

Este documento registra evidencia y pendientes. No es una certificación de CI verde ni una autorización para fusionar sin los resultados anteriores.
