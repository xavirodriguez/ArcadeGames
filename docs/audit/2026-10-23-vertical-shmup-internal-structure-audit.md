# Auditoría de estructura interna y plan de evolución — Vertical Shmup

- **Fecha:** 2026-10-23
- **Rama de trabajo:** `feat/vertical-shmup-tdd-suite`
- **Commit base del informe aportado:** `e383d62657185b4d5a6609d68599c509fd545468`
- **Ámbito:** `src/games/vertical-shmup/`, la pantalla React, integración de teclado, ECS compartido y contrato de renderizado.
- **Propósito:** convertir el informe recibido en un registro rastreable; diferenciar conclusiones del informe original, comprobaciones sobre el código de esta rama y resultados CI observados.

## 1. Resumen ejecutivo

El informe de referencia identificó tres bloqueadores P0: actualización de transformaciones de mundo, dimensiones del viewport e incompatibilidad del payload de teclado. La inspección de esta rama confirma que esos riesgos existían en el código base o en contratos conectados, y que se han añadido correcciones para abordarlos.

La auditoría ampliada añadió pruebas ECS para movimiento, hitbox, cadencia de disparo, reciclaje de proyectiles, payload de teclado, dimensiones de viewport, aleatoriedad sembrada, protección contra impactos simultáneos y comportamiento tras Game Over. Algunas correcciones están en la rama, pero **no deben considerarse verificadas hasta que la ejecución CI del SHA más reciente termine correctamente**. La prueba manual en navegador y dispositivo tampoco se ha realizado aquí.

## 2. Método y límites de evidencia

1. Se usó el informe aportado, correspondiente al commit base `e383d626`, como lista inicial de hipótesis.
2. Se inspeccionaron los archivos actuales de la rama antes de clasificar un hallazgo como abierto o resuelto.
3. Se consultaron trazas reales de GitHub Actions. Se conservan los fallos como evidencia, en lugar de convertirlos retrospectivamente en éxitos.
4. No fue posible clonar el repositorio en el entorno local por un fallo de resolución DNS de GitHub. La validación automatizada se está realizando mediante CI del propio repositorio.
5. Las observaciones visuales del informe original (recorte real del lienzo, posición visual, ergonomía y experiencia jugable) requieren QA manual; la inspección estática por sí sola no las demuestra.

## 3. Matriz consolidada de hallazgos

