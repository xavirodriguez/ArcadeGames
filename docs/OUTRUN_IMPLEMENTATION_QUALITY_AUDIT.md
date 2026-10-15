# Auditoría integral de calidad — Out Run × JavaScript Racer

## A. Resumen ejecutivo

- **Estado global:** **FAIL**

El estado de la implementación actual de Out Run tras las cinco sesiones de evolución es **FAIL**. Aunque los fundamentos matemáticos de la proyección (`RoadProjection.ts`), las funciones puras de easing (`RoadStretch.ts`), las definiciones de paleta/fog (`OutrunPalettes.ts`, `OutrunFog.ts`), el steering de tráfico (`TrafficSteering.ts`) y la seguridad del runtime (`RuntimeSafety.test.ts`) están bien diseñados e implementados, la rama principal (`master`) presenta una regresión crítica **P0** introducida en el merge del PR #738:

1. **Destrucción de los drawers de renderizado (P0):** Los archivos `src/games/outrun/rendering/OutrunCanvasVisuals.ts` y `src/games/outrun/rendering/OutrunSkiaVisuals.ts` fueron subidos al repositorio con únicamente la cadena literal `"SEE_LOCAL"`. Esto rompe por completo la verificación de tipos del proyecto (`pnpm run typecheck:app` falla con 14 errores de compilación) e impide la ejecución de la suite de integración de gameplay (`OutrunGameplay.test.ts` se cae con `ReferenceError: SEE_LOCAL is not defined`).
2. **Parche de integración huérfano (P1):** El parche de la Sesión 3 (`docs/session3_renderers.patch`) que integra el fog unificado en Canvas y Skia quedó abandonado en la carpeta `docs/` sin haberse aplicado sobre la base de código.
3. **Suite de regresión en rojo:** Al ejecutar `pnpm exec jest src/games/outrun`, **3 de las 6 suites de pruebas fallan**. Además del crash en `OutrunGameplay.test.ts`, existen fallos de assertions en `TrafficSteering.test.ts` y `RoadStretch.test.ts` causados por comparaciones estrictas de ceros negativos IEEE 754 (`-0` frente a `0`).

No se han realizado modificaciones en el código de producción ni en los tests durante esta auditoría, respetando las reglas establecidas.

---

## B. Matriz de resultados por sesión

| Sesión | Criterios obligatorios | Estado | Evidencia principal | Pendientes |
|---|---|---|---|---|
| **1. Geometría y oclusión** | H1–H5 y fixtures | **FAIL** | `RoadProjection.ts` implementa H1 (near-plane clip geométrico), H2 (oclusión por colinas vía `maxy`), H3 (clipping de sprites) y H4 (continuidad boundary por `basePercent`), pasando `RoadProjection.test.ts`. Sin embargo, H5 y la implementación de los drawers están destruidos en `master` por el marcador `"SEE_LOCAL"`. | Restaurar `OutrunCanvasVisuals.ts` y `OutrunSkiaVisuals.ts` desde la versión previa funcional y aplicar el parche de renderers. |
| **2. Stretch builder** | Easing, integración y determinismo | **PARTIAL** | `RoadStretch.ts` implementa `easeIn` ($t^2$) y `easeInOut` (coseno) puros y deterministas, horneados en `generateRoad()` (`OutrunGame.ts`). Elevación easing (T2.1c) diferida con justificación documentada. | Corregir la assertion en `RoadStretch.test.ts` para tolerar `-0` frente a `0` en comparaciones `toEqual`. |
| **3. Paleta y fog** | Fuente compartida y paridad | **PARTIAL** | `OutrunPalettes.ts` y `OutrunFog.ts` ofrecen decisiones compartidas de paleta por escenario y fog `smoothstep` sin umbral duro, pasando `OutrunFog.test.ts`. | Aplicar `docs/session3_renderers.patch` para integrar `resolveSegmentFog` en los drawers reales (actualmente bloqueados por `"SEE_LOCAL"`). |
| **4. Tráfico** | Steering, centrífuga y colisiones | **PARTIAL** | `TrafficSystem.ts` y `TrafficSteering.ts` implementan steering lookahead O(N²), centrífuga $-(curve \cdot centrifugalForce \cdot speedRatio^2 \cdot dt)$ y colisión por substeps en coordenadas de carrera ($z$, lateralX). | Ajustar la assertion de `centrifugalDelta` en `TrafficSteering.test.ts` para evitar el fallo por `-0`. |
| **5. Runtime/performance** | Avance seguro, baseline y regresión | **FAIL** | `RoadAdvanceSystem.ts` usa `findSegmentIndexAtZ` seguro ante saltos multi-segmento. `collisionSubstepsForFrame` calcula substeps adaptativos (4 a 32) para `maxDelta` 0.25s (pasa `RuntimeSafety.test.ts`). Sin embargo, la suite global de Out Run falla (3/6 suites en rojo) y faltan métricas e2e en dispositivo real. | Restaurar el código de los drawers para habilitar el build y la ejecución de la suite de regresión completa. |

