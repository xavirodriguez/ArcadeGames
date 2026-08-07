# Prompt maestro: evolución incremental de Combat y Spawn en Tiny Aster

## Rol

Actúa como un **arquitecto senior y desarrollador principal de motores de videojuegos**, especializado en:

* TypeScript estricto.
* Arquitecturas ECS.
* Simulación determinista.
* React Native y Expo.
* Canvas y React Native Skia.
* Snapshots, restore y rollback.
* Testing headless.
* Refactorización incremental de motores existentes.

Tienes acceso completo al repositorio:

`xavirodriguez/asteroides`

Debes inspeccionar, implementar, probar y documentar una evolución incremental del motor existente.

No diseñes un motor nuevo y no introduzcas una segunda arquitectura paralela al ECS actual.

---

# Objetivo general

Extraer a módulos reutilizables la lógica de:

1. Daño, salud, invulnerabilidad y muerte.
2. Generación y progresión de oleadas o grupos de enemigos.

Las nuevas capacidades deben ubicarse en:

```text
src/games/shared/combat/
src/games/shared/spawn/
```

Debes seguir el patrón arquitectónico existente en:

```text
src/games/shared/arcade/
```

No coloques estos sistemas dentro de `packages/core`.

El resultado debe permitir que `CombatSystem` y `SpawnDirectorSystem` sean utilizados inicialmente por Space Invaders y posteriormente por Asteroids, manteniendo el comportamiento observable de los juegos actuales.

---

# Principios no negociables

1. Inspecciona el código real antes de modificarlo.
2. Considera el código como fuente principal cuando contradiga la documentación.
3. No inventes APIs existentes.
4. Mantén `packages/core` libre de lógica específica de juegos y de dependencias de plataforma.
5. No introduzcas imports de:

   * `react-native`
   * `expo-*`
   * `@shopify/react-native-skia`
   * `@colyseus`
     dentro de `packages/core`.
6. Toda aleatoriedad que afecte al gameplay debe utilizar el generador determinista oficial del `World`.
7. Si la API real no es exactamente `world.gameplayRandom`, identifica la API determinista canónica del repositorio y documenta la discrepancia antes de utilizarla.
8. Todo estado nuevo que afecte a la simulación debe ser serializable mediante snapshots.
9. Todo sistema nuevo debe soportar snapshot, restore y rollback.
10. Los efectos visuales, sonidos y otros efectos secundarios no deterministas deben permanecer fuera del estado autoritativo.
11. No mezcles score, partículas, audio, combos, loot o reglas específicas dentro de `CombatSystem`.
12. No hardcodees contenido de Space Invaders o Asteroids dentro de sistemas compartidos.
13. Mantén compatibilidad con TypeScript estricto.
14. Evita `any`, salvo que una interfaz existente lo requiera y no pueda corregirse dentro del alcance. Documenta cualquier excepción.
15. No realices refactors no relacionados.
16. No crees commits ni pull requests salvo que se solicite expresamente.
17. No avances a una fase posterior mientras los criterios de salida de la fase actual no estén satisfechos.

---

# Inspección previa obligatoria

Antes de escribir código, inspecciona como mínimo:

```text
src/games/shared/arcade/
src/games/asteroids/systems/AsteroidCollisionSystem.ts
src/games/space-invaders/scenes/SpaceInvadersGameScene.ts
src/games/space-invaders/systems/SpaceInvadersCollisionSystem.ts
src/games/space-invaders/systems/SpaceInvadersFormationSystem.ts
src/games/space-invaders/systems/BossSystem.ts
src/games/space-invaders/systems/SpaceInvadersGameStateSystem.ts
src/games/space-invaders/SpaceInvadersGame.ts
src/games/space-invaders/__tests__/space-invaders.test.ts
packages/core/src/ecs/CoreComponents.ts
packages/core/src/ecs/System.ts
packages/core/tests/snapshots.test.ts
scripts/check-core-boundaries.sh
GDD.md
package.json
pnpm-workspace.yaml
```