| ID original | Severidad | Hallazgo | Estado en esta rama | Evidencia / acción |
|---|---|---|---|---|
| P0-01 | P0 | `worldX/worldY` podían quedarse desactualizados tras integrar movimiento. | **Corrección añadida; pendiente de validar** | `ShmupGameScene.ts` registra `HierarchySystem` en `SystemPhase.Transform` antes de colisión. Se añadió prueba de colisión ECS. |
| P0-02 | P0 | El renderer usa `worldWidth/worldHeight` en camelCase, pero la configuración shmup usa `WORLD_WIDTH/WORLD_HEIGHT`; el helper podía caer en 800×600. | **Corrección añadida; pendiente de validar visualmente** | La escena expone alias camelCase además de conservar las claves gameplay. Un test comprueba el resultado de `resolveViewportDimensions`. |
| P0-03 | P0 | `useKeyboardControls` manda payload plano; el juego esperaba `axes/actions`. | **Adaptador añadido; pendiente de validar** | `VerticalShmupGame.setInputState` normaliza el payload plano y el estructurado. Se añadió test de movimiento y disparo vía teclado. |
| P1-01 | P1 | La muerte podía volver a producir explosiones y VFX en cada tick. | **Guarda añadida; pendiente de validar** | `ShmupCollisionSystem` crea el efecto de muerte solo al entrar en Game Over; `ShmupInputSystem` detiene velocidad y entrada después. |
| P1-02 | P1 | Dos impactos de proyectil en un mismo tick podían restar varias unidades de salud antes de procesarse los eventos diferidos `combat:hit`. | **Guardia añadida; pendiente de validar** | `ShmupSingleHitGuardSystem` filtra los impactos de daño hostil redundantes entre detección de colisión y `CombatSystem`; hay test con dos proyectiles simultáneos. |
| P1-03 | P1 | No existe una experiencia completa de pausa/Game Over/reinicio en UI. | **Pendiente** | La pantalla muestra score, wave y vidas, pero debe conectarse explícitamente el estado lógico a overlays y controles de reinicio/pausa. |
| P1-04 | P1 | `EntityFactory.createEnemy` usaba `Math.random()` para el cooldown inicial del patrón. | **Cambio añadido; pendiente de validar** | El factory usa `world.gameplayRandom`, conservando el estado de bloqueo previo; test de semilla fija añadido. |
| P1-05 | P1 | `Set<string>` dentro de un componente ECS podía perderse o quedar mal clonado/serializado. | **Cambio añadido; pendiente de validar** | Las acciones ECS ahora son `string[]`. Se actualizaron factory, sistema, estado de input y pantalla táctil. |
| P2-01 | P2 | El contacto con el cuerpo del enemigo no tiene contrato de daño definido. | **Pendiente** | Definir primero reglas para choque corporal, enemigos y jefes; añadir pruebas antes de implementar daño. |
| P2-02 | P2 | El esquema mezcla claves UPPER_SNAKE_CASE y camelCase, con unidades no siempre explícitas. | **Parcial** | Se añadió el alias mínimo para renderer; la normalización completa de configuración sigue pendiente. |
| P2-03 | P2 | Los mutadores de campaña no parecen aplicar velocidad a entidades activas. | **Pendiente de comprobación** | Revisar el contrato de campaña antes de cambiar el hook `shmup_speed`. |
| P2-04 | P2 | Los spawns escalonados a Y negativas pueden retrasar la entrada de las formaciones. | **Pendiente de balance y QA** | Medir el tiempo de entrada de la formación más alejada; no cambiar posiciones sin comprobar el diseño esperado. |
| P2-05 | P2 | El render del starfield/VFX puede asignar objetos cada frame. | **Pendiente de perfilado** | Confirmar con perfil de render real antes de optimizar. |
| P2-06 | P2 | La matriz de capas/máscaras no está documentada como contrato del shmup. | **Pendiente** | Documentar capas de jugador, enemigos y proyectiles; incluir casos positivos y negativos. |
| P3-01 | P3 | El informe de referencia cita errores de linter y código muerto. | **Pendiente de lint específico** | El pipeline general no sustituye la revisión ESLint específica de todos los archivos `src/games/vertical-shmup`. |
| P3-02 | P3 | Hay referencias de red no utilizadas en modo local. | **Pendiente de evaluación** | No eliminar el controlador hasta determinar si forma parte del contrato estándar de `BaseGame`. |
| P3-03 | P3 | La bitácora histórica afirma que se verificó un hash determinista sin mostrar una aserción correspondiente. | **Corrección documental requerida** | `VerticalShmupInit.test.ts` cubre inicialización/bloqueo de RandomService, no demuestra por sí solo el hash `InputFrame[0..N]`. Esta afirmación queda marcada como no verificada. |
| P3-04 | P3 | Reasignación de controles y ergonomía táctil limitadas. | **Parcial / pendiente** | Se preservan actualizaciones parciales del input táctil y se adapta teclado; keybindings y QA móvil quedan pendientes. |

## 4. Cambios técnicos introducidos en la rama

- Añadido `HierarchySystem` en una fase de transformación previa a colisiones.
- Expuestas las dimensiones lógicas en camelCase al renderer sin renombrar de golpe el esquema gameplay.
- Añadido adaptador de teclado para `moveX`, `moveY` y `shoot`.
- Sustituido el `Set<string>` de acciones del componente de jugador por un array serializable.
- Corregidos los updates táctiles para que un parche de movimiento no borre el estado de disparo, y viceversa.
- Añadida normalización de movimiento diagonal, conservación del exceso temporal de cooldown y pruebas con pasos regulares/irregulares.
- Consolidado el límite post-integración dentro de `BoundarySystem`: los flags `clampX/clampY` permiten usar las cotas de `Boundary` y detener la velocidad sin crear un sistema duplicado por juego.
- Añadida protección específica frente a múltiples impactos de daño hostil en un tick.
- Añadida guarda contra la repetición de efectos de muerte después de Game Over.
- Sustituido el `Math.random()` del cooldown inicial de enemigos por `gameplayRandom`.
- Añadido a CI un paso Jest dedicado a `src/games/vertical-shmup/__tests__`, porque el test task de Turborepo no garantiza por sí solo recoger esa ruta.

## 5. Evidencia CI disponible y fallos conocidos

