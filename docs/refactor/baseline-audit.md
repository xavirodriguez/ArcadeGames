# Auditoría de Línea de Base: `BaseGame` y Subclases de Juegos

Este documento contiene la auditoría completa de `packages/core/src/runtime/BaseGame.ts` y las clases de juegos concretos que extienden `BaseGame` (`AsteroidsGame`, `SpaceInvadersGame`, `PongGame`, `GeometryWarsGame`, `FlappyBirdGame`, `EchoRunnerGame`).

---

## Tabla de Clasificación de Miembros de `BaseGame`

Categorías:
- **DEFINITION**: Describe el juego (hooks abstractos, configuración, registros de blueprints).
- **SIMULATION**: Ejecución y estado de la simulación (step, snapshot, restore, hash, input, tick, RNG, lifecycle de simulación).
- **PRESENTATION**: Escenas, renderizado, viewport y efectos visuales/VFX.
- **SERVICE**: Audio, red, diagnóstico/debug, registros de eventos y almacenamiento.

| Miembro de `BaseGame` | Tipo | Categoría | Descripción / Responsabilidad | Subclases que Sobreescriben o Duplican (Archivo y Líneas) |
| :--- | :--- | :--- | :--- | :--- |
| `tick` | Public Getter | **SIMULATION** | Retorna el tick actual del `World` ECS. | Ninguna |
| `state` | Public Getter | **SIMULATION** | Retorna el estado de alto nivel vía `getGameState()`. | Ninguna |
| `step(input)` | Public Method | **SIMULATION** | Avanza la simulación 1 tick (1/60s) aplicando input compacto. | Ninguna |
| `onApplyInputFrame(input)`| Protected Method| **SIMULATION** | Hook para decodificar bitmasks de input compacto. | Ninguna |
| `snapshot()` | Public Method | **SIMULATION** | Captura un `WorldSnapshot` serializable. | Ninguna |
| `restore(snapshot)` | Public Method | **SIMULATION** | Restaura el estado desde un `WorldSnapshot`. | Ninguna |
| `hash()` | Public Method | **SIMULATION** | Calcula el hash FNV-1a determinista de la simulación. | Ninguna |
| `world` | Public Field | **SIMULATION** | Instancia principal del contenedor ECS `World`. | Ninguna |
| `eventBus` | Public Field | **SERVICE** | Bus central de eventos tipados `EventBus`. | Ninguna |
| `blueprints` | Public Field | **DEFINITION** | Registro de blueprints y prefabs de entidades. | Ninguna |
| `loop` | Protected Field| **SIMULATION** | Instancia de `GameLoop` para el ticker frame-a-frame. | Ninguna |
| `unifiedInput` | Protected Field| **SIMULATION** | Sistema de input unificado `IInputSystem`. | Ninguna |
| `_config` | Protected Field| **DEFINITION** | Configuración base inicial del juego (`BaseGameConfig`). | Sobreescrito indirectamente como `this.config` en `AsteroidsGame.ts:93`, `SpaceInvadersGame.ts:49`, `PongGame.ts:77`, `GeometryWarsGame.ts:31`. |
| `kernel` | Public Field | **SIMULATION** | Máquina de estados de sesión de juego (`ArcadeKernel`). | Ninguna |
| `sceneManager` | Public Field | **PRESENTATION**| Gestor de escenas narrativas y transiciones. | Ninguna |
| `audio` | Public Field | **SERVICE** | Reproductor de audio de plataforma (`IAudioPlayer`). | Ninguna |
| `canvas` | Protected Field| **PRESENTATION**| Referencia al `HTMLCanvasElement` blanco de renderizado. | Ninguna |
| `debugManager` | Public Getter | **SERVICE** | Interfaz de diagnóstico, timings de sistemas y shapes de colliders. | Ninguna |
| `getWorld()` | Public Method | **SIMULATION** | Retorna la instancia de `World`. | Ninguna |
| `getEventBus()` | Public Method | **SERVICE** | Retorna la instancia de `EventBus`. | Ninguna |
| `getInputSystem()` | Public Method | **SIMULATION** | Retorna el sistema de input unificado. | Ninguna |
| `getGameLoop()` | Public Method | **SIMULATION** | Retorna la instancia de `GameLoop`. | Ninguna |
| `getLastError()` | Public Method | **SERVICE** | Retorna el último error del loop. | Ninguna |
| `subscribeError(cb)` | Public Method | **SERVICE** | Suscribe un listener a errores del loop. | Ninguna |
| `init()` | Public Method | **SIMULATION** | Método plantilla que ejecuta `onRegisterSystems` y `onInitializeEntities`. | Ninguna |
| `start()` | Public Method | **SIMULATION** | Inicia la ejecución del loop si está en estado `READY` o `STOPPED`. | **Sobreescrito:**<br>- `AsteroidsGame.ts:311-314` (Llama a `super.start()` + `console.log`) <br>- `SpaceInvadersGame.ts:639-642` (Llama a `super.start()` + `console.log`) |
| `pause()` | Public Method | **SIMULATION** | Pausa la simulación y asigna el recurso `IsPaused` en el World. | **Sobreescrito (Duplicación):**<br>- `AsteroidsGame.ts:321-324` (Llama a `super.pause()` + `console.log`)<br>- `SpaceInvadersGame.ts:649-652` (Llama a `super.pause()` + `console.log`) |
| `resume()` | Public Method | **SIMULATION** | Reanuda la simulación y elimina el recurso `IsPaused`. | **Sobreescrito (Duplicación):**<br>- `AsteroidsGame.ts:326-329` (Llama a `super.resume()` + `console.log`)<br>- `SpaceInvadersGame.ts:654-657` (Llama a `super.resume()` + `console.log`) |
| `isPausedState()` | Public Method | **SIMULATION** | Indica si el loop está en estado pausado. | Ninguna |
| `enterGameplayFreeze(d?)` | Public Method | **SIMULATION** | Congela temporalmente el gameplay mediante el recurso `GameplayFreeze`. | Ninguna |
| `exitGameplayFreeze()` | Public Method | **SIMULATION** | Descongela el gameplay eliminando el recurso `GameplayFreeze`. | Ninguna |
| `isGameplayFrozen()` | Public Method | **SIMULATION** | Verifica si el gameplay se encuentra congelado. | Ninguna |
| `getGameplayFreezeRemaining()`| Public Method| **SIMULATION** | Retorna el tiempo restante de congelamiento. | Ninguna |
| `getLifecycleState()` | Public Method | **SIMULATION** | Retorna el estado actual del ciclo de vida (`GameLifecycleState`). | Ninguna |
| `stop()` | Public Method | **SIMULATION** | Detiene el ticker del loop de juego. | Ninguna |
| `calculateScreenConfig()`| Protected Method| **PRESENTATION**| Calcula dimensiones y pixel ratio de la pantalla/canvas. | Ninguna |
| `handleScreenResize()` | Protected Method| **PRESENTATION**| Recalcula dimensiones y actualiza el recurso `ScreenConfig`. | Ninguna |
| `registerResizeListener()`| Protected Method| **PRESENTATION**| Registra listener del evento `resize` de la ventana. | Ninguna |
| `unregisterResizeListener()`| Protected Method| **PRESENTATION**| Remueve el listener de `resize`. | Ninguna |
| `setupCommonArcadeResources()`| Protected Method| **PRESENTATION**| Configura canvas, dimensiones y listener de resize. | Ninguna |
| `applyServerStateUpdate(u)`| Public Method| **SERVICE** | Aplica snapshot de servidor e invoca `world.flush()`. | Ninguna |
| `destroy()` | Public Method | **SIMULATION** | Limpia sistemas, handlers de eventos y recursos. | **Sobreescrito:**<br>- `AsteroidsGame.ts:316-319` (Llama a `super.destroy()` + limpia pools)<br>- `SpaceInvadersGame.ts:644-647` (Llama a `super.destroy()` + limpia pools)<br>- `PongGame.ts:169-174` (Llama a `super.destroy()` + limpia controllers)<br>- `FlappyBirdGame.ts:251-254` (Llama a `super.destroy()`) |
| `restart(seed?)` | Public Method | **SIMULATION** | Reinicia la sesión recreando el `World` y re-ejecutando `init()`. | Ninguna |
| `subscribe(cb)` | Public Method | **PRESENTATION**| Suscribe un listener a cambios de estado en cada frame de renderizado. | Ninguna |
| `update(dt)` | Public Abstract | **SIMULATION** | Actualiza la simulación para un intervalo `dt`. | **Implementado obligatoriamente en:**<br>- `AsteroidsGame.ts:219-221`<br>- `SpaceInvadersGame.ts:303-305`<br>- `PongGame.ts:176-178`<br>- `GeometryWarsGame.ts:133-135`<br>- `FlappyBirdGame.ts:182-184`<br>- `EchoRunnerGame.ts:570-587` |
| `onRegisterSystems()` | Protected Hook | **DEFINITION** | Hook para que subclases registren sus sistemas ECS. | **Implementado en:**<br>- `AsteroidsGame.ts:114-180`<br>- `SpaceInvadersGame.ts:108-267`<br>- `PongGame.ts:107-151`<br>- `GeometryWarsGame.ts:80-114`<br>- `FlappyBirdGame.ts:107-160`<br>- `EchoRunnerGame.ts:220-508` |
| `onInitializeEntities()`| Protected Hook | **DEFINITION** | Hook para inicializar entidades y escenas iniciales. | **Implementado en:**<br>- `AsteroidsGame.ts:181-217`<br>- `SpaceInvadersGame.ts:269-301`<br>- `PongGame.ts:153-167`<br>- `GeometryWarsGame.ts:116-131`<br>- `FlappyBirdGame.ts:162-180`<br>- `EchoRunnerGame.ts:510-568` |
| `onBeforeRestart()` | Protected Hook | **SIMULATION** | Hook previo al reinicio. | Ninguna |
| `getGameState()` | Public Abstract | **SIMULATION** | Retorna la estructura de estado del juego. | **Implementado obligatoriamente en:**<br>- `AsteroidsGame.ts:261-295`<br>- `SpaceInvadersGame.ts:348-382`<br>- `PongGame.ts:200-218`<br>- `GeometryWarsGame.ts:145-163`<br>- `FlappyBirdGame.ts:221-249`<br>- `EchoRunnerGame.ts:662-677` |
| `getSeed()` | Public Method | **SIMULATION** | Retorna el seed de simulación configurado. | Ninguna |
| `isGameOver()` | Public Abstract | **SIMULATION** | Determina si la partida ha finalizado. | **Implementado obligatoriamente en:**<br>- `AsteroidsGame.ts:297-299`<br>- `SpaceInvadersGame.ts:384-386`<br>- `PongGame.ts:188-190`<br>- `GeometryWarsGame.ts:141-143`<br>- `FlappyBirdGame.ts:213-215`<br>- `EchoRunnerGame.ts:679-681` |
| `setInputState(input)` | Public Method | **SIMULATION** | Puente de entrada de controles locales hacia el World ECS. | **Sobreescrito:**<br>- `AsteroidsGame.ts:301-310`<br>- `SpaceInvadersGame.ts:620-637`<br>- `PongGame.ts:192-198`<br>- `GeometryWarsGame.ts:137-139`<br>- `FlappyBirdGame.ts:217-219`<br>- `EchoRunnerGame.ts:589-591` |
| `createBaseEntity(d?)` | Protected Method| **SIMULATION** | Helper para creación de entidades diferidas o directas. | Ninguna |