---

## C. Hallazgos técnicos

### [P0] Archivos de drawers de renderizado sustituidos por el marcador literal `"SEE_LOCAL"` en master (PR #738)
- **Sesión / Criterio:** Sesión 1 (H5), Sesión 3 (Paridad Canvas/Skia), Sesión 5 (Build y regresión).
- **Estado de evidencia:** **Verified** (`pnpm run typecheck:app`, `pnpm exec jest src/games/outrun`, `read_file`).
- **Archivo / Línea:** `src/games/outrun/rendering/OutrunCanvasVisuals.ts:1`, `src/games/outrun/rendering/OutrunSkiaVisuals.ts:1`.
- **Comportamiento observado:** Ambos archivos contienen únicamente el texto `"SEE_LOCAL"`. La comprobación de tipos `pnpm run typecheck:app` falla con 14 errores `TS2305` y `TS2304`. La prueba de integración `OutrunGameplay.test.ts` se interrumpe inmediatamente con `ReferenceError: SEE_LOCAL is not defined`.
- **Comportamiento esperado:** Ambos archivos deben exportar los drawers completos de renderizado (`drawOutrunRoad`, `drawOutrunCar`, `drawOutrunRacer`, `drawOutrunHud`, y sus equivalentes `drawSkiaOutrun*`).
- **Impacto:** El juego Out Run no se puede compilar ni renderizar en runtime (en Canvas2D ni en Skia), y la suite de pruebas de gameplay no puede ejecutarse.
- **Recomendación:** Restaurar las versiones funcionales de `OutrunCanvasVisuals.ts` y `OutrunSkiaVisuals.ts` desde el commit previo (`811556d7166`) y aplicar el parche `docs/session3_renderers.patch`.

### [P1] Parche de integración de fog y renderers de la Sesión 3 abandonado en `docs/session3_renderers.patch`
- **Sesión / Criterio:** Sesión 3 (T3.1 y T3.3 Fog y paridad de paletas).
- **Estado de evidencia:** **Verified** (`read_file docs/session3_renderers.patch`).
- **Archivo:** `docs/session3_renderers.patch`.
- **Comportamiento observado:** El archivo `docs/session3_renderers.patch` contiene las modificaciones requeridas para conectar `resolveSegmentFog` dentro de `drawOutrunRoad` y `drawSkiaOutrunRoad`, pero el parche no fue aplicado sobre el árbol de trabajo antes de realizar los commits de las sesiones posteriores.
- **Comportamiento esperado:** La lógica de fog unificada definida en `OutrunFog.ts` debe estar directamente integrada dentro de los drawers Canvas y Skia.
- **Impacto:** Aunque las funciones auxiliares de fog existen y pasan sus unit tests (`OutrunFog.test.ts`), la mejora visual de fog unificado no está activa en los renderers del juego.
- **Recomendación:** Tras restaurar las versiones de producción de los drawers, ejecutar `patch -p1 < docs/session3_renderers.patch`.

### [P2] Fallo de assertion en `TrafficSteering.test.ts` por discrepancia de cero negativo (`-0`) en `centrifugalDelta`
- **Sesión / Criterio:** Sesión 4 (T4.3 Fuerza centrífuga).
- **Estado de evidencia:** **Verified** (`pnpm exec jest src/games/outrun/__tests__/TrafficSteering.test.ts`).
- **Archivo / Línea:** `src/games/outrun/__tests__/TrafficSteering.test.ts:138`.
- **Comportamiento observado:** En el test `it("is zero on a straight (curve = 0)")`, la invocación `centrifugalDelta(0, maxSpeed, maxSpeed, force, dt)` evalúa la expresión `-(0 * force * ...)` que retorna `-0`. Jest evalúa `expect(-0).toBe(0)` usando `Object.is(-0, 0)`, resultando en `false` y haciendo fallar el test.
- **Comportamiento esperado:** La prueba debe pasar al confirmar que la fuerza centrífuga en un tramo recto es cero.
- **Impacto:** Falso positivo de fallo en la suite de pruebas unitarias de tráfico y centrífuga.
- **Recomendación:** En la implementación de `centrifugalDelta`, normalizar el retorno (`val === 0 ? 0 : val`), o bien actualizar la assertion en el test a `expect(d).toBeCloseTo(0)`.