También debes inspeccionar:

* Registro de componentes de cada juego.
* Registro y tipado de eventos.
* Implementación del `EventBus`.
* Representación de `CollisionEvents`.
* Orden real de ejecución de sistemas dentro de una misma fase.
* `CommandBuffer`.
* Registro y obtención de recursos del `World`.
* Blueprints y factorías.
* Implementación de snapshots.
* Tratamiento de componentes añadidos o eliminados durante `world.update`.
* Tests existentes de determinismo y rollback.

Entrega primero un informe breve con:

* Archivos inspeccionados.
* APIs relevantes encontradas.
* Diferencias entre roadmap, documentación y código.
* Riesgos detectados.
* Decisiones de diseño que deban resolverse antes de implementar.

Después comienza la implementación.

---

# Invariante crítico de orden de sistemas

Antes de implementar la migración de Space Invaders, verifica el flujo exacto de datos.

Existe un posible conflicto:

* `CombatSystem` debe consumir `CollisionEvents`.
* El roadmap propone ejecutar `CombatSystem` antes de `SpaceInvadersCollisionSystem`.
* También propone que `SpaceInvadersCollisionSystem` añada `DamageComponent` a la bala.

Si el componente se añade después de ejecutar `CombatSystem`, el daño no podrá procesarse durante el mismo tick.

No aceptes un retraso accidental de un tick.

Selecciona e implementa la alternativa más simple y coherente con el ECS existente:

1. Añadir `DamageComponent` al crear la bala.
2. Crear un sistema adaptador anterior a `CombatSystem`.
3. Ejecutar la adaptación de colisiones antes de `CombatSystem`.
4. Ejecutar `CombatSystem` después del sistema que añade el componente.
5. Representar el daño mediante una cola determinista de comandos o eventos de simulación.

Justifica la decisión con el orden real de ejecución encontrado en el repositorio.

La solución debe evitar:

* Daño duplicado.
* Procesamiento doble de la misma pareja de colisión.
* Daño con un tick de retraso.
* Dependencia accidental del orden de iteración de entidades.
* Efectos secundarios ejecutados durante una resimulación de rollback.

---

# Protocolo de ejecución

Implementa el trabajo fase por fase.

En cada fase:

1. Inspecciona los archivos implicados.
2. Explica brevemente el diseño.
3. Realiza el cambio mínimo necesario.
4. Añade o actualiza tests.
5. Ejecuta los quality gates correspondientes.
6. Corrige cualquier regresión.
7. Presenta:

   * Archivos modificados.
   * Decisiones tomadas.
   * Tests añadidos.
   * Comandos ejecutados.
   * Resultado de cada comando.
   * Riesgos pendientes.
8. No continúes si un quality gate obligatorio falla.

No ocultes fallos mediante:

* Desactivación de tests.
* Eliminación de asserts.
* Uso indiscriminado de casts.
* Modificación del comportamiento esperado sin justificarlo.
* Exclusión de archivos del typecheck.
* Reducción de las reglas de lint.
* Desactivación de comprobaciones de boundaries.

---

# Fase 0 — Contratos y diseño

## Objetivo

Definir los contratos públicos mínimos sin modificar todavía el comportamiento de los juegos productivos.

## Combat

Define en:

```text
src/games/shared/combat/components/
```

Los componentes propuestos:

### `DamageComponent`

Debe representar como mínimo:

* Cantidad de daño.
* Entidad origen, cuando exista.
* Tipo o categoría de daño.
* Política de consumo del causante, cuando sea necesaria.

La representación debe ser serializable y no contener funciones, clases no serializables ni referencias externas al `World`.

### `FactionComponent`

Debe permitir:

* Identificar la facción de una entidad.
* Evitar friendly fire.
* Configurar explícitamente los casos en los que sí se permite dañar a una entidad de la misma facción.

Reutiliza el `HealthComponent` existente:

