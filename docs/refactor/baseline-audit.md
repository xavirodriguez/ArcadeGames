# Auditoría Baseline de `BaseGame` y Subclases

Este documento constituye el informe de auditoría de la Fase 0 para `packages/core/src/runtime/BaseGame.ts` y las subclases de juegos en `src/games/*`.

---

## Auditoría de Miembros de `BaseGame`

A continuación se clasifican todos los miembros públicos y protegidos de `BaseGame` en las cuatro categorías principales:
- **DEFINITION**: describe el juego (hooks abstractos, config, blueprints).
- **SIMULATION**: mecánica del juego, ECS, estado, snapshot, restore, hash, input, tick, RNG, lifecycle de simulación.
- **PRESENTATION**: renderizado, gestión de escenas, viewport, resizing, VFX visuales.
- **SERVICE**: audio, red, depuración, diagnósticos, almacenamiento.

| Miembro | Categoría | Descripción | Sobreescrito / Duplicado en Subclases |
| :--- | :--- | :--- | :--- |
| `tick` (getter) | SIMULATION | Devuelve el tick actual del `World` ECS. | Ninguno. |
| `state` (getter) | SIMULATION | Devuelve la representación de estado del juego llamando a `getGameState()`. | Ninguno. |
| `step(input)` | SIMULATION | Avanza la simulación 1 tick (1/60s) aplicando el frame de input. | Ninguno. |
| `onApplyInputFrame(input)` | SIMULATION | Hook protegido para decodificar bitmasks de entrada. | Ninguno. |
| `snapshot()` | SIMULATION | Captura un `WorldSnapshot` del `World`. | Ninguno. |
| `restore(snapshot)` | SIMULATION | Restaura el estado del `World` desde un snapshot. | Ninguno. |
| `hash()` | SIMULATION | Calcula un hash FNV-1a binario/AoS del estado de simulación. | Ninguno. |
| `world` | SIMULATION | Instancia primaria del contenedor ECS `World`. | `SpaceInvadersGame` (L563), `GeometryWarsGame` (L297), `FlappyBirdGame` (L490) duplican esto mediante un getter `getWorld()`. |
| `eventBus` | SIMULATION | Instancia central de `EventBus`. | Ninguno. |
| `blueprints` | DEFINITION | Registro central de blueprints/prefabs. | Ninguno. |
| `loop` | SIMULATION / PRESENTATION | Ticker `GameLoop` interno (60 FPS). | Ninguno. |
| `unifiedInput` | SIMULATION / SERVICE | Sistema unificado de entrada (`IInputSystem`). | Ninguno. |
| `_config` | DEFINITION | Configuración base del juego (`BaseGameConfig`). | Ninguno. |
| `kernel` | SIMULATION / SERVICE | Máquina de estados de sesión (`ArcadeKernel`). | Ninguno. |
| `sceneManager` | PRESENTATION | Gestor de escenas y transiciones narrativas/visuales. | Ninguno. |
| `audio` | SERVICE | Interfaz de reproducción de audio (`IAudioPlayer`). | Ninguno. |
| `canvas` | PRESENTATION | Referencia opcional al elemento Canvas HTML. | Ninguno. |
| `debugManager` (getter) | SERVICE | Interfaz para diagnósticos, timings, event logs y colisionadores. | Ninguno. |
| `getWorld()` | SIMULATION | Getter para obtener la instancia de `World`. | Sobreescrito/redefinido en `SpaceInvadersGame.ts` (L563), `GeometryWarsGame.ts` (L297) [retorna `scene.getWorld()`], `FlappyBirdGame.ts` (L490). |
| `getEventBus()` | SIMULATION | Getter para obtener el `EventBus`. | Ninguno. |
| `getInputSystem()` | SIMULATION / SERVICE | Getter para obtener el `IInputSystem`. | Ninguno. |
| `getGameLoop()` | SIMULATION | Getter para obtener el `GameLoop`. | Ninguno. |
| `getLastError()` | SIMULATION / SERVICE | Devuelve el último error capturado por el ticker. | Ninguno. |
| `subscribeError(cb)` | SERVICE | Suscripción a excepciones no capturadas del loop. | Ninguno. |
| `init()` | SIMULATION / LIFECYCLE | Plantilla asíncrona de inicialización (`onRegisterSystems` -> `onInitializeEntities` -> `start`). | Ninguno. |
| `start()` | SIMULATION / LIFECYCLE | Arranca la ejecución del bucle de juego. | Sobreescrito en `AsteroidsGame.ts` (L386) [solo agrega `console.log`], `SpaceInvadersGame.ts` (L701) [solo agrega `console.log`]. |
| `pause()` | SIMULATION / LIFECYCLE | Pausa el bucle y asigna la del recurso `"IsPaused"`. | Sobreescrito en `AsteroidsGame.ts` (L397) [duplica `super.pause()` + log], `SpaceInvadersGame.ts` (L710) [duplica `setResource` + log]. |
| `resume()` | SIMULATION / LIFECYCLE | Reanuda el bucle y remueve el recurso `"IsPaused"`. | Sobreescrito en `AsteroidsGame.ts` (L402) [duplica `super.resume()` + log], `SpaceInvadersGame.ts` (L716) [duplica `setResource` + log]. |
| `isPausedState()` | SIMULATION | Indica si el juego está en estado pausado. | Ninguno. |
| `enterGameplayFreeze(duration)` | SIMULATION | Congelamiento suave de simulación. | Ninguno. |
| `exitGameplayFreeze()` | SIMULATION | Salida de congelamiento suave. | Ninguno. |
| `isGameplayFrozen()` | SIMULATION | Consulta de congelamiento de gameplay. | Ninguno. |
| `getGameplayFreezeRemaining()` | SIMULATION | Tiempo restante de congelamiento. | Ninguno. |
| `getLifecycleState()` | SIMULATION / LIFECYCLE | Devuelve el estado actual (`GameLifecycleState`). | Ninguno. |
| `stop()` | SIMULATION / LIFECYCLE | Detiene la ejecución del ticker. | Definido independientemente / sobreescrito en `SpaceInvadersGame.ts` (L706) [agrega log sin llamar a `super.stop()`]. |
| `calculateScreenConfig()` | PRESENTATION | Computa dimensiones de pantalla/canvas y ratio de píxeles. | Ninguno. |
| `handleScreenResize()` | PRESENTATION | Recalcula la config de pantalla y actualiza recurso `"ScreenConfig"`. | Ninguno. |
| `registerResizeListener()` | PRESENTATION | Registra el listener de evento `resize` de ventana. | Ninguno. |
| `unregisterResizeListener()` | PRESENTATION | Remueve el listener de evento `resize`. | Ninguno. |
| `setupCommonArcadeResources()` | PRESENTATION | Configura pantalla y listener de resize. | Invocado explícitamente en `AsteroidsGame` (L122), `SpaceInvadersGame` (L87), `PongGame` (L111), `GeometryWarsGame` (L71), `FlappyBirdGame` (L65), `EchoRunnerGame` (L231). |
| `applyServerStateUpdate(update)` | SERVICE | Aplica actualizaciones del servidor al `World` y ejecuta `flush()`. | Sobreescrito/no usado directamente en subclases; varias subclases (`SpaceInvadersGame` L605, `GeometryWarsGame` L152, `FlappyBirdGame` L301, `PongGame` L374) implementan su propia versión `updateFromServer`. |
| `destroy()` | SIMULATION / LIFECYCLE | Destruye el loop, horarios y listeners. | Sobreescrito en `AsteroidsGame.ts` (L391) [llama a `super.destroy()` y limpia pools]. |
| `restart(seed)` | SIMULATION / LIFECYCLE | Reinicia la sesión recreando el `World` e invocando `init()`. | Ninguno. |
| `subscribe(cb)` | PRESENTATION / SERVICE | Suscribe callbacks a updates de renderizado. | Ninguno. |
| `update(dt)` | SIMULATION | Método abstracto para avanzar la lógica por frame. | Implementado por todos los juegos. |
| `onRegisterSystems()` | DEFINITION | Hook protegido para registrar sistemas en la agenda. | Implementado por todos los juegos. |
| `onInitializeEntities()` | DEFINITION | Hook protegido para spawnear entidades iniciales. | Implementado por todos los juegos. |
| `onBeforeRestart()` | DEFINITION / LIFECYCLE | Hook protegido para teardown pre-reinico. | Implementado en `PongGame.ts` (L302), `SpaceInvadersGame.ts` (L408), `FlappyBirdGame.ts` (L267). |
| `getGameState()` | SIMULATION | Método abstracto que retorna la foto de estado del juego. | Implementado por todos los juegos. |
| `getSeed()` | SIMULATION | Devuelve la semilla RNG de la sesión. | Ninguno. |
| `isGameOver()` | SIMULATION | Método abstracto que indica si terminó la partida. | Implementado por todos los juegos. |
| `setInputState(input)` | SIMULATION / SERVICE | Inyecta estado de entrada en entidades/jugadores. | Sobreescrito en `AsteroidsGame.ts` (L385/L425), `SpaceInvadersGame.ts` (L571), `GeometryWarsGame.ts` (L308), `FlappyBirdGame.ts` (L287), `EchoRunnerGame.ts` (L497). |
| `createBaseEntity(deferred)` | SIMULATION / DEFINITION | Helper protegido para crear entidades directas o diferidas. | Ninguno. |