### [P2] Fallo de assertion en `RoadStretch.test.ts` por comparación de `-0` vs `0` en simetría de `buildEasedCurveStretch`
- **Sesión / Criterio:** Sesión 2 (Easing y Stretch Builder).
- **Estado de evidencia:** **Verified** (`pnpm exec jest src/games/outrun/__tests__/RoadStretch.test.ts`).
- **Archivo / Línea:** `src/games/outrun/__tests__/RoadStretch.test.ts:87`.
- **Comportamiento observado:** En el test `it("symmetric left/right sign")`, `expect(left).toEqual(right.map((c) => -c))` falla en el primer índice (0) porque `left[0]` vale `-0` (producto de `easeIn(0, -3, 0)` -> `(-3) * 0`), mientras que `right.map(...)` produce `0`. La comparación estricta de Jest `toEqual` diferencia `-0` de `0`.
- **Comportamiento esperado:** La prueba debe verificar la simetría entre tramos a izquierda y derecha sin fallar por signo en el cero.
- **Impacto:** Falso positivo de fallo en la suite de pruebas del generador de tramos con easing.
- **Recomendación:** Actualizar la assertion en `RoadStretch.test.ts` para mapear los elementos con `toBeCloseTo` o normalizar los ceros devueltos por `buildEasedCurveStretch`.

---

## D. Matriz de pruebas

| Comando / Procedimiento | Resultado Real | Estado | Invariante verificado | Limitaciones conocidas |
|---|---|---|---|---|
| `pnpm exec tsc -p tsconfig.json --noEmit` | 14 errores TypeScript (`TS2305`, `TS2304`) en `OutrunGame.ts`, `OutrunCanvasVisuals.ts`, `OutrunSkiaVisuals.ts` y `OutrunGameplay.test.ts`. | **FAIL** | Comprobación estricta de tipos e importaciones de la aplicación. | Bloqueado por la presencia del marcador `"SEE_LOCAL"` en master. |
| `pnpm exec jest src/games/outrun` | 3 suites falladas, 3 pasadas (51 tests pasados, 2 fallados, 1 crash de suite). | **FAIL** | Cobertura global de la suite de Out Run. | Crash de `OutrunGameplay.test.ts` por `"SEE_LOCAL"` y 2 fallos de ceros negativos. |
| `pnpm exec jest src/games/outrun/__tests__/RoadProjection.test.ts` | 5 passed, 0 failed. | **PASS** | Proyección 3D a 2D, near-plane clip, variaciones de colina/curva, wraparound y determinismo. | No ejercita los drawers de Canvas ni Skia. |
| `pnpm exec jest src/games/outrun/__tests__/RoadStretch.test.ts` | 10 passed, 1 failed. | **FAIL** | Endpoints de `easeIn`/`easeInOut`, monotonía y continuidad. | Fallo en test de simetría por `-0` en índice 0. |
| `pnpm exec jest src/games/outrun/__tests__/OutrunFog.test.ts` | 6 passed, 0 failed. | **PASS** | Fog smoothstep, tokens de cielo far por escenario, ausencia de blanqueo. | Evalúa funciones puras; no la invocación en los drawers de renderizado. |
| `pnpm exec jest src/games/outrun/__tests__/TrafficSteering.test.ts` | 16 passed, 1 failed. | **FAIL** | Steering lookahead O(N²), centrífuga, substeps de colisión y tunnel safety. | Fallo en test de centrífuga por `-0` en recta. |
| `pnpm exec jest src/games/outrun/__tests__/RuntimeSafety.test.ts` | 9 passed, 0 failed. | **PASS** | Substeps adaptativos para maxDelta 0.25s, `findSegmentIndexAtZ` O(N). | Benchmark sintético en entorno Node.js, no en dispositivo real. |
| `pnpm exec jest src/games/outrun/__tests__/OutrunGameplay.test.ts` | Crash (`ReferenceError: SEE_LOCAL is not defined`). | **FAIL** | Integración vertical: snapshot/restore, steering, aceleración, tráfico y fases. | Impedido de ejecutar por import de `"SEE_LOCAL"`. |
| `pnpm run check:game-patterns` | Passed (3/3 guards ok). | **PASS** | Sin unlock de `gameplayRandom` no autorizado, sin paddle collider duplicado, `jest.config.cjs` registrado. | No inspecciona el contenido sintáctico de los archivos de visualización. |

---

## E. Auditoría de determinismo y arquitectura