```typescript
interface HealthComponent {
  type: "Health";
  current: number;
  max: number;
  invulnerableRemaining?: number;
}
```

No lo modifiques salvo que exista una necesidad demostrable y reutilizable.

## Spawn

Define en:

```text
src/games/shared/spawn/components/
```

### `SpawnDirectorComponent`

Debe contener estado serializable, como mínimo:

* `waveIndex`.
* `cooldownRemaining`.
* Solicitudes pendientes de spawn.
* Estado de la oleada actual.
* Contadores necesarios para determinar su finalización.

Evita almacenar funciones o referencias a factorías dentro del componente.

## Eventos

Define eventos deferred tipados:

```text
combat:hit
combat:death
spawn:wave_start
spawn:wave_complete
```

Los payloads deben contener identificadores estables y datos suficientes para que los juegos implementen sus propias reacciones.

No incluyas objetos de renderizado ni callbacks en los payloads.

## Salida de fase

Entrega:

* Diseño de interfaces TypeScript.
* Ubicación de cada archivo.
* Flujo de eventos.
* Diagrama textual del orden de sistemas.
* Estado incluido en snapshots.
* Riesgos de rollback.
* Justificación de por qué cada elemento pertenece a `shared-gameplay` y no a `packages/core`.

No cambies todavía Asteroids ni Space Invaders.

---

# Fase 1 — CombatSystem aislado

## Objetivo

Implementar y validar `CombatSystem` sin integrarlo todavía en juegos productivos.

## Ubicación

```text
src/games/shared/combat/systems/CombatSystem.ts
```

Añade archivos barrel cuando el patrón existente lo requiera:

```text
src/games/shared/combat/index.ts
src/games/shared/combat/components/index.ts
src/games/shared/combat/systems/index.ts
```

## Comportamiento

`CombatSystem` debe:

1. Extender la clase `System` real de `@tiny-aster/core`.
2. Ejecutarse en una fase compatible con el procesamiento posterior a colisiones.
3. Consultar `CollisionEvents`.
4. Identificar pares atacante-objetivo.
5. Comprobar `DamageComponent`.
6. Comprobar `HealthComponent`.
7. Aplicar las reglas de facción.
8. Respetar `invulnerableRemaining`.
9. Aplicar daño mediante `world.mutateComponent`.
10. Limitar la salud inferior a un valor coherente, preferiblemente cero.
11. Emitir `combat:hit`.
12. Emitir `combat:death` únicamente en la transición de vivo a muerto.
13. Evitar emitir varias muertes para la misma entidad.
14. Evitar procesar dos veces una pareja presente en los `CollisionEvents` de ambas entidades.
15. Mantener un orden determinista de procesamiento.
16. No eliminar automáticamente entidades salvo que exista un contrato explícito y reutilizable que lo justifique.
17. No actualizar score, combo, partículas, render, audio, loot ni estados concretos de un juego.

Determina explícitamente cómo se consume `DamageComponent`:

* Persistente.
* De un solo impacto.
* Por colisión.
* Eliminado mediante `CommandBuffer`.

La decisión debe evitar impactos repetidos no deseados.

## Tests mínimos

Añade tests headless para:

* Aplicación básica de daño.
* Salud que llega exactamente a cero.
* Daño superior a la salud restante.
* Emisión de `combat:hit`.
* Emisión única de `combat:death`.
* Invulnerabilidad activa.
* Ausencia de friendly fire.
* Friendly fire permitido explícitamente.
* Objetivo sin `HealthComponent`.
* Atacante sin `DamageComponent`.
* Doble representación de una misma colisión.
* Varias colisiones durante el mismo tick.
* Orden determinista con varias entidades.
* Snapshot antes del impacto.
* Restore después del impacto.
* Snapshot a mitad de una secuencia de combate.
* Dos simulaciones con la misma seed y los mismos inputs.
* Rollback y resimulación sin duplicar estado de gameplay.

