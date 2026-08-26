# 🔬 Informe de Auditoría de Arquitectura del Motor Narrativo (StoryRuntime & Story UI)

**Rol:** Principal Software Engineer
**Fecha:** 21 de mayo de 2025
**Módulo Auditado:** `@tiny-aster/core` (`packages/core/src/story/`) & `src/hooks/useStoryRuntime.ts` & `src/app/blindstation/`

---

## 1. Resumen Ejecutivo y Estado General

Se ha completado una auditoría exhaustiva de arquitectura sobre el subsistema narrativo de **Tiny Aster Engine**, respondiendo a los puntos de diagnóstico 9 a 13 del análisis de arquitectura del motor.

Todos los puntos señalados han sido verificados, probados e integrados con éxito en la suite de pruebas del proyecto y el pipeline CI (`pnpm run ci`).

---

## 2. Diagnóstico Detallado y Resoluciones de Arquitectura

### Punto 9: Evaluación de Condiciones de Objetivos (`StoryCondition` tipo `"objective"`)
- **Diagnóstico:** Anteriormente, las condiciones de tipo `"objective"` solo comprobaban la bandera `obj.completed` de forma binaria, ignorando los campos `operator` y `value`. Esto impedía definir condiciones como `value: false` (evaluar si un objetivo *no* está completado).
- **Resolución:** `StoryRuntime.evaluateCondition` se ha actualizado para evaluar explícitamente `operator` y `value` utilizando la función genérica de comparación:
  ```ts
  case "objective": {
    if (!condition.key) return false;
    const obj = this.state.objectives[condition.key];
    const completed = obj ? obj.completed : false;
    const targetVal = condition.value !== undefined ? condition.value : true;
    return this.compareValues(completed, targetVal, condition.operator || "==");
  }
  ```
- **Verificación:** Test suite `StoryRuntimeExtended.test.ts` valida que una condición con `value: false` devuelva `true` cuando el objetivo está incompleto y `false` tras su finalización.

### Punto 10: Desacoplamiento de Variables vs. Registro de Evidencias (`variables.evidence` vs `state.evidence`)
- **Diagnóstico:** Se identificó un riesgo de colisión entre el uso de variables numéricas llamadas `"evidence"` / `"evidenceCount"` en historias interactivas y las notificaciones automáticas de `discoverEvidence`.
- **Resolución:**
  1. `StoryRuntime.setVariable` restringe la auto-descubrimiento únicamente a claves con el prefijo formal `evidence:<id>` y valor booleano `true`:
     ```ts
     if (key.startsWith("evidence:") && value === true) {
       this.discoverEvidence(key.slice(9));
     }
     ```
  2. `BlindStation.ts` utiliza la variable formal `"evidenceCount"` para el contador numérico de pistas encontradas.
  3. `BlindStationScreen` (`src/app/blindstation/index.tsx`) lee primeramente `"evidenceCount"` con fallback a `"evidence"`.
- **Verificación:** Prueba unitaria confirma que `setVariable("evidence", 3)` no altera `state.evidence`, preservando la separación estricta entre contadores numéricos y la colección de IDs de evidencia narrativa.

### Punto 11: Clonado Seguro de Estado sin `JSON.stringify` (`cloneStoryState`)
- **Diagnóstico:** La implementación de `getState()` basada en `JSON.parse(JSON.stringify(...))` presentaba degradación de rendimiento por recolección de basura y corrupción de valores especiales (`undefined`, `NaN`, `Infinity`).
- **Resolución:** Se introdujo la función pura `cloneStoryState(state: StoryState)` en `StoryRuntime.ts`, realizando una clonación profunda estructurada que preserva tipos especiales sin coste de serialización JSON.

### Punto 12: Cumplimiento del Contrato de `useSyncExternalStore` en `useStoryRuntime`
- **Diagnóstico:** `useSyncExternalStore` exige que `getSnapshot` devuelva la misma referencia de objeto entre llamadas si el estado no ha cambiado (`Object.is`).
- **Resolución:** `useStoryRuntime` en `src/hooks/useStoryRuntime.ts` utiliza un `cacheRef` que compara `runtime`, la versión incremental del estado (`runtime.getVersion()`), y la referencia de `currentNode`. Cuando ninguno de estos ha cambiado, re-utiliza exactamente la misma referencia de objeto `snapshot`:
  ```ts
  if (
    cacheRef.current.runtime === runtime &&
    cacheRef.current.version === currentVersion &&
    cacheRef.current.currentNode === currentNode
  ) {
    return cacheRef.current.snapshot;
  }
  ```
- **Verificación:** Suite `useStoryRuntime.test.ts` en `tsx --test` valida la estabilidad referencial entre invocaciones consecutivas sin cambios de estado.

### Punto 13 & Confirmación Punto 7: Sincronización de Nodo y Reinicio Síncrono (`CYOAScene` & `handleRestart`)
- **Diagnóstico:** Se analizó el riesgo de desincronización entre el nodo actual de `CYOAScene` y `StoryRuntime`, así como la carrera de reinicio en `handleRestart`.
- **Análisis y Resolución:**
  1. `CYOAScene.restart()` invoca síncronamente `this.runtime.loadGraph(graph, true)`, el cual ejecuta `navigateToNode(graph.entryNodeId)` y emite `story:state_changed` y `story:node_changed` en el mismo tick síncrono.
  2. Para reiniciar por completo las variables y banderas en partidas interactivas, `handleRestart` en `BlindStationScreen` invoca `bootstrapBlindStation(runtime)` antes de `sceneRef.current.restart()`. Esta llamada no es redundante, sino esencial para re-establecer el diccionario inicial de variables a cero.

---

## 3. Estado de la Suite de Pruebas y Pipeline CI

| Verificación | Comando | Resultado |
|---|---|---|
| **Core Boundaries** | `pnpm check:core-boundaries` | ✅ Clean (Sin violaciones) |
| **Typecast Ratchet** | `pnpm check:ratchet` | ✅ Baseline respetado |
| **Story Linting** | `pnpm story:lint` | ✅ 6 grafos auditados, 0 errores |
| **API Extractor Check** | `pnpm docs:check` | ✅ Snapshot `asteroides.api.md` al día |
| **Typecheck App** | `pnpm typecheck:app` | ✅ Compilación TypeScript 0 errores |
| **Jest Story Tests** | `pnpm exec jest ...` | ✅ Pass (StoryRuntime, BlindStation, CYOA) |
| **Node Hook Tests** | `pnpm exec tsx --test` | ✅ Pass (`useStoryRuntime.test.ts`) |

---

## 4. Conclusión

El motor narrativo (`StoryRuntime`), la escena interactiva `CYOAScene`, el hook React `useStoryRuntime` y la demo `BlindStation` cuentan con una base de arquitectura determinista, de alto rendimiento y robusta en tipos, cumpliendo los estándares de ingeniería de **Tiny Aster Engine**.
