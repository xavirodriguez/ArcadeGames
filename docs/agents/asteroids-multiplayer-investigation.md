# Investigación: base multiplayer de Asteroids

**Fecha:** 2026-11-21  
**Alcance:** verificación documental de H1–H4. No se modifica runtime ni `packages/core`.  
**Estado general:** investigación confirmada por lectura directa; caracterización automatizada y ejecución local de CI no realizadas en esta invocación.

## Resumen ejecutivo

| Hipótesis | Clasificación | Conclusión |
|---|---|---|
| H1 — El servidor no procesa input | **Confirmada** | La sala crea `Ship + Transform + Velocity` y `applyInputFrameToEntity` añade `Input`, pero `AsteroidInputSystem` consulta exclusivamente `LocalPlayer + Transform + Velocity + Input`. La nave de sala no recibe `LocalPlayer`. |
| H2 — No existe `GameState` en multiplayer | **Confirmada** | `onInitializeEntities` retorna en multiplayer. La sala no crea un componente ECS `GameState`; `syncWorldToSchema` solo lo lee si existe. |
| H3 — Predicción cliente ejecuta World completo y desbloquea RNG | **Confirmada** | `NetworkController` usa `world.update(dt)` por defecto; `runSimulationStep` desbloquea `gameplayRandom`. El hook predice al enviar input y vuelve a aplicar todos los inputs pendientes tras cada snapshot. |
| H4 — Replicación deja entidades fantasma | **Confirmada con límite** | `NetworkReplicator.replicate` solo resuelve/actualiza IDs presentes; no poda ausentes ni consume una lista de destrucciones. La ausencia no significa destrucción: el modo binario filtra snapshots por presupuesto. |

**Corrección implementada:** ninguna. No se dispone de ejecución del repositorio ni de un resultado real de `pnpm run ci` desde esta integración. Por tanto, no se puede demostrar una prueba que falle antes y pase después ni satisfacer el criterio obligatorio de CI verde. No se debe marcar ninguna unidad como `done`.

## H1 — El servidor no procesa input

**Estado: Confirmada.**

### Evidencia inspeccionada

- **Verificado.** `AsteroidInputSystem.update` consulta `world.query("LocalPlayer", "Transform", "Velocity", "Input")`; el procesamiento de física, disparo e hyperspace ocurre dentro del bucle de ese resultado. No existe una rama alternativa basada en `NetworkRole === "server"` o `Ship.sessionId` en esta ruta (`src/games/asteroids/systems/AsteroidInputSystem.ts:14-45,60-170,180-285`).
- **Verificado.** `AsteroidsRoom.spawnPlayer` llama a `createShip` y añade `Ship.sessionId`; no añade `LocalPlayer` ni `Input` (`server/src/AsteroidsRoom.ts:150-184`).
- **Verificado.** La sala recoge el frame de `inputBuffers` y llama a `gameSimulation.applyInputToEntity(entity, frame)` antes del tick (`server/src/AsteroidsRoom.ts:185-215`).
- **Verificado.** `applyInputFrameToEntity` crea `Input` si falta y después copia acciones/axes. No crea `LocalPlayer` (`packages/core/src/network/InputComponentFactory.ts:12-48`).
- **Verificado.** El bootstrap single-player sí añade `LocalPlayer` y `Input`; esa ruta se omite en multiplayer (`src/games/asteroids/AsteroidsGame.ts:275-310`).
- **Verificado.** El disparo construye la bala con `ownerId: "player"`, no con el `Ship.sessionId` de la entidad procesada (`src/games/asteroids/systems/AsteroidInputSystem.ts:100-145`).

### Qué no se pudo verificar

- No se ejecutó una sala Colyseus real con cliente conectado, por lo que no se observó el síntoma en un proceso servidor vivo.
- No se verificó una integración externa que etiquete posteriormente la nave servidor como `LocalPlayer`; la ruta inspeccionada de `spawnPlayer` no lo hace.
- No se verificó el impacto del valor `ownerId` en scoring/ownership con una sesión de más de un jugador.

### Prueba de caracterización necesaria

Crear una sala real mediante el mismo ciclo `setupSimulation → onCreate → spawnPlayer → handleInputMessage/collectInputsForTick` (o un harness de sala que invoque esos métodos protegidos sin sustituir la creación ECS). Enviar `shoot`, ejecutar un tick de 1/60 s y comprobar que la nave tiene `Input` pero el sistema no procesa esa nave mientras carezca de `LocalPlayer`; contar balas y verificar también thrust/rotación. La prueba sintética existente que añade `LocalPlayer` manualmente no caracteriza la ruta real de sala (`src/games/asteroids/__tests__/AsteroidsMultiplayer.test.ts:1-75`).