No bases el test únicamente en llamadas privadas al sistema. Ejecuta el sistema mediante el ciclo real del `World` siempre que sea posible.

## Quality gates

Ejecuta como mínimo:

```bash
pnpm test
pnpm typecheck:app
pnpm check:core-boundaries
```

No modifiques juegos productivos durante esta fase.

---

# Fase 2 — Migración piloto de CombatSystem en Space Invaders

## Objetivo

Integrar `CombatSystem` en Space Invaders sin alterar el comportamiento observable.

## Registro

Modifica:

```text
src/games/space-invaders/scenes/SpaceInvadersGameScene.ts
```

Registra el nuevo sistema respetando el orden real requerido para que:

1. `CollisionSystem2D` produzca los contactos.
2. La adaptación de datos de daño ocurra.
3. `CombatSystem` aplique el daño.
4. Los sistemas específicos de Space Invaders reaccionen a los eventos.

No dependas únicamente de comentarios sobre el orden. Añade un test de integración que lo demuestre.

## Migración inicial

Migra:

* El impacto de `EnemyBullet` contra `Player`.
* El impacto de `PlayerBullet` contra `Boss`.

No migres todavía la rama de destrucción de invasores asociada al combo.

El sistema específico del juego debe seguir encargándose de:

* Screen shake.
* Hit flash.
* Explosiones.
* Score.
* Actualización de `GameState.lives`.
* Estado de game over.
* Sincronización entre `Boss.hp` y `Health.current`, mientras ambos campos sigan existiendo.
* Eliminación o reciclaje de balas.
* Efectos visuales y sonoros.

Implementa estas reacciones mediante listeners o sistemas específicos que consuman:

```text
combat:hit
combat:death
```

Evita que las reacciones se ejecuten dos veces durante rollback.

## Compatibilidad

Mantén:

* Balance.
* Valores de daño.
* Duración de invulnerabilidad.
* Eventos existentes que sean consumidos por otros sistemas.
* Comportamiento de pooling.
* Orden visible de explosiones y destrucciones.
* Tests existentes de Space Invaders.

## Tests mínimos

Añade tests de integración para:

* Bala enemiga golpeando al jugador.
* Invulnerabilidad del jugador.
* Pérdida de una vida.
* Game over.
* Bala del jugador golpeando al boss.
* Boss recibiendo múltiples impactos.
* Muerte del boss.
* Sincronización de `Boss.hp` y `Health.current`.
* Eliminación o devolución al pool de la bala.
* Una sola reacción visual por impacto.
* Snapshot y restore durante el combate contra el boss.
* Rollback de un impacto confirmado.
* Ausencia de regresión en combo de invasores.

## Quality gates

Ejecuta:

```bash
pnpm test
pnpm lint
pnpm typecheck:core
pnpm typecheck:app
pnpm check:core-boundaries
```

---

# Fase 3 — SpawnDirectorSystem aislado

## Objetivo

Implementar un director reutilizable de oleadas sin modificar todavía Space Invaders.

## Ubicación

```text
src/games/shared/spawn/systems/SpawnDirectorSystem.ts
```

Añade los barrels necesarios siguiendo el patrón de `shared/arcade`.

## Contratos

Define una representación serializable para:

```typescript
WaveDefinition
SpawnRequest
SpawnDirectorComponent
```

Una `WaveDefinition` puede describir:

* Identificador estable.
* Entradas o grupos de spawn.
* Blueprint que debe utilizarse.
* Cantidad.
* Intervalos.
* Posiciones o estrategia de posición.
* Condiciones de inicio.
* Condiciones de finalización.
* Cooldown previo o posterior.
* Oleada de boss, cuando corresponda.

Las definiciones deben ser configuradas por cada juego.

No hardcodees:

* Tipos de invasor.
* Dimensiones de pantalla.
* Boss de Space Invaders.
* Asteroides.
* Configuración específica de un juego.

## Integración con factorías

El sistema debe:

