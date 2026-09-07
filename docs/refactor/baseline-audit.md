# Baseline Audit: BaseGame y Subclases de Juego

Este documento presenta la auditoría baseline de `packages/core/src/runtime/BaseGame.ts` y las seis clases de juegos concretos que lo extienden (`AsteroidsGame`, `PongGame`, `SpaceInvadersGame`, `GeometryWarsGame`, `FlappyBirdGame` y `EchoRunnerGame`).

---

## Tabla de Clasificación de Miembros de BaseGame

Categorías utilizadas:
- **DEFINITION**: describe el juego (hooks abstractos, configuración, registrador de blueprints, mutadores).
- **SIMULATION**: mecánica y estado del juego (step, snapshot, restore, hash, input, tick, RNG, congelamiento/pausa de simulación).
- **PRESENTATION**: renderizado y capa visual (sceneManager, canvas, GameLoop, resize listeners, VFX).
- **SERVICE**: infraestructura y utilidades transversales (audio, red, diagnósticos/debugManager, eventBus).

### Propriades, Getters y Setters Públicos/Protegidos

| Miembro | Categoría | Descripción | Sobreescrito / Duplicado en Subclases (Archivo y Líneas) |
|---|---|---|---|
| `tick` | SIMULATION | Getter de número de tick actual del `World`. | Ninguno. |
| `state` | SIMULATION | Getter del estado de alto nivel (`getGameState()`). | Ninguno. |
| `world` | SIMULATION | Instancia principal del `World` ECS. | Sobreescrito con tipo retornado específico en `SpaceInvadersGame` (`src/games/space-invaders/SpaceInvadersGame.ts:543-545`), `GeometryWarsGame` (`src/games/geometrywars/GeometryWarsGame.ts:280-286` retornando la escena activa), y `FlappyBirdGame` (`src/games/flappybird/FlappyBirdGame.ts:488-490`). |
| `eventBus` | SERVICE | Bus central de eventos de tipo `EventBus<TEvents>`. | Ninguno. |
| `blueprints` | DEFINITION | Registro de planos de entidades `BlueprintRegistry`. | Ninguno. |
| `loop` | PRESENTATION | Runner del bucle de juego `GameLoop`. | Ninguno. |
| `unifiedInput` | SIMULATION | Sistema unificado de entrada `IInputSystem<TInput>`. | Ninguno. |
| `_config` | DEFINITION | Opciones de configuración base del juego `BaseGameConfig`. | Accesado/re-asignado en `onRegisterSystems` de varias subclases. |
| `kernel` | SERVICE | Máquina de estados de sesión/flujo `ArcadeKernel`. | Ninguno. |
| `sceneManager` | PRESENTATION | Gestor de escenas de presentación `SceneManager`. | Usado/destruido explícitamente en `SpaceInvadersGame` y `GeometryWarsGame`. |
| `audio` | SERVICE | Reproductor de audio `IAudioPlayer`. | Ninguno. |
| `canvas` | PRESENTATION | Elemento HTMLCanvasElement objetivo de renderizado. | Ninguno. |
| `debugManager` | SERVICE | Interface de diagnósticos y métricas para overlays. | Ninguno. |

### Métodos Públicos y Protegidos