### Solución propuesta

U1b: en el cliente, etiquetar explícitamente la nave local replicada con `LocalPlayer`; en servidor, seleccionar `Ship + Transform + Velocity + Input` bajo `NetworkRole === "server"`, manteniendo la query `LocalPlayer` en cliente/single. No procesar todas las entidades `Ship` en cliente, porque incluye naves remotas. Usar `Ship.sessionId` como `ownerId` de las balas y filtrar el ownership según el contrato de sesión.

### Riesgos y cierre

- Evitar doble procesamiento en servidor y cliente.
- No etiquetar naves remotas con `LocalPlayer`.
- Validar que `ownerId` coincide con `Ship.sessionId` y que score/daño atribuyen el crédito al jugador correcto.
- Cerrar con la prueba de sala descrita, pruebas de dos clientes y CI completo.

**Implementación:** no implementada; no hay prueba ejecutada ni CI verde. U1b queda `pending`.

## H2 — No existe GameState en multiplayer

**Estado: Confirmada.**

### Evidencia inspeccionada

- **Verificado.** `AsteroidsGame.onInitializeEntities` retorna inmediatamente cuando `isMultiplayer`; la creación ECS de `GameState`, la nave single-player y la oleada inicial quedan dentro de la ruta no multiplayer (`src/games/asteroids/AsteroidsGame.ts:275-310`).
- **Verificado.** La sala construye `AsteroidsGame` con `isMultiplayer: true` y `networkRole: "server"` (`server/src/AsteroidsRoom.ts:82-115`).
- **Verificado.** `AsteroidGameStateSystem` se registra para roles distintos de client, por lo que sí se registra en el servidor; el sistema obtiene su estado mediante `world.getSingleton("GameState")` y su lógica requiere ese componente (`src/games/asteroids/AsteroidsGame.ts:215-245`; `src/games/asteroids/systems/AsteroidGameStateSystem.ts:15-40,45-130`).
- **Verificado.** `syncWorldToSchema` consulta `getSingleton("GameState")` y solo copia el score si existe. No crea ni inicializa un componente `GameState` (`server/src/AsteroidsRoom.ts:350-405`).
- **Verificado.** La sala mantiene además estado Colyseus independiente: `gameStarted`, `gameOver`, `score`, y `Player.lives/alive`. En la sincronización ECS→schema, las vidas se leen desde `Health.current` por jugador; el GameState global, si existiese, aportaría `score` (`server/src/AsteroidsRoom.ts:120-150,350-405`).
- **Verificado.** El sistema de estado puede crear oleadas al terminar intermission o al quedar sin asteroides, pero necesita `GameState` y no tiene guard interno de autoridad (`src/games/asteroids/systems/AsteroidGameStateSystem.ts:45-130`).

### Qué no se pudo verificar

- No se ejecutó una sesión multiplayer completa para observar transiciones reales de oleada/intermission/game-over.
- No se determinó qué semántica de vidas pretende el producto para cuatro jugadores: vidas globales compartidas o vidas independientes por jugador.

### Prueba de caracterización necesaria

Crear el World usando el mismo `AsteroidsGame({ isMultiplayer: true, gameOptions: { networkRole: "server" } })` y la ruta de bootstrap invocada por `AsteroidsRoom.setupSimulation`; comprobar que el sistema de estado está registrado pero `getSingleton("GameState")` devuelve `undefined`. Añadir una prueba de sala que ejecute `start_game`, agote asteroides y verifique que no aparece transición de GameState ni nueva oleada gobernada por ese sistema. Mantener aparte una prueba que verifique que el schema Colyseus sí conserva su estado de sala/jugadores.

### Solución propuesta

U1e: bootstrap server-only de un componente ECS `GameState` autoritativo, replicado como entidad normal. No crear otra copia de score/lives en paralelo sin definir explícitamente qué campos son autoridad ECS y cuáles son proyección de schema.

### Riesgos y cierre

- **Checkpoint humano obligatorio:** decidir vidas globales frente a vidas por jugador en salas de hasta cuatro jugadores.
- Definir cómo `game:over` y la proyección a `AsteroidsState.gameOver` derivan de esa política.
- Verificar que oleadas e intermission tienen un único dueño y que el cliente no las vuelve a generar.
- Cerrar con pruebas de bootstrap, oleadas, intermission, desconexión/muerte de jugadores y CI.

**Implementación:** no implementada; depende de decisión humana sobre vidas/game-over. U1e queda `pending`.

