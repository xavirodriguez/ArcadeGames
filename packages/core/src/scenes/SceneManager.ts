import { World, BlueprintRegistryMap } from "../ecs/World";
import { Scene } from "./Scene";
import type { ComponentRegistry } from "../ecs/Component";
import type { CoreComponentRegistry } from "../ecs/CoreComponents";
import { runLifecycleSync, runLifecycleAsync } from "../utils/LifecycleUtils";
import { EventBus, EventRegistry } from "../events/EventBus";
import { TransitionOptions, ITransitionEffect, getEasingFunction } from "./TransitionTypes";
import { TransitionRegistry, resolveTransitionEffect } from "./transitions/TransitionRegistry";
import type { StoryRuntime } from "../story/StoryRuntime";

function isTestEnvironment(): boolean {
  return (
    typeof jest !== "undefined" ||
    (typeof process !== "undefined" &&
      process.env &&
      (process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID !== undefined)) ||
    (typeof describe === "function" && typeof it === "function")
  );
}

/**
 * Event registry contract for scene transitions and state events.
 * @public
 */
export interface SceneEventRegistry extends Record<string, any> {
  "scene:transition:start": { scene: Scene<ComponentRegistry> };
  "scene:transition:progress": { progress: number };
  "scene:transition:success": { scene: Scene<ComponentRegistry> };
  "scene:transition:timeout": { scene: Scene<ComponentRegistry>; error: unknown };
  "scene:transition:error": { scene: Scene<ComponentRegistry>; error: unknown };
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
export class SceneManager<TComponents extends ComponentRegistry = CoreComponentRegistry> {
  private sceneStack: Scene<TComponents>[] = [];
  private currentScene: Scene<TComponents> | null = null;
  private state: SceneState = SceneState.IDLE;
  private transitionQueue: (() => Promise<void>)[] = [];
  private isProcessingTransition = false;
  private world: World<TComponents, EventRegistry, BlueprintRegistryMap<TComponents>>;
  private transitionToken = 0;
  private eventBus?: EventBus<SceneEventRegistry>;

  // Transition state tracking properties
  private _transitionOldScene: Scene<TComponents> | null = null;
  private _transitionNewScene: Scene<TComponents> | null = null;
  private _transitionOptions?: TransitionOptions;
  private _activeTransitionEffect: ITransitionEffect | null = null;
  private _transitionElapsed = 0;
  private _transitionResolve: (() => void) | null = null;
  private _transitionReject: ((err: any) => void) | null = null;
  private _incomingLoadPromise: Promise<void> | null = null;
  private _onEnterResolved: () => boolean = () => false;
  private _onEnterError: () => any = () => null;
  private _onExitCalled = false;

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
  public onWorldCreated?: (world: World<TComponents, EventRegistry, BlueprintRegistryMap<TComponents>>) => void | Promise<void>;

  constructor(world: World<TComponents, EventRegistry, BlueprintRegistryMap<TComponents>>, eventBus?: EventBus<SceneEventRegistry>) {
    this.world = world;
    this.eventBus = eventBus ?? world.getResource<EventBus<SceneEventRegistry>>("EventBus");
  }

  /** Returns the currently active scene. */
  public getCurrentScene(): Scene<TComponents> | null {
    return this.currentScene;
  }

  /** Returns the current transition state of the manager. */
  public getState(): SceneState {
    return this.state;
  }

  /** Returns the active transition effect instance. */
  public getActiveTransitionEffect(): ITransitionEffect | null {
    return this._activeTransitionEffect;
  }

  /** Returns the current transition options. */
  public getTransitionOptions(): TransitionOptions | undefined {
    return this._transitionOptions;
  }

  /** Returns the outgoing scene during transition. */
  public getTransitionOldScene(): Scene<TComponents> | null {
    return this._transitionOldScene;
  }