1. Consumir definiciones de oleada desde un recurso del `World` o mecanismo equivalente ya existente.
2. Emitir solicitudes deterministas de spawn.
3. Delegar la creación a blueprints o factorías registradas por el juego.
4. Usar identificadores serializables, no callbacks almacenados en componentes.
5. Utilizar únicamente el RNG determinista oficial.
6. Mantener el orden determinista de las solicitudes.
7. Emitir `spawn:wave_start` una vez.
8. Emitir `spawn:wave_complete` una vez.
9. Soportar snapshot y restore a mitad de cooldown o de una cola de spawns.
10. Evitar que una oleada restaurada vuelva a crear entidades ya confirmadas.

Determina cómo se identifica que los enemigos de una oleada siguen vivos:

* Componente de pertenencia a oleada.
* Identificador de grupo.
* Contador serializable.
* Consulta ECS determinista.

La solución no debe depender de referencias de objeto externas.

## Tests mínimos

Añade tests headless para:

* Inicio de primera oleada.
* Secuencia de varias oleadas.
* Cooldown.
* Spawn escalonado.
* Orden de solicitudes.
* Misma seed y mismos resultados.
* Seeds diferentes cuando la configuración usa aleatoriedad.
* Emisión única de eventos.
* Oleada sin entidades.
* Oleada con boss.
* Finalización cuando desaparece la última entidad.
* Snapshot a mitad del cooldown.
* Snapshot con solicitudes pendientes.
* Restore sin duplicar spawns.
* Rollback y resimulación.
* Ausencia de callbacks no serializables en componentes.

## Quality gates

Ejecuta:

```bash
pnpm test
pnpm typecheck:app
pnpm check:core-boundaries
```

No modifiques juegos productivos durante esta fase.

---

# Fase 4 — Migración de SpawnDirectorSystem en Space Invaders

## Objetivo

Centralizar la decisión de cuándo aparecen las oleadas y el boss.

## Alcance

Migra la lógica actualmente distribuida entre:

```text
SpaceInvadersGameStateSystem
BossSystem
SpaceInvadersGame
```

`SpawnDirectorSystem` debe decidir:

* Cuándo comienza una oleada.
* Qué definición se utiliza.
* Cuándo termina.
* Cuándo corresponde una oleada de boss.
* Cuándo se inicia la siguiente transición.

Mantén fuera del sistema compartido:

* Movimiento de la formación.
* Selección de invasor que dispara.
* Patrones de disparo.
* Comportamiento del boss.
* Balance de niveles.
* Score.
* Loot.
* Combo.
* Presentación.

No modifiques innecesariamente:

```text
SpaceInvadersFormationSystem.ts
```

## Configuración

Convierte la configuración de Space Invaders en definiciones de oleada consumibles por el director.

Utiliza los blueprints existentes para crear entidades.

Si el sistema de blueprints no puede invocarse directamente desde un sistema compartido sin acoplamiento, introduce un adaptador local del juego, no una dependencia de Space Invaders dentro de `shared/spawn`.

## Compatibilidad

Preserva:

* Cantidad y distribución de invasores.
* Progresión de nivel.
* Aparición del boss.
* HP del boss.
* Transiciones.
* Configuración existente.
* Balance observable.
* Comportamiento de tests actuales.

## Tests mínimos

Añade una prueba de integración completa:

```text
inicio de nivel
→ generación de oleada
→ eliminación de invasores
→ finalización de oleada
→ aparición del boss
→ daño al boss
→ muerte del boss
→ transición al siguiente nivel
```

Añade también tests para:

* Snapshot a mitad de una oleada.
* Restore antes de la aparición del boss.
* Rollback durante la muerte del último invasor.
* Ausencia de generación doble.
* Orden correcto entre `CombatSystem` y `SpawnDirectorSystem`.
* Nivel sin boss.
* Nivel con boss.
* Game over durante una oleada.
* Reinicio de partida.

## Quality gates

Ejecuta:

```bash
pnpm test
pnpm lint
pnpm typecheck:core
pnpm typecheck:app
pnpm check:core-boundaries
pnpm ci
```

---

# Fase 5 — Extensión a Asteroids

## Objetivo

Validar que `CombatSystem` es realmente reutilizable en un segundo juego con reglas de muerte diferentes.

## Alcance

Evalúa el caso:

```text
PlayerBullet contra Asteroid
```

Migra al sistema compartido únicamente la parte genérica:

* Aplicación de daño.
* Salud.
* Detección de muerte.
* Evento `combat:death`.

Mantén dentro de Asteroids:

* Cálculo de puntos.
* Actualización del score.
* Sincronización de score por propietario.
* Fragmentación.
* Creación de asteroides hijos.
* Partículas.
* Colores.
* Cantidades de partículas.
* Eliminación o pooling de proyectiles.
* Evento `asteroid:destroyed`.

La fragmentación debe ejecutarse como reacción específica a `combat:death`.

Debes conservar el orden necesario para leer `Transform`, `Velocity` y tamaño del asteroide antes de eliminarlo.

No permitas que el sistema genérico elimine la entidad antes de que Asteroids pueda fragmentarla.

## Decisión sobre SpawnDirector

Evalúa si las oleadas actuales de Asteroids justifican una migración inmediata.

Solo integra `SpawnDirectorSystem` si:

* Existe duplicación real.
* Puede reutilizar las mismas abstracciones sin introducir excepciones específicas.
* Mejora la cobertura arquitectónica.

En caso contrario, documenta el aplazamiento.

## Tests mínimos

Añade tests para:

* Impacto de bala contra asteroide.
* Asteroide con más de un punto de salud, si se introduce esa configuración.
* Muerte de asteroide.
* Fragmentación una sola vez.
* Lectura de datos antes de eliminación.
* Score sin regresiones.
* Propietario de la bala.
* Partículas sin formar parte del snapshot autoritativo.
* Snapshot previo al impacto.
* Restore posterior a fragmentación.
* Determinismo de fragmentos.
* Rollback sin fragmentos duplicados.

## Documentación

Actualiza `GDD.md` para reflejar la ubicación real de:

```text
src/games/shared/arcade/
src/games/shared/combat/
src/games/shared/spawn/
```

Corrige referencias desactualizadas que sitúen `ComboSystem` dentro de `packages/core`, cuando el código real indique otra ubicación.

Distingue claramente:

* Capacidades de `packages/core`.
* Sistemas compartidos de gameplay.
* Sistemas específicos de cada juego.

## Quality gates finales

Ejecuta:

```bash
pnpm test
pnpm lint
pnpm typecheck:core
pnpm typecheck:app
pnpm check:core-boundaries
pnpm ci
```

Todos deben finalizar correctamente.

---

# Requisitos transversales de determinismo

Comprueba explícitamente:

* Orden estable de iteración.
* Ausencia de `Math.random()` en gameplay.
* Ausencia de fechas o relojes del sistema en simulación.
* Estado completo del director de oleadas en snapshots.
* Estado completo de salud e invulnerabilidad en snapshots.
* Identificadores estables de entidades en eventos.
* Mismo resultado al repetir una simulación con igual seed e inputs.
* Mismo resultado tras snapshot, restore y continuación.
* Mismo resultado tras rollback y resimulación.

Crea un test de determinismo que produzca una representación estable del estado final y compare dos ejecuciones independientes.

No incluyas estado puramente visual en esa comparación salvo que el repositorio lo considere parte de la simulación.

---

# Requisitos de eventos y rollback

Los eventos de gameplay deben ser deterministas.

Los listeners de presentación deben evitar duplicar:

* Sonidos.
* Partículas.
* Screen shake.
* Hit flash.
* Popups.
* Vibración o haptics.

Investiga el mecanismo actual de confirmación de ticks o supresión de efectos durante rollback.

Si no existe, no inventes silenciosamente una solución global. Implementa el mecanismo mínimo local necesario o documenta el riesgo y añade un test que exponga el comportamiento.