| Miembro | Categoría | Descripción | Sobreescrito / Duplicado en Subclases (Archivo y Líneas) |
|---|---|---|---|
| `step(input)` | SIMULATION | Avanza la simulación exactamente 1 tick con un frame de input compacto. | Ninguno. |
| `onApplyInputFrame(input)` | SIMULATION | Hook protegido para decodificar bitmasks de entrada. | Ninguno. |
| `snapshot()` | SIMULATION | Captura un `WorldSnapshot` serializable. | Ninguno. |
| `restore(snapshot)` | SIMULATION | Restaura el estado desde un `WorldSnapshot`. | Ninguno. |
| `hash()` | SIMULATION | Calcula hash FNV-1a determinista del estado. | Ninguno. |
| `getWorld()` | SIMULATION | Devuelve la instancia del `World`. | Sobreescrito en `SpaceInvadersGame.ts:543-545`, `GeometryWarsGame.ts:280-286` (devuelve el world de `currentScene`), `FlappyBirdGame.ts:488-490`. |
| `getEventBus()` | SERVICE | Devuelve el `EventBus`. | Ninguno. |
| `getInputSystem()` | SIMULATION | Devuelve el sistema de entrada unificado. | Ninguno. |
| `getGameLoop()` | PRESENTATION | Devuelve el `GameLoop`. | Ninguno. |
| `getLastError()` | SERVICE | Devuelve el último error capturado por el bucle. | Ninguno. |
| `subscribeError(cb)` | SERVICE | Suscribe listener a errores no manejados del bucle. | Ninguno. |
| `init()` | DEFINITION / SIMULATION | Template method de inicialización asíncrona. | Ninguno. |
| `start()` | SIMULATION | Inicia la ejecución del bucle de juego. | Sobreescrito en `AsteroidsGame.ts:377-380` y `SpaceInvadersGame.ts:653-656` únicamente para añadir `console.log`. |
| `pause()` | SIMULATION | Pausa el bucle e indica `IsPaused` en el world. | Sobreescrito en `AsteroidsGame.ts:388-391` (duplica log) y `SpaceInvadersGame.ts:662-666` (duplica `setResource("IsPaused", true)` + log). |
| `resume()` | SIMULATION | Reanuda el bucle y remueve `IsPaused` del world. | Sobreescrito en `AsteroidsGame.ts:393-396` (duplica log) y `SpaceInvadersGame.ts:668-672` (duplica `deleteResource/setResource("IsPaused", false)` + log). |
| `isPausedState()` | SIMULATION | Indica si el juego está en estado pausado. | Ninguno. |
| `enterGameplayFreeze(duration)` | SIMULATION | Soft pause / congelamiento temporal de gameplay. | Ninguno. |
| `exitGameplayFreeze()` | SIMULATION | Sale del congelamiento de gameplay. | Ninguno. |
| `isGameplayFrozen()` | SIMULATION | Indica si el gameplay está congelado. | Ninguno. |
| `getGameplayFreezeRemaining()` | SIMULATION | Devuelve el tiempo restante de congelamiento. | Ninguno. |
| `getLifecycleState()` | SIMULATION | Devuelve el `GameLifecycleState` actual. | Ninguno. |
| `stop()` | SIMULATION | Detiene la ejecución del bucle de juego. | Sobreescrito en `SpaceInvadersGame.ts:658-660` (override que NO llama a `super.stop()`, solo emite un `console.log`). |
| `calculateScreenConfig()` | PRESENTATION | Calcula dimensiones de pantalla y pixelRatio. | Ninguno. |
| `handleScreenResize()` | PRESENTATION | Actualiza el recurso `"ScreenConfig"` en el world. | Ninguno. |
| `registerResizeListener()` | PRESENTATION | Adjunta listener de evento `"resize"` de ventana. | Ninguno. |
| `unregisterResizeListener()` | PRESENTATION | Remueve listener de evento `"resize"`. | Ninguno. |
| `setupCommonArcadeResources(canvas)` | PRESENTATION | Configura recursos comunes de arcade y pantalla. | Invocado explícitamente en `onRegisterSystems` de casi todas las subclases. |
| `applyServerStateUpdate(update)` | SERVICE / SIMULATION | Aplica snapshot/recursos de servidor y hace `flush()`. | Ninguno (utilizado como implementación heredada o complementada por controladores de red locales). |
| `destroy()` | SIMULATION / SERVICE | Limpia sistemas, eventos, listeners y bucle. | Sobreescrito en `AsteroidsGame.ts:382-386` (llama a `super.destroy()` y limpia pools de proyectiles/partículas). |
| `restart(seed)` | SIMULATION | Reinicia la sesión recreando el `World`. | Ninguno. |
| `subscribe(cb)` | PRESENTATION | Suscribe callback a ticks de renderizado del bucle. | Ninguno. |
| `update(dt)` | SIMULATION | Método abstracto ejecutado cada tick de simulación. | Implementado obligatoriamente en los 6 juegos (`AsteroidsGame.ts:260-262`, `PongGame.ts:248-267`, `SpaceInvadersGame.ts:406-444`, `GeometryWarsGame.ts:91-97`, `FlappyBirdGame.ts:317-319`, `EchoRunnerGame.ts:473-489`). |
| `onRegisterSystems()` | DEFINITION | Hook protegido para registrar sistemas en el Schedule. | Implementado obligatoriamente en los 6 juegos. |
| `onInitializeEntities()` | DEFINITION | Hook protegido para spawnear entidades e instancias iniciales. | Implementado en los 6 juegos. |
| `onBeforeRestart()` | DEFINITION / SIMULATION | Hook protegido ejecutado antes del restart. | Sobreescrito en `PongGame.ts:244-246`, `SpaceInvadersGame.ts:381-383`, `FlappyBirdGame.ts:310-315`. |
| `getGameState()` | SIMULATION | Método abstracto que devuelve el objeto de estado del juego. | Implementado obligatoriamente en los 6 juegos. |
| `getSeed()` | SIMULATION | Devuelve la semilla inicial de aleatoriedad. | Ninguno. |
| `isGameOver()` | SIMULATION | Método abstracto que indica si el juego ha terminado. | Implementado obligatoriamente en los 6 juegos. |
| `setInputState(input)` | SIMULATION | Ajusta anulaciones de entrada en el sistema de input. | Sobreescrito en `AsteroidsGame.ts:334-375`, `SpaceInvadersGame.ts:553-579`, `GeometryWarsGame.ts:292-334`, `FlappyBirdGame.ts:332-360`, `EchoRunnerGame.ts:491-493`. |
| `createBaseEntity(deferred)` | SIMULATION | Helper protegido para instanciar entidad base. | Ninguno. |

