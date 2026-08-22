# Roadmap: Optimización del Broadphase de Colisiones

Este documento define la estrategia, los *gates* de medición y los criterios de aceptación para la refactorización del sistema de detección de colisiones (fase *broadphase*).

## Fase 0 — Gate de verificación de API (Bloqueante)
Antes de escribir nuevos tests o implementaciones, es obligatorio auditar el uso de `registerComponent` en el ECS:
* **Inspeccionar:** `packages/core/src/ecs/World.ts`. Confirmar si existe un método público `registerComponent(type: string)`.
* **Si existe:** Documentar su firma exacta y en qué momento del ciclo de vida (antes de `addComponent`) es strictly necesario llamarlo.
* **Si no existe:** Identificar por qué los tests actuales (`PredictionInterpolation.test.ts`, `DeterministicReplay.test.ts`, `golden.test.ts`, `DivergenceDetector.test.ts`, `MultiplayerReconciler.test.ts`, `RollbackSimulation.test.ts`) lo invocan (¿es un mock? ¿es una extensión de test-utils?). Marcar explícitamente como anti-patrón su uso en los tests de colisión de las siguientes fases si resulta no ser parte de la API pública real.

## Fase 1 — Benchmark de referencia (Gate de medición)
Establecer la línea base de rendimiento del algoritmo actual (`BroadPhase.sweepAndPrune`) frente al presupuesto de frame.
* **Implementación:** Fusionar el test `BroadPhaseWorstCase.benchmark.test.ts` evaluando los tres escenarios críticos:
  1. Alineación degenerada en el eje X (falla el *early-break*).
  2. Clúster denso superpuesto (explosión combinatoria de pares).
  3. Inversión total de orden (peor caso para el in-place Shell Sort).
* **Evaluación:** Correr el benchmark simulando las densidades reales de entidades de los 5 juegos: Asteroids, Space Invaders, Pong, Flappy Bird y Geometry Wars.
* **Criterio de salida (Gate):** Si ningún escenario empuja el tiempo de ejecución del broadphase por encima del ~15% del *frame budget* (aprox. 2.5ms sobre 16.6ms), **este roadmap se da por concluido**. El algoritmo actual se considera definitivo y la Fase 2 queda abortada por innecesaria.

## Fase 2 — `SpatialHashGrid` (Condicional)
*Solo se ejecutará si la Fase 1 demuestra un cuello de botella real.*
Implementar una alternativa basada en partición espacial en `packages/core/src/physics/collision/SpatialHashGrid.ts`.
* **Requisitos de corrección técnica:**
  * Uso correcto de imports (`../../ecs/CoreComponents`).
  * **Pool de instancia:** `pairsPool` debe vivir en la instancia, no como estático de clase, previniendo corrupción al ejecutar múltiples grids concurrentes (ej. multi-escena en Geometry Wars).
  * **Deduplicación infalible:** Usar una clave string (`${idA}_${idB}`) para el `Set` de pares verificados. El uso de XOR numérico está prohibido por riesgo de truncamiento a 32 bits y colisiones falsas.
  * **Soporte de Narrowphase previo:** `findCandidatePairs` debe respetar y pre-filtrar las exclusiones de `layer`, `mask` y `isTrigger` definidas en `ColliderComponent`.
* **Criterios de Equivalencia:**
  * Test `SpatialHashGridEquivalence.test.ts` garantizando un 100% de coincidencia de pares generados frente a `sweepAndPrune`.
  * Los tests deben construir colliders usando la definición estricta y real (ej. `ShapeType.Box` con `BoxShape`), no discriminadores string (`"box"`).
  * Incluir un test específico insertando dos pares de entidades diseñadas matemáticamente para colisionar bajo un algoritmo de hash deficiente, garantizando que el `Set` string retiene ambos eventos.

## Fase 3 — Integración A/B y Regresión
Despliegue controlado del nuevo sistema sin afectar la física subyacente.
* Modificar `packages/core/src/physics/collision/CollisionSystems.ts` (específicamente `CollisionSystem2D`) para exponer un *flag* de configuración que permita alternar en caliente entre `sweepAndPrune` y `SpatialHashGrid.findCandidatePairs`.
* Ejecutar una regresión completa en los 5 juegos del monorepo usando el nuevo grid.
* Retirar el flag y fijar el grid por defecto una vez demostrada la estabilidad total.

## Bloqueos y Gobernanza
* **Regla de Medición:** Ninguna optimización de broadphase (Fase 2 en adelante) podrá fusionarse en la rama principal sin que los resultados del benchmark de la Fase 1 anexados en el PR demuestren una regresión de rendimiento o una violación del límite de 2.5ms.
