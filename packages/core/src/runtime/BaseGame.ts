import { World, ComponentRegistry, BlueprintRegistryMap, ComponentType } from "../ecs/World";
import { Entity } from "../ecs/Entity";
import { EventRegistry, EventBus } from "../events/EventBus";
import { BlueprintRegistry } from "../ecs/BlueprintRegistry";
import { IGame } from "./IGame";
import { GameLoop } from "../loop/GameLoop";
import { InputSystem, IInputSystem } from "../input/InputSystem";
import { UnifiedInputSystem } from "../input/UnifiedInputSystem";
import { Schedule } from "../ecs/Schedule";
import { SceneManager } from "../scenes/SceneManager";
import { IAudioPlayer, NullAudioPlayer } from "../audio/IAudioPlayer";
import { IAssetProvider } from "../assets/AssetLoader";

/**
 * Representation of the game lifecycle states.
 * @public
 */
export enum GameLifecycleState {
  UNINITIALIZED = "UNINITIALIZED",
  READY = "READY",
  RUNNING = "RUNNING",
  PAUSED = "PAUSED",
  STOPPED = "STOPPED",
  DESTROYED = "DESTROYED",
  ERROR = "ERROR"
}

/** @public */
export interface BaseGameConfig<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TInput extends Record<string, any> = Record<string, any>
> {
  /** [KeyboardEvent.code] Key to toggle pause. */
  pauseKey?: string;
  /** [KeyboardEvent.code] Key to restart the game. */
  restartKey?: string;
  /** Enables multiplayer-specific synchronization logic. */
  isMultiplayer?: boolean;
  /** Global game options, including the initial simulation seed. */
  gameOptions?: Record<string, unknown>;
  /** Runs the game without visual systems or asset loading. Suitable for server-side execution. */
  headless?: boolean;
  /** Optional schedule injection */
  schedule?: Schedule<TComponents, TEvents>;
  /** Initial simulation seed (for backward compatibility). */
  seed?: number;
  /** Optional audio player injection */
  audio?: IAudioPlayer;
  /** Optional asset provider injection */
  assetProvider?: IAssetProvider;
  /** Timeout for game initialization in milliseconds. Defaults to 10000. */
  initTimeout?: number;
  /** Optional custom input system injection */
  inputSystem?: IInputSystem<TInput>;
  /** Optional custom scene manager factory */
  sceneManagerFactory?: (world: World<TComponents, TEvents, any>, eventBus: EventBus<TEvents>) => SceneManager;
}

/**
 * Base class for game implementations using the TinyAster engine.
 *
 * @typeParam TState - The representation of the game state.
 * @typeParam TInput - The representation of the input state.
 * @typeParam TComponents - The registry of components available in this game.
 * @typeParam TEvents - The registry of events that can be emitted.
 * @typeParam TBlueprints - The registry of blueprints that can be spawned.
 * @public
 */
