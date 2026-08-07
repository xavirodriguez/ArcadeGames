import { World } from "../ecs/World";
import { Scene } from "./Scene";
import { runLifecycleSync, runLifecycleAsync } from "../utils/LifecycleUtils";
import { EventBus } from "../events/EventBus";

/**
 * Event registry contract for scene transitions and state events.
 * @public
 */
export interface SceneEventRegistry extends Record<string, any> {
  "scene:transition:start": { scene: Scene };
  "scene:transition:progress": { progress: number };
  "scene:transition:success": { scene: Scene };
  "scene:transition:timeout": { scene: Scene; error: unknown };
  "scene:transition:error": { scene: Scene; error: unknown };
  "scene:error": { action: string; error: unknown };
  "scene:warning": { message: string };
}

/**
 * Operational states for the Scene Manager.
 *
 * @public
 */
export enum SceneState {
  /** No scene active or transition pending. */
  IDLE = "IDLE",
  /** `onEnter` is currently executing for a new scene. */
  LOADING = "LOADING",
  /** Scene is active and receiving updates. */
  ACTIVE = "ACTIVE",
  /** `onExit` is executing for the current scene. */
  UNLOADING = "UNLOADING",
}

/**
 * Central manager for scene transitions and lifecycle orchestration.
 *
 * @responsibility Implement a Finite State Machine (FSM) for scene flow.
 * @responsibility Manage sequential transitions via a task queue to prevent race conditions.
 * @responsibility Manage a scene stack (Push/Pop) for sub-states like pause menus.
 *
 * @remarks
 * El `SceneManager` es crítico para prevenir fugas de memoria y condiciones de carrera
 * durante la carga/descarga de recursos asíncronos. Utiliza LifecycleUtils
 * para asegurar que los ganchos de ciclo de vida se ejecuten correctamente.
 *
 * @conceptualRisk [TRANSITION_INTERRUPTION][HIGH] If an asynchronous transition
 * is interrupted by another request, the engine state may become inconsistent.
 * Mitigated by the `transitionQueue`.
 *
 * @public
 */
export class SceneManager {
  private sceneStack: Scene[] = [];
  private currentScene: Scene | null = null;
  private state: SceneState = SceneState.IDLE;
  private transitionQueue: (() => Promise<void>)[] = [];
  private isProcessingTransition = false;
  private world: World;
  private transitionToken = 0;
  private eventBus?: EventBus<SceneEventRegistry>;

  /** Progress of the current transition from 0 to 1 */
  public transitionProgress = 0;

  /** Timeout for transition loading/onEnter phase in milliseconds. */
  public transitionTimeout = 5000;

  /**
   * Optional hook executed whenever a new world context is established for a scene.
   *
   * @remarks
   * Useful for registering global engine systems on fresh world instances.
   */
  public onWorldCreated?: (world: World) => void | Promise<void>;

  constructor(world: World, eventBus?: EventBus<SceneEventRegistry>) {
    this.world = world;
    this.eventBus = eventBus ?? world.getResource<EventBus<SceneEventRegistry>>("EventBus");
  }

  /** Returns the currently active scene. */
  public getCurrentScene(): Scene | null {
    return this.currentScene;
  }

  /** Returns the current transition state of the manager. */
  public getState(): SceneState {
    return this.state;
  }