---

## Estado actual de la frontera Definition/Simulation

### 1. ¿`AsteroidsDefinition.createSimulation()` devuelve una instancia "pura" de `Simulation`, o devuelve una instancia completa de `BaseGame`?

**Respuesta:**
`AsteroidsDefinition.createSimulation()` (en `src/games/asteroids/AsteroidsDefinition.ts`, líneas 5-8) **NO** devuelve una instancia "pura" de `Simulation`.

Devuelve una instancia completa de `AsteroidsGame` (creada mediante `new AsteroidsGame({ gameOptions: { seed } })`), la cual extiende `BaseGame`. Esta instancia incluye de forma acoplada:
- Capa de presentación (gestor de assets `AssetLoader`, `SceneManager`, renderers de canvas visuales, utilidades VFX).
- Capa de servicios (reproductor de audio `WebAudioPlayer`, controlador de red `NetworkController`).
- Ticker e hilo de loop interno (`GameLoop`).

Satisface la interfaz `Simulation` únicamente por **duck typing**, ya que `BaseGame` implementa los métodos requeridos (`tick`, `state`, `step(input)`, `snapshot()`, `restore()`, `hash()`).

---

### 2. ¿Qué responsabilidades de GameInstance (si existiera) ya cubre `packages/core/src/runtime/GameSession.ts` hoy?