export abstract class BaseGame<
  TState = unknown,
  TInput extends Record<string, any> = Record<string, any>,
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> implements IGame<TState, TInput> {
  public world: World<TComponents, TEvents, TBlueprints>;
  public eventBus: EventBus<TEvents>;
  public blueprints: BlueprintRegistry<TComponents, TBlueprints>;
  protected loop: GameLoop;
  protected unifiedInput: IInputSystem<TInput>;
  protected _config: BaseGameConfig<TComponents, TEvents, TInput>;
  private lifecycleState: GameLifecycleState = GameLifecycleState.UNINITIALIZED;
  private isPaused = false;

  public sceneManager: SceneManager;
  public audio: IAudioPlayer;

  constructor(config: BaseGameConfig<TComponents, TEvents, TInput> = {}) {
    this._config = config;
    this.world = new World<TComponents, TEvents, TBlueprints>(config.schedule);
    this.eventBus = new EventBus<TEvents>();
    this.blueprints = new BlueprintRegistry<TComponents, TBlueprints>();
    this.loop = new GameLoop({
      step: 1 / 60,
      maxDelta: 0.25,
      manual: config.isMultiplayer
    });
    this.unifiedInput = config.inputSystem || new UnifiedInputSystem();
    this.sceneManager = config.sceneManagerFactory
      ? config.sceneManagerFactory(this.world, this.eventBus)
      : new SceneManager(this.world, this.eventBus as any);
    this.audio = config.audio || new NullAudioPlayer();

    this.eventBus.on("PlaySFX" as any, (payload: any) => {
      if (payload && payload.name) {
        this.audio.playSFX(payload.name);
      }
    });

    this.registerInternalResources();

    // Subscribe loop to update
    this.loop.subscribeUpdate((dt) => {
      if (this.lifecycleState === GameLifecycleState.RUNNING) {
        this.update(dt);
      }
    });
  }

  private registerInternalResources(): void {
    // Register the blueprint registry as a world resource for the command buffer
    this.world.setResource("BlueprintRegistry", this.blueprints);
    this.world.setResource("EventBus", this.eventBus);
    this.world.setResource("InputSystem", this.unifiedInput);
    this.world.setResource("Audio" as any, this.audio);
  }

  /**
   * Returns the world instance.
   */
  getWorld(): World<TComponents, TEvents, TBlueprints> {
    return this.world;
  }

  /**
   * Returns the event bus instance.
   */
  getEventBus(): EventBus<TEvents> {
    return this.eventBus;
  }

  /**
   * Returns the input system instance.
   */
  getInputSystem(): IInputSystem<TInput> {
    return this.unifiedInput;
  }

  /**
   * Returns the game loop instance.
   */
  public getGameLoop(): GameLoop {
    return this.loop;
  }

  /**
   * Returns the last encountered error from the game loop, if any.
   */
  public getLastError(): Error | null {
    return this.loop.getLastError();
  }

  /**
   * Subscribes to critical loop exception events.
   * @param callback - Callback invoked when an error is caught in the game loop.
   * @returns Unsubscribe function.
   */
  public subscribeError(callback: (err: Error) => void): () => void {
    return this.loop.subscribeError(callback);
  }

  /**
   * Called during game initialization.
   * Runs the Template Method cycle: registers systems, initializes entities, and starts the game loop.
   */
  public async init(): Promise<void> {
    if (this.lifecycleState !== GameLifecycleState.UNINITIALIZED) {
      return;
    }

    const timeoutMs = this._config.initTimeout ?? 10000;
    let timeoutId: any;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error("Game initialization timed out"));
      }, timeoutMs);
    });

    const initPromise = (async () => {
      await this.onRegisterSystems();
      if ((this.lifecycleState as any) === GameLifecycleState.DESTROYED) {
        return;
      }
      await this.onInitializeEntities();
      if ((this.lifecycleState as any) === GameLifecycleState.DESTROYED) {
        return;
      }
    })();

    try {
      await Promise.race([initPromise, timeoutPromise]);
      if ((this.lifecycleState as GameLifecycleState) !== GameLifecycleState.DESTROYED) {
        this.lifecycleState = GameLifecycleState.READY;
        this.start();
      }
    } catch (error) {
      if ((this.lifecycleState as GameLifecycleState) !== GameLifecycleState.DESTROYED) {
        this.lifecycleState = GameLifecycleState.ERROR;
      }
      throw error;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Starts the game loop.
   */
  public start(): void {
    if (
      this.lifecycleState !== GameLifecycleState.READY &&
      this.lifecycleState !== GameLifecycleState.STOPPED
    ) {
      return;
    }
    this.lifecycleState = GameLifecycleState.RUNNING;
    this.loop.start();
  }

  /**
   * Pausa de forma idempotente la ejecución del bucle de juego.
   *
   * @remarks
   * Diseñado para evitar que se dupliquen las detenciones o se desincronice el acumulador de delta temporal.
   *
   * @precondition El juego debe estar en estado `RUNNING`.
   * @postcondition El juego cambia a estado `PAUSED` y detiene el ticker del GameLoop.
   * @invariant El estado `isPaused` coincide exactamente con `lifecycleState === GameLifecycleState.PAUSED`.
   * @throws Ninguno.
   * @sideEffect Altera el estado del `GameLoop` y el ciclo de vida del juego.
   * @conceptualRisk [LIFECYCLE] Detener el GameLoop abruptamente puede pausar la simulación pero no congela necesariamente callbacks externos o efectos de renderizado asíncronos.
   */
  public pause(): void {
    if (this.isPaused) return;
    this.isPaused = true;
    this.lifecycleState = GameLifecycleState.PAUSED;
    this.loop.pause();
  }

  /**
   * Reanuda de forma idempotente la ejecución del bucle de juego si estaba pausado.
   *
   * @remarks
   * Diseñado para mitigar saltos temporales extremos al restaurar la acumulación de deltas físicos.
   *
   * @precondition El juego debe estar actualmente en estado `PAUSED`.
   * @postcondition El juego vuelve a estado `RUNNING` y reanuda el ticker del GameLoop.
   * @invariant El estado `isPaused` pasa a ser `false`.
   * @throws Ninguno.
   * @sideEffect Altera el estado del `GameLoop` y el ciclo de vida.
   */
  public resume(): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.lifecycleState = GameLifecycleState.RUNNING;
    this.loop.resume();
  }

  /**
   * Returns whether the game is currently paused.
   */
  public isPausedState(): boolean {
    return this.isPaused;
  }

  /**
   * Returns the current lifecycle state of the game.
   */
  public getLifecycleState(): GameLifecycleState {
    return this.lifecycleState;
  }

  /**
   * Stops the game loop and transitions to STOPPED state.
   */
  public stop(): void {
    if (this.lifecycleState !== GameLifecycleState.RUNNING && this.lifecycleState !== GameLifecycleState.PAUSED) return;
    this.lifecycleState = GameLifecycleState.STOPPED;
    this.loop.stop();
  }

  /**
   * Detiene el bucle de juego y libera de forma exhaustiva todos los recursos registrados.
   *
   * @remarks
   * Realiza la limpieza de sistemas en el World, vacía los handlers suscritos al `EventBus` y
   * desecha el sistema de inputs.
   *
   * @precondition Ninguna.
   * @postcondition El juego queda en estado `DESTROYED`, los sistemas del World y listeners se limpian.
   * @invariant El World queda huérfano de sistemas de procesamiento activos tras este paso.
   * @throws Ninguno.
   * @sideEffect Invoca el método `dispose` de los sistemas y limpia el `EventBus`.
   * @conceptualRisk [LIFECYCLE] Llamar a cualquier operación que consulte o modifique el estado del World tras `destroy` resultará en operaciones sobre datos obsoletos u huerfanos.
   */
  public destroy(): void {
    this.lifecycleState = GameLifecycleState.DESTROYED;
    this.loop.stop();

    this.world.schedule.clearSystems();
    this.eventBus.clear();

    if (typeof this.unifiedInput?.dispose === "function") {
      this.unifiedInput.dispose();
    }
  }

  /**
   * Reinicia de forma asíncrona la partida completa restableciendo el World, sistemas e inicializadores.
   *
   * @remarks
   * Invoca `destroy()`, limpia el `EventBus` para evitar acumulación de listeners duplicados ante reinicios múltiples,
   * y reconstruye de cero la simulación instanciando un nuevo `World`.
   *
   * @precondition Ninguna.
   * @postcondition El juego vuelve a arrancar de forma limpia en estado `RUNNING` con el estado físico y lógicas re-registradas.
   * @invariant El contador de listeners en el `EventBus` tras el reinicio es exactamente idéntico al del primer arranque de la aplicación.
   * @throws Ninguno.
   * @sideEffect Crea un nuevo `World`, recrea el `SceneManager` y vuelve a llamar a la secuencia de registro e inicialización.
   * @conceptualRisk [MEMORY] Objetos externos que retengan referencias directas al World anterior no se actualizarán al nuevo World, provocando fugas de memoria o desincronizaciones.
   *
   * @param seed - Semilla opcional para inicializar el generador de números pseudoaleatorios del nuevo World.
   */
  public async restart(seed?: number): Promise<void> {
    if (seed !== undefined) {
      this._config.gameOptions = { ...this._config.gameOptions, seed };
    }

    await this.onBeforeRestart();
    if ((this.lifecycleState as any) === GameLifecycleState.DESTROYED) {
      return;
    }
    this.destroy();
    this.eventBus.clear();

    this.lifecycleState = GameLifecycleState.UNINITIALIZED;
    this.isPaused = false;

    // Reset world and re-register resources
    this.world = new World<TComponents, TEvents, TBlueprints>(this._config.schedule);
    this.registerInternalResources();
    this.sceneManager = this._config.sceneManagerFactory
      ? this._config.sceneManagerFactory(this.world, this.eventBus)
      : new SceneManager(this.world, this.eventBus as any);

    // Re-register systems and initialize entities by running init()
    await this.init();
  }

  /**
   * Subscribes to state updates.
   * Note: For now, we use the loop's render subscription to notify the state.
   */
  public subscribe(cb: (state: TState) => void): () => void {
    return this.loop.subscribeRender(() => {
      cb(this.getGameState());
    });
  }

  /**
   * Updates the game simulation.
   */
  public abstract update(dt: number): void;

  /**
   * Hook for subclasses to register their ECS systems.
   * Called during `init()`. This is the first lifecycle hook executed during game startup.
   *
   * @remarks
   * Invocation order:
   * 1. `init()` is called.
   * 2. `onRegisterSystems()` is executed (systems are registered here).
   * 3. `onInitializeEntities()` is executed.
   */
  protected async onRegisterSystems(): Promise<void> {
    // Overridden by subclasses to register systems
  }

  /**
   * Hook for subclasses to initialize entities.
   * Called during `init()` after systems have been successfully registered.
   *
   * @remarks
   * Invocation order:
   * 1. `init()` is called.
   * 2. `onRegisterSystems()` is executed.
   * 3. `onInitializeEntities()` is executed (entities are spawned here).
   */
  protected async onInitializeEntities(): Promise<void> {
    // Overridden by subclasses to initialize entities
  }

  /**
   * Hook for subclasses to execute cleanup or custom logic before restarting.
   * Called at the very beginning of the `restart()` method.
   *
   * @remarks
   * Invocation order:
   * 1. `restart()` is called.
   * 2. `onBeforeRestart()` is executed (cleanup/save high-level stats).
   * 3. Current world and event handlers are destroyed.
   * 4. A new World is instantiated.
   * 5. `init()` is called (triggering `onRegisterSystems()` and `onInitializeEntities()` again).
   */
  protected async onBeforeRestart(): Promise<void> {
    // Overridden by subclasses if needed
  }

  /**
   * Returns a representation of the current game state.
   */
  public abstract getGameState(): TState;

  /**
   * Returns the seed used for the game session.
   */
  public getSeed(): number {
    return (this._config.gameOptions?.seed as number) ?? 0;
  }

  /**
   * Returns whether the game has ended.
   */
  public abstract isGameOver(): boolean;

  /**
   * Decoupled Input Bridge: Sets the state of the local player inputs in the ECS World.
   * Can be overridden by subclasses to write directly to entity components.
   */
  public setInputState(input: Partial<TInput>): void {
    if (this.unifiedInput) {
      Object.entries(input).forEach(([action, pressed]) => {
        this.unifiedInput.setOverride(action, !!pressed);
      });
    }
  }

  /**
   * Helper to handle deferred or immediate entity creation and component attachment.
   */
  protected createBaseEntity(deferred?: boolean): { entity: Entity; add: <K extends ComponentType<TComponents>>(comp: TComponents[K] & { type: K }) => void } {
    const isUpdating = this.world.isUpdating;
    const isDeferred = !!(deferred || isUpdating);
    const commands = this.world.getCommandBuffer();

    if (isDeferred) {
      const entity = this.world.reserveEntityId();
      commands.createEntity(entity);
      return {
        entity,
        add: <K extends ComponentType<TComponents>>(comp: TComponents[K] & { type: K }) => {
          commands.addComponent(entity, comp);
        }
      };
    }

    const entity = this.world.createEntity();
    return {
      entity,
      add: <K extends ComponentType<TComponents>>(comp: TComponents[K] & { type: K }) => this.world.addComponent(entity, comp)
    };
  }
}