---

## Estado actual de la frontera Definition/Simulation

### 1. ¿`AsteroidsDefinition.createSimulation()` devuelve una instancia "pura" de `Simulation`?

**Respuesta: NO.**

En `src/games/asteroids/AsteroidsDefinition.ts`:
```typescript
export const AsteroidsDefinition: GameDefinition = {
  name: "asteroids",
  createSimulation: (seed: number) => {
    const game = new AsteroidsGame({ gameOptions: { seed } });
    return game;
  },
  ...
};
```

`AsteroidsDefinition.createSimulation()` retorna una instancia de `AsteroidsGame`, la cual hereda de `BaseGame`. Esta instancia **NO es una simulación pura desacoplada**, sino un objeto monetizado y cargado con responsabilidades de:
- **Presentación**: Instancia `SceneManager`, maneja eventos de redimensionamiento de `canvas`, crea listeners de ventana y registra sistemas de presentación (`ScreenShakeSystem`, `FeedbackSystem`, `JuiceSystem`, `RenderUpdateSystem`, `TrailSystem`, `ParticleSystem`, `AnimationSystem` en `AsteroidsGame.ts:162-170`).
- **Servicios**: Carga `WebAudioPlayer` por defecto, inicializa `AssetLoader` para imágenes, instancia `NetworkController` e integra listeners globales en `EventBus`.

