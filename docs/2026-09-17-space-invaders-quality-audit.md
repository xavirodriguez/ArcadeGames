# Auditoría de Calidad — Space Invaders (`src/games/space-invaders/`)

## Resumen Ejecutivo

**Hallazgos por severidad**: Critical: 0 · High: 4 · Medium: 6 · Low: 4

**Top patrones/problemas más importantes**:
1. Inconsistencia entre `Formation.totalInvaders` (sincronizado correctamente por `SpaceInvadersGameStateSystem` en cada avance de nivel) y `KamikazeSystem`, que sigue usando `config.INVADER_ROWS * config.INVADER_COLS` como fuente de verdad para el total de invasores — desincroniza el umbral de aparición de kamikazes respecto al del speed-scaling de la formación.
2. `FormationComponent.leftBound`/`rightBound` son campos declarados y persistidos pero nunca leídos ni escritos por `SpaceInvadersFormationSystem` — el sistema recalcula `minX`/`maxX` desde cero cada frame en vez de usarlos; son código muerto o una refactorización incompleta.
3. `BossSystem.update` usa `.forEach` con closures (`b => {...}`) en un hot path de `SystemPhase.Simulation`, rompiendo la convención de bucles indexados sin allocation usada consistentemente en `SpaceInvadersFormationSystem` y `SpaceInvadersCollisionSystem`.
4. Duplicación real confirmada por `jscpd` entre la lógica de combo de `AsteroidCollisionSystem` y `SpaceInvadersCollisionSystem.onCombatDeath` (mutación de `Combo`, cálculo de `multiplier`) — candidata clara a extracción a `src/games/shared/`.
5. Buena disciplina de determinismo y de arquitectura de colisión en capas (`CollisionSystem2D` → `CombatSystem` → `SpaceInvadersCollisionSystem`), con "doble/triple seguridad" explícita y comentada, y cobertura de test notablemente amplia (formación, combos, kamikaze, boss, rollback/resimulación, disparo cargado por escudos).

**Salud global: 7.5/10.** La arquitectura de fases (Collision → GameRules) está limpia y bien documentada en el propio código; el sistema de disparo de la formación usa buffers `Int32Array`/`Float32Array` preasignados (zero-allocation) que ya corrigen la debilidad "asignaciones temporales en hot path" señalada en el propio análisis de mejoras del equipo (`docs/game-improvements/2026-09-11-space-invaders-improvement-analysis.md`); y el determinismo del RNG de gameplay (`world.gameplayRandom`) está aplicado consistentemente en disparo, kamikaze y draft de mutators, incluyendo el patrón correcto de `unlock()`/`lock()` alrededor de generación de elecciones narrativas. Los puntos débiles se concentran en inconsistencias de sincronización de estado entre sistemas (`totalInvaders`), un método de colisión con alta complejidad ciclomática, y algunas duplicaciones de lógica con Asteroids que ya están fichadas por herramientas de análisis (`jscpd`) pero no resueltas.

---

## Hallazgos

### SI-001 — `KamikazeSystem` no usa `Formation.totalInvaders`, desincronizándose del resto del pipeline de dificultad
- **Severidad**: High
- **Categoría**: Gameplay Correctness / Maintainability
- **Ubicación**: `src/games/space-invaders/systems/KamikazeSystem.ts`, línea 19 (`const totalInvaders = config.INVADER_ROWS * config.INVADER_COLS;`)
- **Descripción**: `SpaceInvadersFormationSystem` calcula el `ratio` de escalado de velocidad usando `formation.totalInvaders` (sincronizado dinámicamente en `SpaceInvadersGameStateSystem.updateGameState` en cada avance de wave según `WaveDefinitions`), pero `KamikazeSystem.update` recalcula `totalInvaders` de forma independiente usando la constante estática `config.INVADER_ROWS * config.INVADER_COLS`, ignorando por completo las oleadas de tamaño variable definidas en `WaveDefinitions`.
  Compárese con la sincronización correcta que sí hace `SpaceInvadersGameStateSystem` para `Formation.totalInvaders`.
- **Impacto**: En niveles cuyo `WaveDefinitions[i].totalInvaders` difiere del valor estático de config (el propio test de formación confirma waves de 24/27/30 invasores para niveles 1/2/3), el umbral `invaders.length < totalInvaders * 0.6` para disparar kamikazes se dispara en un punto de progreso de oleada distinto al diseñado, produciendo apariciones de kamikaze demasiado tempranas o tardías según el nivel.
- **Recomendación**: Leer `totalInvaders` desde el componente `Formation` (con el mismo fallback a `config.INVADER_ROWS * config.INVADER_COLS`) en lugar de recalcularlo de forma independiente en `KamikazeSystem`.
- **Prioridad de acción**: Próximo sprint