**Respuesta:**
`packages/core/src/runtime/GameSession.ts` **ya cubre la totalidad del rol de orquestación y ejecución de un juego**:

1. **Gestión de Lifecycle:** Posee y gestiona el estado de sesión mediante una instancia de `ArcadeKernel` (`this.kernel`).
2. **Orquestación de Ticking Desacoplado:** `GameSession.playTick(input)` se encarga de:
   - Avanzar la simulación explícitamente via `simulation.step(input)`.
   - Desactivar automáticamente cualquier loop/ticker interno legacy presente en la simulación (`sim.getGameLoop().stopInternalLoop()`) para evitar doble ticking.
3. **Grabación de Replays Deterministas:** Integra directamente `DeterministicReplayRecorder` y mantiene el historial de entradas (`inputHistory`).
4. **Evaluación de Fin de Juego:** Evalúa la condición `simulation.isGameOver()` tras cada tick y realiza la transición a `ArcadeState.GAME_OVER` en el `ArcadeKernel`.
5. **Difusión de Eventos:** Emite eventos `session:tick` sobre el `eventBus` de la simulación para notificar a capas de presentación y audio.

**Conclusión:**
`GameSession` ya cumple el rol de orquestador de ejecución (`GameInstance`). No existe una pieza faltante en esa capa. El problema estructural actual estriba en que la `Simulation` producida por `GameDefinition.createSimulation()` es en realidad un `BaseGame` monolítico con presentación y servicios embebidos.