## H3 — Predicción cliente ejecuta World completo con RNG desbloqueado

**Estado: Confirmada.**

### Evidencia inspeccionada

- **Verificado.** `AsteroidsGame` construye `new NetworkController(this.world)` sin proporcionar `runSimStep` (`src/games/asteroids/AsteroidsGame.ts:130-145`).
- **Verificado.** El constructor de `NetworkController` usa `world.update(dt)` como implementación por defecto de `runSimStep` (`packages/core/src/network/NetworkController.ts:25-43`).
- **Verificado.** `predictLocalPlayer` aplica el frame a la entidad LocalPlayer y llama a `runSimulationStep`; no restringe las fases/sistemas (`packages/core/src/network/NetworkController.ts:45-70`).
- **Verificado.** `runSimulationStep` desbloquea `world.gameplayRandom` antes de ejecutar el callback y lo vuelve a bloquear al terminar si estaba bloqueado (`packages/core/src/network/NetworkController.ts:72-95`).
- **Verificado.** El hook predice el frame al enviarlo y, al recibir cada serverState, llama a `updateFromServer` y vuelve a predecir todos los `pendingInputs`. No ejecuta rollback del World ni descarta inputs ya reconocidos en este hook (`src/hooks/useMultiplayerGame.ts:85-135`).
- **Verificado.** Asteroids registra en multiplayer cliente los sistemas de Collision/GameRules, incluyendo `AsteroidCollisionSystem`, `LootSystem`, `DifficultyDirectorSystem` y `MissionSystem`; el guard existente solo condiciona `AsteroidGameStateSystem` por rol (`src/games/asteroids/AsteroidsGame.ts:190-245`).
- **Verificado.** El Schedule completo recorre las fases configuradas y desbloquea el RNG al entrar en update; no es una llamada acotada a física (`packages/core/src/ecs/Schedule.ts:130-250`).

### Qué no se pudo verificar

- No se midió en ejecución cuántas llamadas de RNG produce cada sistema cliente durante una predicción real.
- No se cuantificó la divergencia entre snapshot autoritativo y cliente ni el impacto concreto en colisiones/loot.
- No se inspeccionó un rollback real de predicción; el hook observado re-aplica inputs, pero el alcance de otros adaptadores o estrategias no se extrapola.

### Prueba de caracterización necesaria

Con dos Worlds Asteroids inicializados como cliente y servidor, instalar un sistema espía en GameRules y otro que consuma el RNG de gameplay; enviar un input mediante `predictLocalPlayer`. Caracterizar que el callback actual visita el sistema de GameRules y que el RNG está desbloqueado durante la predicción. Repetir con un frame pendiente tras un snapshot para contar replays. El test debe usar seed explícita y no introducir aleatoriedad no determinista.

### Solución propuesta

U1c: inyectar un `runSimStep` específico de Asteroids que ejecute exclusivamente el movimiento/predicción de la nave local (rotación, thrust y física requerida), sin fases de colisión, reglas, loot, misiones ni sistemas de spawn. Mantener RNG de gameplay bloqueado; la predicción física no debe consumirlo. Primero comprobar si el Schedule/World actual permite una ejecución selectiva sin tocar `packages/core`. Si no, documentar el bloqueo y solicitar una API acotada en una unidad separada; no modificar core aquí.

### Riesgos y cierre

- La predicción local debe mantener paridad con la física autoritativa relevante sin duplicar reglas compartidas.
- No simular entidades remotas ni crear balas/efectos autoritativos en el cliente.
- No convertir el re-play del hook en rollback real: rollback queda fuera de alcance.
- Cerrar con tests de aislamiento de fases, RNG bloqueado, movimiento y reconciliación visual, más CI.

**Implementación:** no implementada; requiere caracterización y prueba de aislamiento. U1c queda `pending`.

## H4 — Entidades fantasma en el cliente

**Estado: Confirmada con límite por filtrado de snapshots.**

### Evidencia inspeccionada

- **Verificado.** `NetworkReplicator.replicate` itera únicamente `snapshot.entities`, reconstruye componentes y llama a `resolveEntity` para crear/actualizar cada ID presente. No compara el conjunto previo de mappings con el snapshot ni llama a `removeMapping` o elimina entidades ausentes (`packages/core/src/network/NetworkManager.ts:45-125`).
- **Verificado.** `removeMapping` existe como método de la interfaz/implementación, pero no es invocado por `replicate` (`packages/core/src/network/NetworkManager.ts:30-80,90-125`).
- **Verificado.** `WorldSnapshot` define `entities`, `componentData` o `soaComponentData` y metadatos, pero no declara `destroyedEntities` (`packages/core/src/snapshots/WorldSnapshot.ts:1-105`).
- **Verificado.** El modo binario filtra el snapshot por `interestIds` mediante `filterSoASnapshot`; el budget manager aplica selección limitada por cliente, según la estrategia y el ledger previo (`server/src/replication/BinaryReplicationStrategy.ts:1-50`; `packages/core/src/network/MultiplayerSystems.ts:235-330`; `server/src/AsteroidsRoom.ts:26-76`).