  /** Returns the incoming scene during transition. */
  public getTransitionNewScene(): Scene<TComponents> | null {
    return this._transitionNewScene;
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
   * Clean up internal transition properties when transition completes or fails.
   */
  private _cleanupTransition(): void {
    this._transitionOldScene = null;
    this._transitionNewScene = null;
    this._transitionOptions = undefined;
    this._activeTransitionEffect = null;
    this._transitionElapsed = 0;
    this._transitionResolve = null;
    this._transitionReject = null;
    this._incomingLoadPromise = null;
    this._onEnterResolved = () => false;
    this._onEnterError = () => null;
    this._onExitCalled = false;
  }

  private _resolveDuration(options?: TransitionOptions): number {
    const isHeadless =
      this.world.getResource<any>("headless") === true ||
      this.world.getResource<any>("GameConfig")?.headless === true ||
      this.world.getResource<any>("GameConfig")?.isHeadless === true;

    if (isHeadless) {
      return 0; // Always force 0 for server/headless execution
    }

    if (options?.duration !== undefined) {
      return options.duration; // Respect explicit duration in visual tests
    }

    if (isTestEnvironment()) {
      return 0; // Default to 0 for other tests to run fast
    }

    return 300; // Default production transition
  }

  /**
   * Realiza una transición a una nueva escena.
   * Limpia la pila actual y reemplaza la escena activa.
   *
   * @param scene - La nueva instancia de {@link Scene} a cargar.
   * @param options - Opciones de configuración para la transición.
   * @returns A promise that resolves when the transition is complete.
   */
  public async transitionTo(scene: Scene<TComponents>, options?: TransitionOptions): Promise<void> {
    const duration = this._resolveDuration(options);

    if (duration === 0) {
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
          if (this.currentScene) {
            this.state = SceneState.UNLOADING;
            const oldSceneRef = this.currentScene;
            await runLifecycleAsync(async () => {
              await oldSceneRef.onExit(oldSceneRef.getWorld());
            });
          }

          if (myToken !== this.transitionToken) return;

          this.transitionProgress = 0.3;
          if (eventBus) {
            eventBus.emit("scene:transition:progress", { progress: 0.3 });
          }

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

            if (myToken !== this.transitionToken) return;

            this.transitionProgress = 0.7;
            if (eventBus) {
              eventBus.emit("scene:transition:progress", { progress: 0.7 });
            }

            await runLifecycleAsync(async () => {
              await scene.onEnter(scene.getWorld());
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
          this.transitionProgress = 1.0;

          if (eventBus) {
            eventBus.emit("scene:transition:progress", { progress: 1.0 });
            eventBus.emit("scene:transition:success", { scene });
          }
        } catch (error: unknown) {
          if (myToken !== this.transitionToken) return;

          this.transitionToken++;

          const isTimeout = error instanceof Error && error.message === "Transition timed out";

          if (eventBus) {
            if (isTimeout) {
              eventBus.emit("scene:transition:timeout", { scene, error });
            } else {
              eventBus.emit("scene:transition:error", { scene, error });
            }
            eventBus.emit("scene:error", { action: "transition", error });
          }

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

    // Animated Transition (duration > 0)
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
        if (oldScene) {
          runLifecycleSync(() => oldScene.onPause());
        }

        this.state = SceneState.UNLOADING;
        this._transitionOldScene = oldScene;
        this._transitionNewScene = scene;
        this._transitionOptions = { ...options, duration, type: "transitionTo" };

        const effectOption = options?.effect ?? "fade";
        this._activeTransitionEffect = resolveTransitionEffect(effectOption) ?? TransitionRegistry.fade;
        this._transitionElapsed = 0;
        this._onExitCalled = false;

        let timeoutId: any;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error("Transition timed out"));
          }, timeoutMs);
        });

        let onEnterResolved = false;
        let onEnterError: any = null;

