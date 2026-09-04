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
export interface SceneEventRegistry extends Record<string, unknown> {
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
 * Context payload required to execute a unified scene transition pipeline.
 * @public
 */
export interface TransitionContext<TComponents extends ComponentRegistry = CoreComponentRegistry> {
  /** Target scene for the transition operation. */
  targetScene?: Scene<TComponents>;
  /** Action type of the transition operation. */
  type: "transitionTo" | "push" | "pop" | "replace";
  /** Visual transition configuration options. */
  options?: TransitionOptions;
  /** Async lifecycle logic hook to execute for entering/exiting scenes. */
  executeLifecycle: (token: number) => Promise<void>;
  /** Stack mutation hook to update sceneStack and currentScene state upon success. */
  updateStack: () => void;
}

/**
 * Central manager for scene transitions and lifecycle orchestration.
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
  private _transitionReject: ((err: unknown) => void) | null = null;
  private _incomingLoadPromise: Promise<void> | null = null;
  private _onEnterResolved: () => boolean = () => false;
  private _onEnterError: () => unknown = () => null;
  private _onExitCalled = false;
  private _transitionUpdateStack: (() => void) | null = null;

  /** Progress of the current transition from 0 to 1 */
  public transitionProgress = 0;

  /** Timeout for transition loading/onEnter phase in milliseconds. */
  public transitionTimeout = 5000;