---

# Requisitos de rendimiento

Evita:

* Crear arrays innecesarios por entidad y tick.
* Objetos temporales en bucles críticos.
* Búsquedas globales repetidas cuando puede utilizarse una query estable.
* Serializar funciones.
* Copiar configuraciones completas dentro de cada componente.
* Mantener colisiones antiguas después del tick.
* Crecimiento ilimitado de colas de spawn.

Añade límites o invariantes para:

* Solicitudes pendientes de spawn.
* Eventos de muerte por tick.
* Entidades pertenecientes a una oleada.
* Procesamiento repetido de parejas de colisión.

Documenta cualquier nueva estructura asignada por tick.

---

# Formato de los informes de fase

Después de cada fase presenta:

## Resumen

Qué se implementó y qué comportamiento se preservó.

## Evidencia

Rutas, tipos y APIs reales utilizadas.

## Archivos modificados

Lista de archivos creados, modificados o eliminados.

## Decisiones

Decisiones arquitectónicas y alternativas descartadas.

## Tests

Tests creados o actualizados y casos cubiertos.

## Validación

Tabla:

| Comando                      | Resultado              | Observaciones |
| ---------------------------- | ---------------------- | ------------- |
| `pnpm test`                  | PASS/FAIL              | ...           |
| `pnpm lint`                  | PASS/FAIL/NO EJECUTADO | ...           |
| `pnpm typecheck:core`        | PASS/FAIL/NO EJECUTADO | ...           |
| `pnpm typecheck:app`         | PASS/FAIL              | ...           |
| `pnpm check:core-boundaries` | PASS/FAIL              | ...           |
| `pnpm ci`                    | PASS/FAIL/NO EJECUTADO | ...           |

## Riesgos pendientes

Riesgos técnicos, deuda o discrepancias encontradas.

## Criterio de salida

Indica explícitamente:

```text
FASE COMPLETADA
```

o:

```text
FASE BLOQUEADA
```

No marques una fase como completada si sus quality gates obligatorios fallan.

---

# Condiciones de parada

Detén el avance y entrega un diagnóstico preciso cuando:

* No exista una API necesaria que el roadmap daba por supuesta.
* La arquitectura real impida mantener determinismo.
* Una migración requiera modificar `packages/core` de forma no justificada.
* Los snapshots no serialicen un componente nuevo.
* Se detecte daño o spawn duplicado.
* Un test existente falle debido a un cambio de comportamiento no solicitado.
* `check-core-boundaries` falle.
* No pueda demostrarse el orden correcto de los sistemas.
* Una fase requiera ampliar sustancialmente el alcance.

Cuando exista un bloqueo:

1. Explica la causa.
2. Cita los archivos implicados.
3. Presenta la alternativa mínima.
4. No continúes con fases dependientes.
5. No ocultes el fallo.

---

# Definición final de terminado

El desarrollo solo se considera terminado cuando:

* `CombatSystem` está aislado y probado.
* Space Invaders utiliza `CombatSystem`.
* `SpawnDirectorSystem` está aislado y probado.
* Space Invaders utiliza `SpawnDirectorSystem`.
* Asteroids utiliza la parte genérica de `CombatSystem` o existe una justificación técnica documentada para no migrarlo.
* Los sistemas compartidos no contienen reglas concretas de Space Invaders ni Asteroids.
* Todo estado nuevo está cubierto por snapshot y restore.
* Existen pruebas de determinismo.
* Existen pruebas de rollback.
* No se duplican muertes, impactos, oleadas ni efectos confirmados.
* `GDD.md` refleja la arquitectura real.
* Todos los quality gates finales están en verde.
* No se han introducido violaciones de boundaries.
* El comportamiento observable de los juegos existentes se mantiene, salvo cambios explícitamente documentados y aprobados.

Comienza inspeccionando el repositorio y entregando el informe previo. No escribas código antes de completar esa inspección.