### SI-002 — `FormationComponent.leftBound`/`rightBound` son campos muertos
- **Severidad**: Medium
- **Categoría**: Maintainability
- **Ubicación**: `src/games/space-invaders/types/SpaceInvadersTypes.ts` líneas 183-184; `src/games/space-invaders/systems/SpaceInvadersFormationSystem.ts` líneas 82-105
- **Descripción**: `FormationComponent` declara `leftBound`/`rightBound`, inicializados a `0` en el blueprint `"formation"` de `SpaceInvadersGame.ts`, pero `SpaceInvadersFormationSystem.update` nunca los lee ni escribe — en su lugar recalcula `minX`/`maxX` iterando todos los invadores cada frame y compara contra constantes locales `leftLimit`/`rightLimit` derivadas de `margin` y `GAME_CONFIG.SCREEN_WIDTH`.
- **Impacto**: Bajo riesgo funcional inmediato, pero es deuda de mantenibilidad: un desarrollador que lea el componente asumirá razonablemente que `leftBound`/`rightBound` reflejan el estado real de la formación (útil, por ejemplo, para debugging o HUD), cuando en realidad están congelados en `0` para siempre.
- **Recomendación**: Eliminar los campos si son vestigiales, o completar la implementación para que `SpaceInvadersFormationSystem` los actualice y los use en vez de recalcular `minX`/`maxX` cada frame (lo cual también ahorraría la iteración completa de invaders en el hot path).
- **Prioridad de acción**: Backlog

### SI-003 — `BossSystem.update` usa `.forEach` con closures en fase `Simulation`
- **Severidad**: Medium
- **Categoría**: Performance
- **Ubicación**: `src/games/space-invaders/systems/BossSystem.ts`, líneas 46-133
- **Descripción**: A diferencia de `SpaceInvadersFormationSystem` y `SpaceInvadersCollisionSystem`, que usan explíctamente bucles indexados `for (let i = 0; i < len; i++)` con comentarios documentando la razón ("Safe for determinism/rollback... avoids per-tick iterator allocations"), `BossSystem.update` itera con `bosses.forEach(entity => {...})`, y dentro de ese callback anida múltiples `world.mutateComponent(entity, "Boss", b => {...})` con closures adicionales.
- **Impacto**: Bajo en la práctica normal (hay como máximo 1 boss activo a la vez), pero es una inconsistencia de estilo respecto al patrón "zero-allocation" que el resto del código de Space Invaders sigue rigurosamente, y contradice la regla explícita del proyecto de tratar `update()`/`Systems` como "terreno sagrado" frente a closures.
- **Recomendación**: Convertir a bucle indexado clásico por consistencia, aunque el impacto real de performance sea marginal dado el bajo conteo de bosses simultáneos.
- **Prioridad de acción**: Backlog

### SI-004 — Duplicación de lógica de combo entre `AsteroidCollisionSystem` y `SpaceInvadersCollisionSystem`
- **Severidad**: Medium
- **Categoría**: Architecture / Maintainability
- **Ubicación**: `src/games/space-invaders/systems/SpaceInvadersCollisionSystem.ts` líneas 196-208 (`onCombatDeath`); duplicado equivalente en `src/games/asteroids/systems/AsteroidCollisionSystem.ts` líneas 104-112 (confirmado por `report/jscpd-report.json`)
- **Descripción**: La herramienta de detección de duplicación del propio proyecto confirma un fragmento de 9 líneas idéntico entre ambos sistemas: query de `Combo`, incremento, reseteo de `timerRemaining`, y cálculo de `multiplier = Math.min(MAX_MULTIPLIER, 1 + Math.floor(combo/5))`.
- **Impacto**: Cualquier cambio en la fórmula de combo/multiplier debe replicarse manualmente en ambos archivos; el proyecto ya tiene un `ComboSystem` centralizado en `src/games/shared/arcade/` (mencionado en `docs/ARCHITECTURE_AND_DEVELOPER_GUIDE.md` §4.3) pero esta porción específica de "combo + score gain" no está unificada allí.
- **Recomendación**: Extraer un helper compartido (`applyComboKill(world, comboEntity, config) => { combo, multiplier }`) a `src/games/shared/arcade/`, siguiendo la regla del proyecto de que código usado por 2+ juegos debe vivir en `shared/`.
- **Prioridad de acción**: Próximo sprint