  /**
   * Enqueues a transition task for sequential execution.
   */
  private enqueueTransition(task: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.transitionQueue.push(async () => {
        try {
          await task();
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  /**
   * Processes the transition queue.
   * Ensures only one transition happens at a time.
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingTransition || this.transitionQueue.length === 0) {
      return;
    }

    this.isProcessingTransition = true;
    try {
      while (this.transitionQueue.length > 0) {
        const task = this.transitionQueue.shift();
        if (task) {
          await task();
        }
      }
    } finally {
      this.isProcessingTransition = false;
    }
  }

  /**
   * Realiza una transición a una nueva escena.
   * Limpia la pila actual y reemplaza la escena activa.
   *
   * @param scene - La nueva instancia de {@link Scene} a cargar.
   * @param options - Opciones de configuración para la transición.
   *
   * @remarks
   * 1. Sale de la escena actual (onExit).
   * 2. Cambia el estado a LOADING.
   * 3. Entra en la nueva escena (onEnter).
   * 4. Cambia el estado a ACTIVE.
   *
   * @remarks
   * Se espera que el manager esté en un estado estable (IDLE o ACTIVE) antes de llamar
   * a este método. Al finalizar, se pretende que la nueva escena sea la única en
   * la pila y pase a ser la escena activa.
   * @sideEffect Se espera un incremento en la versión del mundo que apoye el re-renderizado.
   */
  public async transitionTo(scene: Scene, options?: { timeout?: number }): Promise<void> {
    return this.enqueueTransition(async () => {
      const eventBus = this.eventBus;
      if (eventBus) {
        eventBus.emit("scene:transition:start", { scene });
      }

      this.transitionProgress = 0;
      if (eventBus) {
        eventBus.emit("scene:transition:progress", { progress: 0 });
      }

      const myToken = ++this.transitionToken;
      const oldScene = this.currentScene;
      const oldStack = [...this.sceneStack];
      const oldState = this.state;
      const timeoutMs = options?.timeout ?? this.transitionTimeout;

      try {
        // 1. Unload current scene if exists
        if (this.currentScene) {
          this.state = SceneState.UNLOADING;
          const oldSceneRef = this.currentScene;
          await runLifecycleAsync(async () => {
            const sceneAsAny = oldSceneRef as unknown as Record<string, unknown>;
            if (typeof sceneAsAny.onExit === "function") {
              await (sceneAsAny.onExit as (w: World) => Promise<void>)(oldSceneRef.getWorld());
            }
          });
        }

        // Just in case check token after unload
        if (myToken !== this.transitionToken) return;

        this.transitionProgress = 0.3;
        if (eventBus) {
          eventBus.emit("scene:transition:progress", { progress: 0.3 });
        }

        // 2. Load new scene
        this.state = SceneState.LOADING;
        this.currentScene = scene;
        this.sceneStack = [scene];

        let timeoutId: any;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error("Transition timed out"));
          }, timeoutMs);
        });

        const loadPromise = (async () => {
          if (this.onWorldCreated) {
            await this.onWorldCreated(scene.getWorld());
          }

          // Check token before calling onEnter
          if (myToken !== this.transitionToken) return;

          this.transitionProgress = 0.7;
          if (eventBus) {
            eventBus.emit("scene:transition:progress", { progress: 0.7 });
          }

          await runLifecycleAsync(async () => {
            const sceneAsAny = scene as unknown as Record<string, unknown>;
            if (typeof sceneAsAny.onEnter === "function") {
              await (sceneAsAny.onEnter as (w: World) => Promise<void>)(scene.getWorld());
            }
          });
        })();

        try {
          await Promise.race([loadPromise, timeoutPromise]);
        } finally {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        }

        // Check token again before finalizing
        if (myToken !== this.transitionToken) return;

        this.state = SceneState.ACTIVE;
        this.transitionProgress = 1.0;

        if (eventBus) {
          eventBus.emit("scene:transition:progress", { progress: 1.0 });
          eventBus.emit("scene:transition:success", { scene });
        }
      } catch (error: unknown) {
        if (myToken !== this.transitionToken) return;

        this.transitionToken++; // Obsolete this transition token to prevent any future/delayed execution

        const isTimeout = error instanceof Error && error.message === "Transition timed out";

        if (eventBus) {
          if (isTimeout) {
            eventBus.emit("scene:transition:timeout", { scene, error });
          } else {
            eventBus.emit("scene:transition:error", { scene, error });
          }
          eventBus.emit("scene:error", { action: "transition", error });
        }

        // Rollback
        this.currentScene = oldScene;
        this.sceneStack = oldStack;
        this.state = oldState;

        if (oldScene) {
          const isOldScenePaused = (oldScene as any).isPaused === true || (oldScene as any).paused === true;
          if (isOldScenePaused) {
            runLifecycleSync(() => oldScene.onResume());
          }
        }

        throw error;
      }
    });
  }

  /**
   * Pushes a new scene onto the stack, pausing the current one.
   *
   * @remarks
   * Useful for overlays or menus that should preserve the underlying game state.
   */
  public async push(scene: Scene, options?: { timeout?: number }): Promise<void> {
    return this.enqueueTransition(async () => {
      const myToken = ++this.transitionToken;
      const previousState = this.state;
      const oldScene = this.currentScene;
      const oldStack = [...this.sceneStack];
      const timeoutMs = options?.timeout ?? this.transitionTimeout;

      let timeoutId: any;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("Push transition timed out"));
        }, timeoutMs);
      });

      try {
        if (this.currentScene) {
          runLifecycleSync(() => this.currentScene!.onPause());
        }

        this.state = SceneState.LOADING;
        this.sceneStack.push(scene);
        this.currentScene = scene;

        const loadPromise = (async () => {
          if (this.onWorldCreated) {
            await this.onWorldCreated(scene.getWorld());
          }

          if (myToken !== this.transitionToken) return;

          await runLifecycleAsync(async () => {
            const sceneAsAny = scene as unknown as Record<string, unknown>;
            if (typeof sceneAsAny.onEnter === "function") {
              await (sceneAsAny.onEnter as (w: World) => Promise<void>)(scene.getWorld());
            }
          });
        })();

        try {
          await Promise.race([loadPromise, timeoutPromise]);
        } finally {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        }

        if (myToken !== this.transitionToken) return;

        this.state = SceneState.ACTIVE;
      } catch (error) {
        if (myToken !== this.transitionToken) return;

        this.transitionToken++; // Obsolete this token to prevent late execution
        const eventBus = this.world.getResource<EventBus<SceneEventRegistry>>("EventBus");
        if (eventBus) {
          eventBus.emit("scene:error", { action: "push", error });
        }

        // Rollback stack and scene properly
        this.currentScene = oldScene;
        this.sceneStack = oldStack;
        this.state = previousState;

        if (oldScene) {
          runLifecycleSync(() => oldScene.onResume());
        }

        throw error;
      }
    });
  }

  /**
   * Pops the current scene from the stack, resuming the previous one.
   *
   * @remarks
   * Executes `onExit` for the popped scene and `onResume` for the top of the stack.
   */
  public async pop(options?: { timeout?: number }): Promise<void> {
    return this.enqueueTransition(async () => {
      const eventBus = this.world.getResource<EventBus<SceneEventRegistry>>("EventBus");
      if (this.sceneStack.length <= 1) {
        if (eventBus) {
          eventBus.emit("scene:warning", { message: "Cannot pop the last scene." });
        }
        return;
      }

      const myToken = ++this.transitionToken;
      const previousState = this.state;
      const oldScene = this.currentScene;
      const oldStack = [...this.sceneStack];
      const poppedScene = this.sceneStack[this.sceneStack.length - 1];
      const timeoutMs = options?.timeout ?? this.transitionTimeout;

      let timeoutId: any;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("Pop transition timed out"));
        }, timeoutMs);
      });

      try {
        this.state = SceneState.UNLOADING;

        const unloadPromise = (async () => {
          await runLifecycleAsync(async () => {
            const sceneAsAny = poppedScene as unknown as Record<string, unknown>;
            if (typeof sceneAsAny.onExit === "function") {
              await (sceneAsAny.onExit as (w: World) => Promise<void>)(poppedScene.getWorld());
            }
          });
        })();

        try {
          await Promise.race([unloadPromise, timeoutPromise]);
        } finally {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        }

        if (myToken !== this.transitionToken) return;

        this.sceneStack.pop();
        this.currentScene = this.sceneStack[this.sceneStack.length - 1];

        if (this.currentScene) {
          runLifecycleSync(() => this.currentScene!.onResume());
        }
        this.state = SceneState.ACTIVE;
      } catch (error) {
        if (myToken !== this.transitionToken) return;

        this.transitionToken++; // Obsolete this token
        if (eventBus) {
          eventBus.emit("scene:error", { action: "pop", error });
        }

        // Rollback stack and scene properly
        this.currentScene = oldScene;
        this.sceneStack = oldStack;
        this.state = previousState;

        throw error;
      }
    });
  }

  /**
   * Dispatches the update tick to the active scene.
   */
  public update(deltaTime: number): void {
    if (this.state === SceneState.ACTIVE && this.currentScene) {
      this.currentScene.onUpdate(deltaTime, this.currentScene.getWorld());
    }
  }

  /**
   * Dispatches the render call to the active scene.
   */
  public render(alpha: number): void {
    if (this.state === SceneState.ACTIVE && this.currentScene) {
      this.currentScene.onRender(alpha);
    }
  }

  /** Pauses the active scene. */
  public pause(): void {
    if (this.currentScene) this.currentScene.onPause();
  }

  /** Resumes the active scene. */
  public resume(): void {
    if (this.currentScene) this.currentScene.onResume();
  }

  /**
   * Restarts the currently active scene.
   *
   * @remarks
   * Clears the scene's world, resets systems, and executes `onRestartCleanup()`.
   */
  public async restartCurrentScene(): Promise<void> {
    if (this.currentScene) {
        const world = this.currentScene.getWorld();
        world.clear();
        world.clearSystems();
        this.currentScene.onRestartCleanup();
        await this.transitionTo(this.currentScene);
    }
  }

  /**
   * Shuts down the manager and releases references.
   */
  public destroy(): void {
    this.sceneStack = [];
    this.currentScene = null;
    this.transitionQueue = [];
    this.state = SceneState.IDLE;
    this.transitionToken++;
  }
}