### Qué no se pudo verificar

- No se ejecutó el ciclo snapshot→omisión→snapshot posterior para observar la permanencia de una entidad concreta en un cliente.
- No se inspeccionaron todos los adaptadores de transporte/consumidores de snapshots para determinar si alguno poda entidades por una ruta distinta.
- No se verificó que el formato delta preserve semántica de ausencia equivalente a un snapshot completo.

### Prueba de caracterización necesaria

Test directo de `NetworkReplicator`: replicar snapshot A con entidad E, luego snapshot B sin E y comprobar si E/mapping siguen en el World cliente. Test adicional de `BinaryReplicationStrategy`: entidad fuera del presupuesto que desaparece de un paquete debe conservarse; una destrucción explícita debe retirarse solo al recibir su tombstone. Ejecutar ambos casos para SoA y AoS/delta si se mantienen esas rutas.

### Solución propuesta

U1d: incorporar tombstones explícitos `destroyedEntities` en el protocolo de snapshot/delta y consumirlos en reconciliación para eliminar mapping y entidad local. No podar por ausencia. Mantener separadas destrucciones autoritativas y entidades simplemente omitidas por AOI/presupuesto.

### Riesgos y cierre

- Cambio de protocolo compatible con clientes antiguos o versionado explícito.
- Definir vida útil/ack de tombstones para no perder destrucciones entre paquetes.
- Distinguir IDs locales de IDs servidor y no borrar previews/client-only por error.
- Probar budget binario, snapshots completos, deltas, reconexión y reutilización de IDs/generaciones.

**Implementación:** no implementada; requiere diseño del protocolo y pruebas de omisión frente a destrucción. U1d queda `pending`.

## Matriz de autoridad propuesta (no implementada)

| Sistema/ruta | Single | Client | Server | Propuesta |
|---|---:|---:|---:|---|
| AsteroidInputSystem / nave local | Sí | Sí, solo LocalPlayer | Sí, solo Ship de sesión | Distinguir query por `NetworkRole` |
| AsteroidGameStateSystem | Sí | No | Sí | Bootstrap GameState solo servidor en multiplayer |
| AsteroidCollisionSystem | Sí | Predicción acotada; no reglas autoritativas | Sí | Cliente no ejecuta resolución compartida durante predicción |
| DifficultyDirectorSystem | Sí | No durante predicción | Sí | Autoridad servidor |
| LootSystem | Sí | No durante predicción | Sí | Autoridad servidor |
| MissionSystem | Sí | UI/proyección local solo si se define | Sí | Definir eventos autoritativos y proyección |
| Movement/physics de nave local | Sí | Sí para nave local | Sí para todas las naves | Predecir solo entidad local |

Esta matriz es propuesta de diseño, no contrato verificado ni autorización para ampliar U1a.

## Seguimiento fuera de alcance

- Hyperspace: RNG de destino, preview y autoridad de la posición; no tocar en esta unidad.
- Rollback real de predicción: el hook actual re-aplica pending inputs; no diseñar/implementar rollback aquí.
- `SafeSpawn.ts`, U2–U10, merge SoA y `SystemConfig.authority`: fuera de alcance.
- No ampliar el guard de U1a en esta invocación; la matriz anterior solo registra propuesta.
- Decisión humana de vidas/global game-over para cuatro jugadores, requisito previo de U1e.

## Estado de pruebas y CI

No se añadieron tests ni cambios de runtime en esta invocación. Se inspeccionaron las pruebas existentes y se detectó que `AsteroidsMultiplayer.test.ts` crea manualmente `LocalPlayer`, por lo que no caracteriza la ruta `AsteroidsRoom.spawnPlayer` (`src/games/asteroids/__tests__/AsteroidsMultiplayer.test.ts:1-75`). No se ejecutaron Jest, E2E ni `pnpm run ci`; el estado de CI es **no ejecutado / desconocido**, nunca verde. La siguiente implementación debe añadir primero los tests de caracterización indicados y ejecutarlos antes de considerar cualquier corrección.