---

## Estado actual de la frontera Definition/Simulation

### 1. ¿`AsteroidsDefinition.createSimulation()` devuelve una instancia "pura" de `Simulation`?

**No**. `AsteroidsDefinition.createSimulation()` devuelve una instancia completa de `AsteroidsGame`, la cual extiende de `BaseGame`.

**Evidencia de código (`src/games/asteroids/AsteroidsDefinition.ts`):**
```typescript
export const AsteroidsDefinition: GameDefinition = {
  name: "asteroids",
  createSimulation: (seed: number) => {
    const game = new AsteroidsGame({ gameOptions: { seed } });
    return game;
  },
  // ...
};
```

**Análisis:**
`AsteroidsGame` satisface la interfaz `Simulation` únicamente por *duck typing* (ya que `BaseGame` implementa los miembros requeridos por la interfaz `Simulation`: `step`, `snapshot`, `restore`, `hash`, `tick`, `state`). Sin embargo, al instanciarse `AsteroidsGame`, se cargan e inicializan acopladamente:
- **Presentación:** Sistemas de renderizado (`ScreenShakeSystem`, `JuiceSystem`, `RenderUpdateSystem`, `TrailSystem`, `ParticleSystem`, `AnimationSystem`), administradores de escena (`SceneManager`), y listeners de redimensionamiento de ventana.
- **Servicios:** Reproductor de audio (`WebAudioPlayer`), cargador e inyector de assets (`AssetLoader`, `WebAssetProvider`), controlador de red multijugador (`NetworkController`, `NetworkManager`).

Por lo tanto, hoy en día "crear una simulación" implica instanciar una aplicación de juego completa con todos sus servicios y capa gráfica incluidos.

---

### 2. ¿Qué responsabilidades de `GameInstance` (si existiera) ya cubre `packages/core/src/runtime/GameSession.ts` hoy?

`packages/core/src/runtime/GameSession.ts` **ya cubre la gran mayoría del rol de orquestación y ejecución de sesión** que hipotéticamente se le asignaría a un `GameInstance`:

**Evidencia de código (`packages/core/src/runtime/GameSession.ts`):**
1. **Ownership de la simulación y definición:** Almacena la `gameDefinition` y crea/mantiene la instancia de `Simulation` (`this.simulation = gameDefinition.createSimulation(seed)`).
2. **Lifecycle y máquina de estados:** Posee y gestiona la máquina de estados `ArcadeKernel` (`this.kernel`), controlando estados como `PLAYING`, `PAUSED`, `GAME_OVER`.
3. **Grabación de Replays deterministas y entrada:** Mantiene un `DeterministicReplayRecorder` e `inputHistory`, registrando la semilla inicial, capturando el estado inicial (`captureInitialState`) y grabando cada cuadro de entrada procesado.
4. **Ejecución y desacoplamiento de ticker:** Su método `playTick(input)` se encarga de:
   - Avanzar la simulación exactamente un paso (`this.simulation.step(input)`).
   - Registrar la entrada en el recorder y el historial.
   - Evaluar la condición de `isGameOver` para transicionar el `kernel` a `ArcadeState.GAME_OVER`.
   - Emitir eventos de tick (`session:tick`) a través del `EventBus` para notificar a la capa de presentación/audio sin acoplamiento directo.
5. **Control de tiempo externo:** En su constructor, desactiva automáticamente cualquier bucle de tiempo interno heredado (`sim.getGameLoop().stopInternalLoop()`), asumiendo el control de los pasos de simulación impulsados externamente.

**Conclusión:**
`GameSession` ya actúa como el runtime / runner concreto de un `GameDefinition`.