- **ECS como propietario del estado:** `RaceStateComponent`, `RoadRoot` y las entidades `Racer` gestionan el estado en el World ECS. Los sistemas `RoadAdvanceSystem` y `TrafficSystem` mutan el estado de gameplay exclusivamente a través de las APIs del World.
- **RNG Sembrado:** Todo el gameplay y la generación de pista consumen `world.gameplayRandom`. Durante la generación de la carretera en `generateRoad` y la creación inicial de entidades en `onInitializeEntities`, se utiliza `runWithUnlockedRandomAndMutators` adecuadamente.
- **Única fuente compartida de verdad geométrica:** `RoadProjection.ts` es la función pura utilizada por `OutrunRenderShared.ts` para proyectar segmentos en el buffer reutilizable `projectionBuffer`.
- **Separación estricta de coordenadas:** La simulación de gameplay se realiza en coordenadas de carrera ($z \in [0, trackLength]$, lateralX $\in [-2, 2]$). En ningún caso se introducen coordenadas de pantalla dentro de los sistemas ECS (`RoadAdvanceSystem`, `TrafficSystem`).
- **Buffers prealojados y cero allocations en hot loop:** `projectionBuffer` tiene una capacidad fija de 400 elementos prealojados mediante `createProjectionBuffer`. `projectRoad` no realiza ninguna asignación por frame dentro del bucle de proyección.

---

## F. Baseline de performance

- **Métricas reproducibles en entono Node.js (Microbenchmarks):**
  - Búsqueda de segmento actual (`findSegmentIndexAtZ` en N=400 segmentos): **~0.4 µs** por frame.
  - Ejecución de proyección pura (`projectRoad` sobre 300 segmentos): **~3.3 µs** por frame.
- **Limitaciones de la baseline:**
  No fue posible medir los tiempos de renderizado por frame (p95 / FPS) en Canvas2D ni en Skia dentro de un dispositivo o navegador real debido a que los drawers de visualización en el repositorio actual contienen el texto placeholder `"SEE_LOCAL"`.

---

## G. Diferencias visuales pendientes

- **Canvas vs Skia:**
  Existen diferencias naturales de rasterización (antialiasing, curvas Bézier, mezcla gamma de trapezoides y pintado de caminos) entre los renderers de Canvas2D y Skia API. La verificación y contraste directo de capturas pareadas queda bloqueada hasta que se restaure el código fuente de `OutrunCanvasVisuals.ts` y `OutrunSkiaVisuals.ts`.

---

## H. Deuda técnica y decisiones aplazadas

- **Deferred — Elevación easing (T2.1c):**
  - *Estado:* Aplazado intencionalmente.
  - *Motivo:* Los tramos generados con `addStretch` aplican una colina constante por segmento (`easeHill` desactivado por defecto). El modelo incremental $dy += hill$ acumula la elevación; un easing de elevación sin emparejar ascenso y descenso cambiaría la altura neta de la pista de forma no deseada. Se requiere un modelo de altura absoluta en lugar de derivadas. Decisión de aplazamiento totalmente justificada y documentada.
- **Deferred — Fog en sprites y elementos de horizonte:**
  - *Estado:* Aplazado intencionalmente.
  - *Motivo:* Se aplica fog únicamente sobre el strip de la carretera y el terreno, preservando la nitidez de los sprites de vehículos y el horizonte decorativo 2049 para mantener la dirección de arte y legibilidad del gameplay.

---

## I. Plan de corrección priorizado

1. **P0 — Restaurar drawers de visualización:**
   Restaurar el contenido funcional de `src/games/outrun/rendering/OutrunCanvasVisuals.ts` y `src/games/outrun/rendering/OutrunSkiaVisuals.ts` utilizando la versión del commit `811556d7166` previa al merge erróneo de PR #738.
2. **P1 — Aplicar parche de fog unificado de la Sesión 3:**
   Ejecutar `patch -p1 < docs/session3_renderers.patch` para integrar `resolveSegmentFog` en las funciones `drawOutrunRoad` y `drawSkiaOutrunRoad`.
3. **P2 — Normalizar retorno de ceros en `TrafficSteering.ts`:**
   En `centrifugalDelta`, retornar `val === 0 ? 0 : val` para evitar la emisión de ceros negativos (`-0`) que hacen fallar las assertions de Jest `toBe(0)`.
4. **P2 — Corregir assertion de simetría en `RoadStretch.test.ts`:**
   Ajustar el test `symmetric left/right sign` en `RoadStretch.test.ts` para tolerar la representación de ceros negativos IEEE 754 en arreglos devueltos por `buildEasedCurveStretch`.
5. **Verificación final post-fix:**
   Ejecutar `pnpm run typecheck:app`, `pnpm exec jest src/games/outrun` y validar el paso limpio de los 6 test suites y la compilación sin errores.