`AsteroidsGame` satisface la interfaz `Simulation` únicamente por **duck typing** (porque `BaseGame` declara e implementa `step()`, `snapshot()`, `restore()`, `hash()`, `tick` y `state`). No existe un desacoplamiento real entre la lógica pura de la simulación y la capa de presentación/servicios en el estado actual.

---

### 2. Responsabilidades de `GameInstance` cubiertas por `packages/core/src/runtime/GameSession.ts`

**Confirmación:** `GameSession.ts` **YA cubre hoy las siguientes responsabilidades centrales de ciclo de vida, replay y ejecución de ticks:**

1. **Gestión de Lifecycle y Ticker via `ArcadeKernel`**:
   - `GameSession` asigna y administra una instancia de `ArcadeKernel`, escuchando y actualizando estados como `PLAYING` y `GAME_OVER`.
   - `GameSession` desactiva automáticamente el ticker o game loop interno legacy de la simulación (`loop.stopInternalLoop()`) para garantizar que la ejecución sea impulsada externamente tick por tick sin carreras ni duplicación de loops.

2. **Replay Determinista (`DeterministicReplayRecorder`)**:
   - `GameSession` inicializa un `DeterministicReplayRecorder` con la semilla (`seed`) y el nombre del juego.
   - Captura el estado inicial (`captureInitialState`) y registra cada `CompactInputFrame` en `inputHistory` durante `playTick()`.
   - Expone `getInputsHistory()` y `getReplay()` para compilar replays idénticos.

3. **Ejecución y Avance de Simulación (`playTick`)**:
   - Coordina el pipeline de avance por tick:
     1. Invoca `this.simulation.step(input)`.
     2. Guarda el frame en el recorder e historial.
     3. Evalúa la condición de fin de juego (`sim.isGameOver()`) y transiciona el `ArcadeKernel` a `ArcadeState.GAME_OVER`.
     4. Emite el evento de renderizado/sonido `session:tick` en el `EventBus`.

**Conclusión preliminar para la Fase 4:**
Crear una nueva clase `GameInstance.ts` que únicamente envuelva una `Simulation` delegando `step`/`snapshot`/`restore`/`hash` constituiría una abstracción redundante y ceremonial respecto a `GameSession.ts`. Lo que realmente falta es extraer una clase de `Simulation` **pura** (desacoplada de `BaseGame`/presentación) que `GameSession` pueda operar directamente.