        const loadPromise = (async () => {
          if (this.onWorldCreated) {
            await this.onWorldCreated(scene.getWorld());
          }

          if (myToken !== this.transitionToken) return;

          await runLifecycleAsync(async () => {
            await scene.onEnter(scene.getWorld());
          });
        })().then(() => {
          onEnterResolved = true;
        }).catch((err) => {
          onEnterError = err;
        });

        const loadWithTimeout = Promise.race([loadPromise, timeoutPromise]).finally(() => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        });

        await new Promise<void>((resolve, reject) => {
          this._transitionResolve = () => {
            this._cleanupTransition();
            resolve();
          };
          this._transitionReject = (err) => {
            this._cleanupTransition();
            reject(err);
          };
          this._incomingLoadPromise = loadWithTimeout as any;
          this._onEnterResolved = () => onEnterResolved;
          this._onEnterError = () => onEnterError;
        });

      } catch (error) {
        if (myToken !== this.transitionToken) return;
        this.transitionToken++;

        const isTimeout = error instanceof Error && error.message === "Transition timed out";
        if (eventBus) {
          if (isTimeout) {
            eventBus.emit("scene:transition:timeout", { scene, error });
          } else {
            eventBus.emit("scene:transition:error", { scene, error });
          }
          eventBus.emit("scene:error", { action: "transition", error });
        }

        this.currentScene = oldScene;
        this.sceneStack = oldStack;
        this.state = oldState;

        if (oldScene) {
          runLifecycleSync(() => oldScene.onResume());
        }

        this._cleanupTransition();
        throw error;
      }
    });
  }

  /**
   * Pushes a new scene onto the stack, pausing the current one.
   *
   * @param scene - The Scene to push.
   * @param options - Visual transition configurations.
   * @returns A promise that resolves when the push operation is complete.
   */
  public async push(scene: Scene<TComponents>, options?: TransitionOptions): Promise<void> {
    const duration = this._resolveDuration(options);

    if (duration === 0) {
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
              await scene.onEnter(scene.getWorld());
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

          this.transitionToken++;
          const eventBus = this.world.getResource<EventBus<SceneEventRegistry>>("EventBus");
          if (eventBus) {
            eventBus.emit("scene:error", { action: "push", error });
          }

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

    // Animated Push
    return this.enqueueTransition(async () => {
      const myToken = ++this.transitionToken;
      const oldScene = this.currentScene;
      const oldStack = [...this.sceneStack];
      const oldState = this.state;
      const timeoutMs = options?.timeout ?? this.transitionTimeout;

      try {
        if (oldScene) {
          runLifecycleSync(() => oldScene.onPause());
        }

        this.state = SceneState.UNLOADING;
        this._transitionOldScene = oldScene;
        this._transitionNewScene = scene;
        this._transitionOptions = { ...options, duration, type: "push" };

        const effectOption = options?.effect ?? "fade";
        this._activeTransitionEffect = resolveTransitionEffect(effectOption) ?? TransitionRegistry.fade;
        this._transitionElapsed = 0;
        this._onExitCalled = false;

        let timeoutId: any;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error("Push transition timed out"));
          }, timeoutMs);
        });

        let onEnterResolved = false;
        let onEnterError: any = null;

        const loadPromise = (async () => {
          if (this.onWorldCreated) {
            await this.onWorldCreated(scene.getWorld());
          }

          if (myToken !== this.transitionToken) return;

          await runLifecycleAsync(async () => {
            await scene.onEnter(scene.getWorld());
          });
        })().then(() => {
          onEnterResolved = true;
        }).catch((err) => {
          onEnterError = err;
        });

        const loadWithTimeout = Promise.race([loadPromise, timeoutPromise]).finally(() => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        });

        await new Promise<void>((resolve, reject) => {
          this._transitionResolve = () => {
            this._cleanupTransition();
            resolve();
          };
          this._transitionReject = (err) => {
            this._cleanupTransition();
            reject(err);
          };
          this._incomingLoadPromise = loadWithTimeout as any;
          this._onEnterResolved = () => onEnterResolved;
          this._onEnterError = () => onEnterError;
        });

      } catch (error) {
        if (myToken !== this.transitionToken) return;
        this.transitionToken++;

        const eventBus = this.world.getResource<EventBus<SceneEventRegistry>>("EventBus");
        if (eventBus) {
          eventBus.emit("scene:error", { action: "push", error });
        }

        this.currentScene = oldScene;
        this.sceneStack = oldStack;
        this.state = oldState;

        if (oldScene) {
          runLifecycleSync(() => oldScene.onResume());
        }

        this._cleanupTransition();
        throw error;
      }
    });
  }

  /**
   * Pops the current scene from the stack, resuming the previous one.
   *
   * @param options - Visual transition configurations.
   * @returns A promise that resolves when the pop operation is complete.
   */
  public async pop(options?: TransitionOptions): Promise<void> {
    const duration = this._resolveDuration(options);

    if (duration === 0) {
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
              await poppedScene.onExit(poppedScene.getWorld());
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

          this.transitionToken++;
          if (eventBus) {
            eventBus.emit("scene:error", { action: "pop", error });
          }

          this.currentScene = oldScene;
          this.sceneStack = oldStack;
          this.state = previousState;

          throw error;
        }
      });
    }

    // Animated Pop
    return this.enqueueTransition(async () => {
      const eventBus = this.world.getResource<EventBus<SceneEventRegistry>>("EventBus");
      if (this.sceneStack.length <= 1) {
        if (eventBus) {
          eventBus.emit("scene:warning", { message: "Cannot pop the last scene." });
        }
        return;
      }

      const myToken = ++this.transitionToken;
      const oldScene = this.currentScene;
      const oldStack = [...this.sceneStack];
      const oldState = this.state;
      const poppedScene = this.sceneStack[this.sceneStack.length - 1];

      try {
        if (oldScene) {
          runLifecycleSync(() => oldScene.onPause());
        }

        this.state = SceneState.UNLOADING;
        this._transitionOldScene = poppedScene;
        this._transitionNewScene = this.sceneStack[this.sceneStack.length - 2];
        this._transitionOptions = { ...options, duration, type: "pop" };

        const effectOption = options?.effect ?? "fade";
        this._activeTransitionEffect = resolveTransitionEffect(effectOption) ?? TransitionRegistry.fade;
        this._transitionElapsed = 0;
        this._onExitCalled = false;

        const onEnterResolved = true;
        const onEnterError: any = null;

        await new Promise<void>((resolve, reject) => {
          this._transitionResolve = () => {
            this._cleanupTransition();
            resolve();
          };
          this._transitionReject = (err) => {
            this._cleanupTransition();
            reject(err);
          };
          this._incomingLoadPromise = Promise.resolve();
          this._onEnterResolved = () => onEnterResolved;
          this._onEnterError = () => onEnterError;
        });

      } catch (error) {
        if (myToken !== this.transitionToken) return;
        this.transitionToken++;

        if (eventBus) {
          eventBus.emit("scene:error", { action: "pop", error });
        }

        this.currentScene = oldScene;
        this.sceneStack = oldStack;
        this.state = oldState;

        this._cleanupTransition();
        throw error;
      }
    });
  }

  /**
   * Dispatches the update tick to the active scene.
   *
   * @param deltaTime - Time elapsed since last update in milliseconds.
   */
  public update(deltaTime: number): void {
    if (this.state === SceneState.UNLOADING || this.state === SceneState.LOADING) {
      const duration = this._transitionOptions?.duration ?? 300;
      this._transitionElapsed += deltaTime;

      const rawProgress = Math.min(1.0, this._transitionElapsed / duration);
      const easingFunc = getEasingFunction(this._transitionOptions?.easing);

      const isDoubleScene = this._activeTransitionEffect && (this._activeTransitionEffect as any).drawsBothScenes === true;
      const peakProgress = isDoubleScene ? 1.0 : 0.5;

      if (rawProgress < 0.5) {
        this.state = SceneState.UNLOADING;
        this.transitionProgress = easingFunc(rawProgress);
        if (this.eventBus) {
          this.eventBus.emit("scene:transition:progress", { progress: this.transitionProgress });
        }
      } else {
        // 1. Dispatch onExit on the old scene exactly once at the peak of transition
        if (rawProgress >= peakProgress && !this._onExitCalled) {
          this._onExitCalled = true;
          if (this._transitionOldScene) {
            const isPush = this._transitionOptions?.type === "push";
            if (!isPush) {
              const oldSceneRef = this._transitionOldScene;
              runLifecycleAsync(async () => {
                await oldSceneRef.onExit(oldSceneRef.getWorld());
              });
            }
          }
        }

        // 2. Ensure incoming scene has loaded completely
        const enterErr = this._onEnterError();
        if (enterErr) {
          this._transitionReject?.(enterErr);
          return;
        }

        if (!this._onEnterResolved()) {
          // Keep visually stuck at progress 0.5 while wait loading
          this._transitionElapsed = duration / 2;
          this.transitionProgress = easingFunc(0.5);
          if (this.eventBus) {
            this.eventBus.emit("scene:transition:progress", { progress: this.transitionProgress });
          }
          return;
        }

        // 3. Reveal phase
        this.state = SceneState.LOADING;

        if (this._transitionNewScene && this.currentScene !== this._transitionNewScene) {
          this.currentScene = this._transitionNewScene;
          const isPush = this._transitionOptions?.type === "push";
          const isPop = this._transitionOptions?.type === "pop";

          if (isPush) {
            if (!this.sceneStack.includes(this._transitionNewScene)) {
              this.sceneStack.push(this._transitionNewScene);
            }
          } else if (isPop) {
            if (this.sceneStack.length > 1) {
              this.sceneStack.pop();
            }
            this.currentScene = this.sceneStack[this.sceneStack.length - 1];
          } else {
            this.sceneStack = [this._transitionNewScene];
          }
        }

        this.transitionProgress = easingFunc(rawProgress);
        if (this.eventBus) {
          this.eventBus.emit("scene:transition:progress", { progress: this.transitionProgress });
        }

        if (rawProgress >= 1.0) {
          this.state = SceneState.ACTIVE;
          const finishedScene = this.currentScene;

          if (this._transitionOptions?.type === "pop" && finishedScene) {
            runLifecycleSync(() => finishedScene.onResume());
          }

          this._transitionResolve?.();

          if (this.eventBus && finishedScene) {
            this.eventBus.emit("scene:transition:success", { scene: finishedScene });
          }
        }
      }
    } else if (this.state === SceneState.ACTIVE && this.currentScene) {
      this.currentScene.onUpdate(deltaTime, this.currentScene.getWorld());
    }
  }

  /**
   * Dispatches the render call to the active scene.
   *
   * @param alpha - Interpolation factor between 0 and 1.
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
   * Binds a StoryRuntime instance and a scene factory to enable data-driven scene switches.
   * Preserves StoryRuntime state across scene transitions.
   *
   * @param runtime - Active StoryRuntime instance.
   * @param sceneFactory - Factory function creating a Scene for a given scene identifier.
   */
  public bindStoryRuntime(
    runtime: StoryRuntime,
    sceneFactory: (sceneName: string) => Scene<TComponents>
  ): void {
    if (!this.eventBus) return;

    this.eventBus.on("story:scene_change" as any, async (payload: { sceneToLoad: string }) => {
      if (!payload || !payload.sceneToLoad) return;
      const newScene = sceneFactory(payload.sceneToLoad);
      if (newScene) {
        const newWorld = newScene.getWorld();
        newWorld.setResource("StoryRuntime", runtime);
        runtime.bindWorld(newWorld as any);

        await this.transitionTo(newScene);
      }
    });
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
    this._cleanupTransition();
  }
}