### SI-005 — `SpaceInvadersCollisionSystem.update`/`handleCollision` concentra alta complejidad ciclomática en un único flujo
- **Severidad**: Medium
- **Categoría**: Maintainability
- **Ubicación**: `src/games/space-invaders/systems/SpaceInvadersCollisionSystem.ts`, método `handleCollision` (líneas 328-436) y `onCombatHit`/`onCombatDeath` (líneas 62-296)
- **Descripción**: `handleCollision` despacha 6 pares de colisión distintos (`Bullet-Boss`, `Bullet-Invader`, `Bullet-Shield`, `EnemyBullet-Player`, `Invader-Player`, `Invader-Shield`) de forma secuencial con `matchPair` + early `return`, y el caso `Bullet-Shield` en particular anida lógica de "disparo cargado por escudo" (piercing, cambio de color, spawn de chispas) directamente inline.
- **Impacto**: Dificulta testear cada caso de colisión de forma aislada del resto del despachador; el archivo completo (~566 líneas) mezcla responsabilidades de detección de pares, reacciones de combate, gestión de combo/score, y efectos visuales (Juice, partículas) en una sola clase.
- **Recomendación**: Extraer cada rama de `handleCollision` a un método privado nombrado explícitamente (`resolveBulletShieldCollision`, `resolveInvaderPlayerCollision`, etc.), similar a la recomendación ya aplicable a `AsteroidCollisionSystem` en la auditoría de Asteroids.
- **Prioridad de acción**: Próximo sprint

### SI-006 — Heurística `isMs = deltaTime > 1.0` duplicada y frágil en `SpaceInvadersFormationSystem`
- **Severidad**: Medium
- **Categoría**: Gameplay Correctness / Determinism
- **Ubicación**: `src/games/space-invaders/systems/SpaceInvadersFormationSystem.ts`, líneas 44-46, 77-79, y 154-181 (lógica de disparo)
- **Descripción**: El sistema detecta si `deltaTime` viene en milisegundos (tests) o segundos (game loop real) comparando contra el umbral arbitrario `> 1.0`, aplicado de forma redundante en 3 puntos distintos del mismo método, y con una lógica de conversión de `fireCooldownRemaining` adicional y distinta (`if (currentCooldown > 100) currentCooldown /= 1000`) en la rama de segundos.
- **Impacto**: Cualquier `deltaTime` real que supere 1.0s (frame drop severo, tab en background, debugger pausado) sería mal-clasificado como "milisegundos" y produciría movimiento/disparo con escala incorrecta por 1000x — un caso extremo pero plausible en web (los otros juegos ya usan `MAX_DELTA_TIME` como clamp explícito en config, pero no se ve aplicado aquí antes de esta heurística).
- **Recomendación**: Eliminar la heurística de auto-detección y estandarizar la unidad de `deltaTime` explícitamente en la interfaz del sistema (siempre segundos), ajustando los tests para pasar el valor en la unidad correcta en lugar de depender de detección implícita.
- **Prioridad de acción**: Backlog

### SI-007 — `checkInvadersBottom` es O(n) por tick sobre todos los invaders vivos, ejecutado siempre incluso sin colisiones
- **Severidad**: Low
- **Categoría**: Performance
- **Ubicación**: `src/games/space-invaders/systems/SpaceInvadersCollisionSystem.ts`, líneas 521-536, invocado incondicionalmente al final de cada `update()` (línea 325)
- **Descripción**: Cada tick, independientemente de si hubo colisiones o no, el sistema vuelve a consultar `world.query("Invader", "Transform")` y a iterar todas las entidades para comprobar si alguna cruzó `SCREEN_HEIGHT - 100`.
- **Impacto**: Coste marginal con formaciones de tamaño típico (≤55 invaders), pero es un query+iteración adicional en cada tick de `GameRules` que podría evitarse comprobando solo la fila más baja de la formación (ya que la formación desciende uniformemente) en vez de todos los invaders individuales.
- **Recomendación**: Opcional — solo relevante si se amplía el tamaño máximo de formación; documentar como aceptable dado el volumen actual.
- **Prioridad de acción**: Backlog