### Ejecución previa — SHA `a4ada74a046af3289e7d57333f66c60584fa2aad`

- Build, lint, typecheck y tests de Turbo: correctos.
- Tests generales de Turbo: 120 suites, 613 tests y 1 snapshot pasados.
- Suite shmup: 13 tests pasados y 2 fallidos.
- Fallos observados: cadencia de disparo no contabilizada como se esperaba y doble liberación de una entidad proyectil por coexistencia de limpieza de borde y TTL.

### Ejecución previa — SHA `5709046d60fc8fd4eb3478b15f74311c14dfd941`

- Build, lint, typecheck y tests generales de Turbo: correctos.
- La suite específica no se pudo recopilar: TS2588 por declarar `shooting` como `const` cuando el input táctil puede reasignarlo. Se volvió a `let`.

### Ejecución previa — SHA `92680d7e2779fb383ffaf8b335182f90a1b02006`

- Tests generales de Turbo: 120 suites, 613 tests y 1 snapshot pasados.
- Suite shmup: 13 tests pasados y 2 fallidos.
- El detalle confirmó que la acción con `Set` no persistía a través del ciclo ECS como se esperaba y que el marcador de entidad liberada no se estaba consultando mediante el acceso mutable.

### Ejecución previa — SHA `026c51aa06bd78d3d97c363b2e40dbc4c1860aec`

- En la ejecución de ECS Core Sentinel, las comprobaciones de límites de paquetes y el ratchet de casts pasaron.
- Falló `check:duplication`: 1.317 líneas duplicadas frente a 1.135 del baseline, una regresión de 182 líneas.
- Se refactorizó después el límite de jugador para reutilizar `BoundarySystem` en lugar de conservar un sistema específico duplicado. El resultado del ratchet tras esa refactorización está pendiente.

### Estado de esta revisión

La punta de rama sigue cambiando y las ejecuciones correspondientes a las últimas correcciones aún no han dejado una traza final de CI que permita declarar verde la suite P0. **No se afirma que los tests nuevos estén pasando.** Consultar la pestaña Actions del PR #860 para el resultado del SHA más reciente.

## 6. Plan de verificación y Definition of Done

### P0 — desbloqueadores de ejecución

1. Que la suite dedicada del shmup pase en CI.
2. Que el test de movimiento confirme velocidad diagonal normalizada, independencia de `deltaTime` y clamp a las cotas.
3. Que los tests de hitbox confirmen tanto el caso fuera de hitbox como el daño en contacto real.
4. Que los tests de cadencia confirmen el número de disparos para 60 FPS y pasos irregulares.
5. Que el test de vida de proyectil confirme reclamación única, sin doble liberación.
6. Que el test de viewport confirme las dimensiones 480×854 en el contrato del renderer.
7. Validación manual en navegador: movimiento, disparo, bordes, render completo, colisiones y Game Over.

### P1 — estabilidad de juego

1. Confirmar que una semilla fija produce los mismos cooldowns/patrones iniciales.
2. Confirmar que dos proyectiles simultáneos no infligen dos daños en el mismo tick.
3. Confirmar que las acciones de input sobreviven a las actualizaciones ECS/snapshot necesarias.
4. Confirmar que al morir la nave, no se generan nuevos efectos repetidos ni se admiten nuevos controles.
5. Implementar y probar overlays de pausa/Game Over y ruta de reinicio.

### P2/P3 — evolución

Priorizar después de cerrar P0/P1: daño por choque corporal, matriz de colisión documentada, mutadores, balance de spawn, perfilado de asignaciones del render, limpieza ESLint específica y keybindings accesibles.

### Comandos de referencia

```bash
pnpm exec jest --config src/games/vertical-shmup/jest.config.cjs --runInBand --testPathPattern='src/games/vertical-shmup/__tests__'
pnpm exec tsc -p tsconfig.json --noEmit
pnpm run check:ratchet
```

## 7. Corrección explícita de la bitácora histórica

La frase histórica `InputFrame[0..N] -> snapshot hash: MATCH` no está respaldada por una aserción visible en `VerticalShmupInit.test.ts`. Debe considerarse **una afirmación histórica no verificable**, no un resultado aceptado. Una nueva prueba de determinismo deberá crear dos instancias con la misma semilla, aplicar los mismos frames de entrada y comparar hashes de snapshots en cada tick antes de marcar este contrato como validado.
