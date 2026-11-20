# Hit & Run E2E — Plan de acción

Origen: informe de fallos de `e2e/hitandrun.spec.ts` (4 tests, 1 worker, sin GPU).
Objetivo: eliminar el bug común de mutación estructural, estabilizar el contrato de input y desacoplar los E2E del tiempo real/CI.

## 0. Evidencia primero (no cambiar código aún)

1. Ejecutar con traza para capturar el stack de `createEntity`:
   ```bash
   pnpm exec playwright test e2e/hitandrun.spec.ts --trace on
   ```
2. Añadir temporalmente en los 4 tests:
   ```ts
   page.on("pageerror", (e) => console.log("PAGEERROR_STACK", e.stack));
   ```
   y verificar si la excepción se reporta vía `GameLoop`/`subscribeError` (no siempre como `pageerror`).
3. Confirmar hipótesis: si el stack apunta a un spawn de oleada o a la creación del jugador en restart, se valida "un solo bug, no tres".

## 1. Corregir la causa común: mutación estructural durante `World.update`

**Regla:** ningún sistema puede llamar `world.createEntity()` (ni `activateEntity`/`removeEntity`) directamente dentro de `update`. Debe usar `world.reserveEntityId()` + `world.commands.createEntity(id)` (o `world.commands.spawnFromBlueprint*`).

Archivos a auditar (ya usan el patrón correcto en la mayoría de casos, verificar los que no):

- `src/games/hitandrun/pow/HitRunPowSystem.ts` — `grantPowDrop` (pickup creation).
- `src/games/hitandrun/ai/enemyShoot.ts` — `spawnFallbackEnemyBullet`.
- `src/games/hitandrun/ai/telegraphedAttackHelpers.ts` — `spawnHitRunCombatCue`.
- `src/games/hitandrun/waves/HitRunEnemyPool.ts` — `prewarm` y `acquireEnemy` (rama `isUpdating`).
- `src/games/shared/rendering/SharedVFX.ts` — `spawnExplosion` y equivalentes.
- `src/games/shared/rendering/JuiceOrchestrator.ts` — creación de entidades de efecto.

Pasos:

1. Localizar la llamada directa con el stack del paso 0.
2. Sustituirla por el patrón `reserveEntityId` + `world.commands.createEntity` (o `world.commands.spawnFromBlueprintForEntity` si usa blueprint).
3. Asegurar que la adición de componentes posterior también pase por `world.commands.addComponent` cuando `world.isUpdating`.
4. Añadir guardia de regresión: un test (Jest o E2E) que invoque el sistema en modo `isUpdating` y falle si se lanza `Direct structural mutation`. Reutilizar el guard existente de `World.checkUpdatingMutation`.

**Criterio de salida:** tests 2 y 3 (spawn timeline / restart) pasan tras este cambio; si no, investigar bugs independientes.

## 2. Corregir el contrato de `fireHeld`

Problema: el bridge de input solo escribe `fireHeld` cuando `input.fire !== undefined`, dejando la clave ausente en estados parciales y generando `undefined` en consumidores.

Cambios:

- `src/games/hitandrun/belt/mutateBeltInputState.ts`: inicializar siempre `c.fireHeld = !!input.fire` (y mantener `attackHeld` coherente) en lugar de escribir solo si está definido. No tocar el test para usar `toBeFalsy()`: el test debe seguir comprobando independencia estricta melee/fuego.
- Verificar inicialización en `createBeltInputComponent()` (`fireHeld: false` ya existe) y en `HitRunWeaponSystem` (`fireHeld?: boolean` → tratar como `false`).
- `src/app/hitandrun/index.tsx` `getCombatInput`: ya normaliza con `!!`, mantener.

**Criterio de salida:** `(await readCombatInput(page))?.fireHeld` es siempre `boolean`, nunca `undefined`, en los 3 intentos del test.

## 3. Eliminar el tiempo real de los tests E2E

Problema: polls de 22 s dependen de la velocidad real del runner; en CI con 1 worker y canvas sin GPU la timeline puede no completar.

Cambios:

1. Exponer un hook de test determinista (ej. `window.__test.step(n)`) cuando `EXPO_PUBLIC_E2E_HOOKS=true`, que avance `n` ticks del timestep fijo (1/60 s) sin depender de `requestAnimationFrame`.
2. Reemplazar los `expect.poll(..., { timeout: 22000 })` de `hitandrun.spec.ts` por avances deterministas con `window.__test.step(n)` + aserciones síncronas.
3. (Alternativa barata, solo si no se toca el motor) `test.slow()` o subir timeout en CI; esto tapa el síntoma, no la causa.

**Criterio de salida:** los tests de spawn timeline no usan timeouts > 5 s y son reproducibles en CI.

## 4. Poner en cuarentena los 3 tests problemáticos (temporal)

- Marcar con `test.fixme(...)` o tag `@quarantine`:
  ```ts
  test("...", { tag: "@quarantine" }, async ({ page }) => { ... });
  ```
- Ejecutar el job principal con:
  ```bash
  pnpm exec playwright test --grep-invert @quarantine
  ```
- Mantener la lista visible en este documento y en el código (comentario `// QUARANTINED: ...`).

**Criterio de salida:** el build principal queda verde con los 24 tests buenos; los 3 pendientes siguen visibles.

## 5. Sacar los E2E de Hit&Run del camino crítico en GitHub

- Mover `hitandrun.spec.ts` a un job aparte con `continue-on-error: true`, o quitarlo de los required checks de la rama.
- No usar `|| true` en el script: ocultaría fallos futuros de los otros 24 tests.
- Mantener el fallo visible en el workflow (job amarillo/rojo no bloqueante).

## 6. Validación final

Ejecutar (y reportar los que no se puedan correr):

```bash
pnpm run check:agent-guardrails
pnpm run ci
NODE_OPTIONS="--max-old-space-size=4096" pnpm exec jest --runInBand src/games/hitandrun
pnpm exec playwright test e2e/hitandrun.spec.ts --grep-invert @quarantine
```

## Orden recomendado

1. Evidencia (paso 0) → 2. Fix createEntity → 3. Re-ejecutar E2E → 4. Si verde, quitar cuarentena → 5. Fix fireHeld → 6. Hook determinista → 7. Ajustar CI.

## Notas

- No ocultar fallos con casts, fallbacks silenciosos, tests saltados o transformaciones Jest amplias.
- Cada fallo recurrente debe dejar una regresión (test, regla estática o check de CI).
- `asteroides` es identificador legacy del workspace; no renombrar.