### SI-008 — `WaveTransitionSystem` usa un campo `phase` en `GameState` no declared en `GameStateComponent`
- **Severidad**: Medium
- **Categoría**: Maintainability / Type Safety
- **Ubicación**: `src/games/space-invaders/systems/WaveTransitionSystem.ts`, líneas 12-21; comparar con `GameStateComponent` en `src/games/space-invaders/types/SpaceInvadersTypes.ts` líneas 193-230
- **Descripción**: `WaveTransitionSystem` lee/escribe `gs.phase`, `gs.waveTransitionRemaining` sobre `world.getSingleton("GameState") as any`, pero ninguno de estos dos campos existe en la interfaz `GameStateComponent` revisada (que sí define `activeWaveEvent`, `bossPhase`, etc., pero no `phase` ni `waveTransitionRemaining`).
- **Impacto**: El uso de `as any` enmascara un desajuste de tipos real: o bien `GameStateComponent` está desactualizado y falta documentar estos campos, o `WaveTransitionSystem` está escribiendo a una interfaz distinta a la usada por el resto de sistemas de Space Invaders, lo que dificulta detectar en tiempo de compilación errores de nombre de campo.
- **Recomendación**: Añadir `phase`/`waveTransitionRemaining` a `GameStateComponent` explícitamente y eliminar el `as any`, o confirmar/documentar si `WaveTransitionSystem` pertenece a un flujo experimental separado (el uso de `SystemPhase`/`ActiveGroups` con grupo `"transition"` en `Schedule.ts` sugiere que sí es un mecanismo real y no vestigial).
- **Prioridad de acción**: Próximo sprint

### SI-009 — Config JSON de producción difiere del config de test en varios valores de balanceo
- **Severidad**: Low
- **Categoría**: Design Fidelity
- **Ubicación**: `src/games/space-invaders/config/space-invaders.json` vs `src/games/space-invaders/config/SpaceInvadersTestConfig.ts`
- **Descripción**: `INVADER_SPEED_MAX` es `260` en producción pero `300` en el config de test; `SHIELD_SEGMENT_HP` es `1` en ambos (coincide) pero el GDD documenta `SHIELD_SEGMENT_HP: 3` como valor base — un tercer valor distinto a los dos anteriores.
- **Impacto**: Bajo — es normal que configs de test difieran del balanceo de producción, pero la discrepancia de 3 valores distintos para `SHIELD_SEGMENT_HP` (GDD: 3, JSON producción: 1, Schema default: 3) sugiere que el JSON de producción pudo quedar desactualizado tras un cambio de balanceo documentado solo en el GDD/schema.
- **Recomendación**: Auditar puntualmente si `SHIELD_SEGMENT_HP: 1` en `space-invaders.json` es intencional (escudos más frágiles) o un valor obsoleto no sincronizado con el GDD.
- **Prioridad de acción**: Backlog

### SI-010 — `KamikazeSystem` no usa `world.gameplayRandom.unlock()`/`lock()` explícito, a diferencia de `SpaceInvadersGameStateSystem`
- **Severidad**: Low
- **Categoría**: Determinism
- **Ubicación**: `src/games/space-invaders/systems/KamikazeSystem.ts`, líneas 152-157 (uso de `world.gameplayRandom.nextInt`/`.next()` directo)
- **Descripción**: `SpaceInvadersGameStateSystem.onRegister` documenta y aplica explícitamente el patrón `wasLocked = rng.isLocked(); if (wasLocked) rng.unlock(); ... finally { if (wasLocked) rng.lock(); }` antes de generar elecciones de mutator.
  `KamikazeSystem.spawnKamikaze`, en cambio, llama a `world.gameplayRandom.nextInt`/`.next()` directamente sin ese guard, asumiendo implícitamente que el RNG ya está desbloqueado en el contexto de ejecución normal de `update()`.
- **Impacto**: No es necesariamente un bug (el guard de lock/unlock en `SpaceInvadersGameStateSystem` es específico para código que corre fuera del tick regular, dentro de un listener de evento asíncrono), pero la inconsistencia dificulta razonar sobre cuándo es seguro asumir que `gameplayRandom` está desbloqueado sin verificarlo explícitamente.
- **Recomendación**: Documentar explícitamente (o verificar con un test) que todos los `System.update()` estándar siempre corren con `gameplayRandom` desbloqueado por contrato del `Schedule`, para justificar por qué `KamikazeSystem` no necesita el guard.
- **Prioridad de acción**: Backlog