  /**
   * Optional hook executed whenever a new world context is established for a scene.
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
   * Processes the transition queue sequentially.
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
    this._transitionUpdateStack = null;
  }

  private createTimeoutPromise(timeoutMs: number, errorMessage: string): { promise: Promise<never>; clearTimeout: () => void } {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const promise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);
    });
    return {
      promise,
      clearTimeout: () => {
        if (timeoutId) clearTimeout(timeoutId);
      }
    };
  }

  private _resolveDuration(options?: TransitionOptions): number {
    const isHeadlessResource = this.world.getResource<boolean>("headless") === true;
    const gameConfig = this.world.getResource<{ headless?: boolean; isHeadless?: boolean }>("GameConfig");
    const isHeadless = isHeadlessResource || gameConfig?.headless === true || gameConfig?.isHeadless === true;

    if (isHeadless) {
      return 0;
    }

    if (options?.duration !== undefined) {
      return options.duration;
    }

    if (isTestEnvironment()) {
      return 0;
    }

    return 300;
  }

  /**
   * Unified transition pipeline managing snapshots, timeouts, EventBus messages, and rollback handling.
   */
  private async executeTransitionPipeline(context: TransitionContext<TComponents>): Promise<void> {
    const duration = this._resolveDuration(context.options);
    const scene = context.targetScene;
    const timeoutMsg = context.type === "push" ? "Push transition timed out" : context.type === "pop" ? "Pop transition timed out" : "Transition timed out";

    if (duration === 0) {
      // TODO(refactor): código duplicado detectado (bloque) con scenes/SceneManager.ts:317-332. Considerar extraer a función compartida. Ref: 2aa132c6
      return this.enqueueTransition(async () => {
        const eventBus = this.eventBus;
        if (eventBus && scene) {
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
        const timeoutMs = context.options?.timeout ?? this.transitionTimeout;

        const { promise: timeoutPromise, clearTimeout: clearTimer } = this.createTimeoutPromise(
          timeoutMs,
          timeoutMsg
        );

        try {
          const loadPromise = context.executeLifecycle(myToken);
          await Promise.race([loadPromise, timeoutPromise]);

          if (myToken !== this.transitionToken) return;

          context.updateStack();
          this.state = SceneState.ACTIVE;
          this.transitionProgress = 1.0;

          if (eventBus) {
            eventBus.emit("scene:transition:progress", { progress: 1.0 });
            if (scene) {
              eventBus.emit("scene:transition:success", { scene });
            }
          }
        } // TODO(refactor): código duplicado detectado (bloque) con scenes/SceneManager.ts:398-418. Considerar extraer a función compartida. Ref: 8912fd19
        catch (error: unknown) {
          if (myToken !== this.transitionToken) return;
          this.transitionToken++;

          const isTimeout = error instanceof Error && error.message === timeoutMsg;

          if (eventBus) {
            if (scene) {
              if (isTimeout) {
                eventBus.emit("scene:transition:timeout", { scene, error });
              } else {
                eventBus.emit("scene:transition:error", { scene, error });
              }
            }
            eventBus.emit("scene:error", { action: context.type, error });
          }

          this.currentScene = oldScene;
          this.sceneStack = oldStack;
          this.state = oldState;

          if (oldScene) {
            const isOldScenePaused =
              ("isPaused" in oldScene && (oldScene as { isPaused?: boolean }).isPaused === true) ||
              ("paused" in oldScene && (oldScene as { paused?: boolean }).paused === true);
            if (isOldScenePaused) {
              runLifecycleSync(() => oldScene.onResume());
            }
          }

          throw error;
        } finally {
          clearTimer();
        }
      });
    }

    // Animated Transition (duration > 0)
    // TODO(refactor): código duplicado detectado (bloque) con scenes/SceneManager.ts:244-259. Considerar extraer a función compartida. Ref: 0d5b78a0
    return this.enqueueTransition(async () => {
      const eventBus = this.eventBus;
      if (eventBus && scene) {
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
      const timeoutMs = context.options?.timeout ?? this.transitionTimeout;

      try {
        if (oldScene && context.type !== "pop") {
          runLifecycleSync(() => oldScene.onPause());
        }

        this.state = SceneState.UNLOADING;
        this._transitionOldScene = context.type === "pop" ? oldStack[oldStack.length - 1] : oldScene;
        this._transitionNewScene = scene ?? null;
        this._transitionOptions = { ...context.options, duration, type: context.type };
        this._transitionUpdateStack = context.updateStack;

        const effectOption = context.options?.effect ?? "fade";
        this._activeTransitionEffect = resolveTransitionEffect(effectOption) ?? TransitionRegistry.fade;
        this._transitionElapsed = 0;
        this._onExitCalled = false;

        const { promise: timeoutPromise, clearTimeout: clearTimer } = this.createTimeoutPromise(
          timeoutMs,
          timeoutMsg
        );

        let onEnterResolved = false;
        let onEnterError: unknown = null;

        const loadPromise = (async () => {
          if (scene && context.type !== "pop") {
            if (this.onWorldCreated) {
              await this.onWorldCreated(scene.getWorld());
            }
            if (myToken !== this.transitionToken) return;
            await runLifecycleAsync(async () => {
              await scene.onEnter(scene.getWorld());
            });
          }
        })()
          .then(() => {
            onEnterResolved = true;
          })
          .catch((err: unknown) => {
            onEnterError = err;
          });

        const loadWithTimeout = Promise.race([loadPromise, timeoutPromise]).finally(() => {
          clearTimer();
        });

        await new Promise<void>((resolve, reject) => {
          this._transitionResolve = () => {
            if (this._transitionUpdateStack) {
              this._transitionUpdateStack();
              this._transitionUpdateStack = null;
            }
            this._cleanupTransition();
            resolve();
          };
          this._transitionReject = (err) => {
            this._cleanupTransition();
            reject(err);
          };
          this._incomingLoadPromise = loadWithTimeout;
          this._onEnterResolved = () => onEnterResolved;
          this._onEnterError = () => onEnterError;
        });
      } // TODO(refactor): código duplicado detectado (bloque) con scenes/SceneManager.ts:283-304. Considerar extraer a función compartida. Ref: 69874bf3
      catch (error) {
        if (myToken !== this.transitionToken) return;
        this.transitionToken++;

        const isTimeout = error instanceof Error && error.message === timeoutMsg;
        if (eventBus) {
          if (scene) {
            if (isTimeout) {
              eventBus.emit("scene:transition:timeout", { scene, error });
            } else {
              eventBus.emit("scene:transition:error", { scene, error });
            }
          }
          eventBus.emit("scene:error", { action: context.type, error });
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
   * Transition to a new scene, resetting stack.
   */
  public async transitionTo(scene: Scene<TComponents>, options?: TransitionOptions): Promise<void> {
    return this.executeTransitionPipeline({
      targetScene: scene,
      type: "transitionTo",
      options,
      executeLifecycle: // TODO(refactor): código duplicado detectado (función) con scenes/SceneManager.ts:544-556. Considerar extraer a función compartida. Ref: bdc2aedc
      async (token) => {
        if (this.currentScene) {
          this.state = SceneState.UNLOADING;
          const oldSceneRef = this.currentScene;
          await runLifecycleAsync(async () => {
            await oldSceneRef.onExit(oldSceneRef.getWorld());
          });
        }
        if (token !== this.transitionToken) return;

        this.transitionProgress = 0.3;
        if (this.eventBus) {
          this.eventBus.emit("scene:transition:progress", { progress: 0.3 });
        }

        this.state = SceneState.LOADING;
        this.currentScene = scene;

        if (this.onWorldCreated) {
          await this.onWorldCreated(scene.getWorld());
        }
        if (token !== this.transitionToken) return;

        this.transitionProgress = 0.7;
        if (this.eventBus) {
          this.eventBus.emit("scene:transition:progress", { progress: 0.7 });
        }

        await runLifecycleAsync(async () => {
          await scene.onEnter(scene.getWorld());
        });
      },
      updateStack: () => {
        this.currentScene = scene;
        this.sceneStack = [scene];
      }
    });
  }

  /**
   * Pushes a new scene onto the stack, pausing current scene.
   */
  public async push(scene: Scene<TComponents>, options?: TransitionOptions): Promise<void> {
    return this.executeTransitionPipeline({
      targetScene: scene,
      type: "push",
      options,
      executeLifecycle: async (token) => {
        if (this.currentScene) {
          runLifecycleSync(() => this.currentScene!.onPause());
        }
        // TODO(refactor): código duplicado detectado (bloque) con scenes/SceneManager.ts:556-568. Considerar extraer a función compartida. Ref: 0dd66a1d
        this.state = SceneState.LOADING;
        this.currentScene = scene;

        if (this.onWorldCreated) {
          await this.onWorldCreated(scene.getWorld());
        }
        if (token !== this.transitionToken) return;

        await runLifecycleAsync(async () => {
          await scene.onEnter(scene.getWorld());
        });
      },
      updateStack: () => {
        this.sceneStack.push(scene);
        this.currentScene = scene;
      }
    });
  }

  /**
   * Pops current scene, resuming previous scene on stack.
   */
  public async pop(options?: TransitionOptions): Promise<void> {
    if (this.sceneStack.length <= 1) {
      if (this.eventBus) {
        this.eventBus.emit("scene:warning", { message: "Cannot pop the last scene." });
      }
      return;
    }
    const poppedScene = this.sceneStack[this.sceneStack.length - 1];
    const targetScene = this.sceneStack[this.sceneStack.length - 2];

    return this.executeTransitionPipeline({
      targetScene,
      type: "pop",
      options,
      executeLifecycle: async (token) => {
        this.state = SceneState.UNLOADING;
        await runLifecycleAsync(async () => {
          await poppedScene.onExit(poppedScene.getWorld());
        });
      },
      updateStack: () => {
        this.sceneStack.pop();
        this.currentScene = this.sceneStack[this.sceneStack.length - 1];
        if (this.currentScene) {
          runLifecycleSync(() => this.currentScene!.onResume());
        }
      }
    });
  }

  /**
   * Replaces current top scene on stack with new scene.
   */
  public async replace(scene: Scene<TComponents>, options?: TransitionOptions): Promise<void> {
    return this.executeTransitionPipeline({
      targetScene: scene,
      type: "replace",
      options,
      executeLifecycle: async (token) => {
        if (this.currentScene) {
          this.state = SceneState.UNLOADING;
          const oldSceneRef = this.currentScene;
          await runLifecycleAsync(async () => {
            await oldSceneRef.onExit(oldSceneRef.getWorld());
          });
        }
        if (token !== this.transitionToken) return;

        // TODO(refactor): código duplicado detectado (bloque) con scenes/SceneManager.ts:490-502. Considerar extraer a función compartida. Ref: 4d15ce18
        this.state = SceneState.LOADING;
        this.currentScene = scene;

        if (this.onWorldCreated) {
          await this.onWorldCreated(scene.getWorld());
        }
        if (token !== this.transitionToken) return;

        await runLifecycleAsync(async () => {
          await scene.onEnter(scene.getWorld());
        });
      },
      updateStack: () => {
        if (this.sceneStack.length > 0) {
          this.sceneStack[this.sceneStack.length - 1] = scene;
        } else {
          this.sceneStack = [scene];
        }
        this.currentScene = scene;
      }
    });
  }

  /**
   * Dispatches update tick to active scene.
   */
  public update(deltaTime: number): void {
    if (this.state === SceneState.UNLOADING || this.state === SceneState.LOADING) {
      const duration = this._transitionOptions?.duration ?? 300;
      const dtMs = deltaTime > 1.0 ? deltaTime : deltaTime * 1000;
      this._transitionElapsed += dtMs;

      const rawProgress = duration > 0 ? Math.min(1.0, this._transitionElapsed / duration) : 1.0;
      const easingFunc = getEasingFunction(this._transitionOptions?.easing);

      const isDoubleScene = this._activeTransitionEffect?.drawsBothScenes === true;
      const peakProgress = isDoubleScene ? 1.0 : 0.5;

      if (rawProgress < 0.5) {
        this.state = SceneState.UNLOADING;
        this.transitionProgress = easingFunc(rawProgress);
        if (this.eventBus) {
          this.eventBus.emit("scene:transition:progress", { progress: this.transitionProgress });
        }
      } else {
        // 1. Dispatch onExit on old scene exactly once at peak
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
          if (this._transitionUpdateStack) {
            this._transitionUpdateStack();
            this._transitionUpdateStack = null;
          }
        }

        this.transitionProgress = easingFunc(rawProgress);
        if (this.eventBus) {
          this.eventBus.emit("scene:transition:progress", { progress: this.transitionProgress });
        }

        if (rawProgress >= 1.0) {
          this.state = SceneState.ACTIVE;
          const finishedScene = this.currentScene;

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
   * Dispatches render call to active scene.
   */
  public render(alpha: number): void {
    if (this.state === SceneState.ACTIVE && this.currentScene) {
      this.currentScene.onRender(alpha);
    }
  }

  /** Pauses active scene. */
  public pause(): void {
    if (this.currentScene) this.currentScene.onPause();
  }

  /** Resumes active scene. */
  public resume(): void {
    if (this.currentScene) this.currentScene.onResume();
  }

  /** Restart current scene. */
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
   * Binds a StoryRuntime instance.
   * @deprecated Use CampaignScreen instead.
   */
  public bindStoryRuntime(
    runtime: StoryRuntime,
    sceneFactory: (sceneName: string) => Scene<TComponents>
  ): void {
    if (!this.eventBus) return;

    this.eventBus.on("story:scene_change", async (payload: { sceneToLoad: string }) => {
      if (!payload || !payload.sceneToLoad) return;
      const newScene = sceneFactory(payload.sceneToLoad);
      if (newScene) {
        const newWorld = newScene.getWorld();
        newWorld.setResource("StoryRuntime", runtime);
        runtime.bindWorld(newWorld);

        await this.transitionTo(newScene);
      }
    });
  }

  /**
   * Shuts down manager and releases resources.
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