### SI-011 — Story mode: `SpaceInvadersArcadeAdapter.initialize` muta propiedades del juego vía `(game as any)` sin contrato tipado
- **Severidad**: Low
- **Categoría**: Story / Type Safety
- **Ubicación**: `src/games/space-invaders/story/InvasionEncounter.ts`, líneas 121-129
- **Descripción**: Los modificadores narrativos (`extraLives`, `fireRateMultiplier`, `enemySpeedMultiplier`) se aplican mediante casts `(game as any).extraLives = ...` directamente sobre la instancia de `SpaceInvadersGame`, sin que exista una interfaz explícita que declare estas propiedades como parte del contrato público del juego.
- **Impacto**: Si `SpaceInvadersGame` renombra o elimina estas propiedades internamente, el compilador no detectará la ruptura del adaptador de story — solo fallará en tiempo de ejecución o en tests de integración de story mode.
- **Recomendación**: Definir una interfaz `SpaceInvadersStoryModifiers` (o extender `ISpaceInvadersGame`) que declare explícitamente estas tres propiedades, eliminando los `as any`.
- **Prioridad de acción**: Backlog

---

## Observaciones Adicionales

**Patrones positivos**:
- La arquitectura de 3 capas de colisión (`CollisionSystem2D` detecta contacto → `CombatSystem` genérico aplica daño → `SpaceInvadersCollisionSystem` reacciona con reglas específicas del juego) está documentada explícitamente en el docstring de la clase, y es un patrón más limpio que el usado en Asteroids (que tiene lógica de fallback manual mezclada con `CombatSystem` en el mismo sistema).
- Zero-allocation hot path bien resuelto en `SpaceInvadersFormationSystem.fireFromFormation` mediante `Int32Array`/`Float32Array` preasignados y reutilizados (`ensureArrays`), abordando directamente la debilidad #5 señalada en el propio análisis de mejoras del equipo.
- Cobertura de test notablemente amplia y específica: formación (ratio/speed), combo (incremento, expiración, multiplicador con mutators), kamikaze (máquina de estados warning→telegraphing→diving→returning), boss (fury, fases), disparo cargado por escudos (piercing), y — particularmente valioso — un test dedicado de determinismo/rollback (`CombatRollbackResimulation.test.ts`) verificando que efectos secundarios externos (SFX) se emiten exactamente una vez pese a la resimulación.
- Mecánica de "disparo cargado al atravesar el propio escudo" (`Bullet-Shield` con `charged`/`piercing`) está implementada de forma completa y testeada end-to-end, no solo como idea de diseño en el documento de mejoras.
- Story mode (`InvasionEncounter.ts`) sigue el mismo pipeline unificado de 7 etapas documentado en `GDD.md` Parte 6, consistente con el resto del catálogo de juegos.

**Gaps de test más relevantes**:
- No se encontró evidencia directa de un test para el caso `Invader-Player` (colisión directa por invasión, no por bala) ni para `Invader-Shield` en `SpaceInvadersCollisionSystem.handleCollision`, pese a que ambos casos están implementados en el despachador.
- No se confirmó cobertura de test específica para `WaveTransitionSystem` y su transición a fase `"MUTATOR_DRAFT"`, dado el desajuste de tipos señalado en SI-008.
- No se pudo confirmar si existe un test que ejercite explícitamente el desajuste potencial de SI-001 (`KamikazeSystem` con `WaveDefinitions` de tamaño variable por nivel).

**Sugerencias de extracción a shared / arquitectura a medio plazo**:
- La lógica de combo duplicada (SI-004) es la candidata más clara y de menor esfuerzo para extracción a `src/games/shared/arcade/`, dado que el propio `jscpd-report.json` ya la tiene fichada automáticamente.
- Considerar extraer un helper compartido `resolveEdgeDetectionAndDescent` para lógica de "formación rígida con rebote en bordes + descenso", en caso de que Geometry Wars u otro juego futuro necesite un patrón de enjambre similar — actualmente es exclusivo de Space Invaders, así que no aplica la regla de "2+ juegos" todavía.

**Limitación de esta auditoría**: no se pudo revisar en profundidad `SpaceInvadersInputSystem.ts` (lógica de disparo del jugador, `PLAYER_SHOOT_COOLDOWN`), `SpaceInvadersRenderSystem.ts`, `ComboHUDRenderSystem.ts`, ni el contenido completo de `SpaceInvadersCanvasVisuals.ts`/`SpaceInvadersSkiaVisuals.ts` más allá de los fragmentos de kamikaze telegraphing recuperados. Tampoco se confirmó con certeza el contenido íntegro de `EnemyFactory.ts` ni `SpaceInvadersFormationUtils.ts` (`getFormationSize`). Si necesitas profundizar en alguna de estas áreas específicas, puedo hacer una pasada dirigida adicional.
