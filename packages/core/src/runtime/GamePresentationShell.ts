import { BaseGame } from "./BaseGame";
import { ComponentRegistry, BlueprintRegistryMap } from "../ecs/World";
import { EventRegistry } from "../events/EventBus";
import { SceneManager } from "../scenes/SceneManager";
import { IAudioPlayer, NullAudioPlayer } from "../audio/IAudioPlayer";

/**
 * Pure calculation function for screen configuration based on canvas dimensions or window viewport defaults.
 *
 * @param canvas - Optional HTML Canvas element target.
 * @returns Screen configuration object `{ width, height, pixelRatio }`.
 * @public
 */
export function calculateScreenConfig(canvas?: HTMLCanvasElement): { width: number; height: number; pixelRatio: number } {
  let width = 800;
  let height = 600;
  let pixelRatio = 1;

  if (canvas) {
    width = canvas.clientWidth || canvas.width || width;
    height = canvas.clientHeight || canvas.height || height;
  } else if (typeof window !== "undefined") {
    width = window.innerWidth || width;
    height = window.innerHeight || height;
    pixelRatio = window.devicePixelRatio || 1;
  }

  return { width, height, pixelRatio };
}

/**
 * Options for initializing a `GamePresentationShell`.
 *
 * @public
 */
export interface GamePresentationShellOptions {
  /** Platform-agnostic audio player instance. */
  audio?: IAudioPlayer;
  /** HTML Canvas Element target for rendering and viewport dimensions. */
  canvas?: HTMLCanvasElement;
}

/**
 * Presentation shell encapsulating audio, scene management, rendering viewport,
 * and window resize lifecycle around a game simulation instance.
 *
 * @typeParam TComponents - Component registry type.
 * @typeParam TEvents - Event registry type.
 * @typeParam TInput - Input action dictionary type.
 * @typeParam TBlueprints - Blueprint registry map type.
 *
 * @public
 */
export class GamePresentationShell<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TInput extends object = Record<string, unknown>,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> {
  /** The underlying game simulation instance. */
  public readonly game: BaseGame<unknown, TInput, TComponents, TEvents, TBlueprints>;
  /** Audio player service instance. */
  public audio: IAudioPlayer;
  /** Scene manager for data-driven scene lifecycle and narrative transitions. */
  public sceneManager: SceneManager<TComponents>;
  /** Target HTML canvas element when running in browser environment. */
  public canvas?: HTMLCanvasElement;
  private resizeListenerBound?: () => void;

  /**
   * Constructs a `GamePresentationShell` wrapping a `BaseGame` instance.
   *
   * @param game - The game simulation instance to wrap.
   * @param options - Presentation shell configuration options.
   */
  constructor(
    game: BaseGame<unknown, TInput, TComponents, TEvents, TBlueprints>,
    options: GamePresentationShellOptions = {}
  ) {
    this.game = game;
    this.audio = options.audio ?? game.audio ?? new NullAudioPlayer();
    this.sceneManager = game.sceneManager;
    this.canvas = options.canvas;
  }

  /**
   * Calculates current screen configuration based on canvas dimensions, window inner size, or default fallback (800x600).
   *
   * @returns `ScreenConfig` object `{ width, height, pixelRatio }`.
   */
  public calculateScreenConfig(): { width: number; height: number; pixelRatio: number } {
    return calculateScreenConfig(this.canvas);
  }

  /**
   * Recalculates screen config and updates the `"ScreenConfig"` resource on the game's world.
   */
  public handleScreenResize(): void {
    const config = this.calculateScreenConfig();
    this.game.world.setResource("ScreenConfig", config);
  }

  /**
   * Attaches a window resize event listener that delegates to `handleScreenResize()`.
   */
  public registerResizeListener(): void {
    if (typeof window === "undefined") return;
    this.unregisterResizeListener();
    this.resizeListenerBound = () => this.handleScreenResize();
    window.addEventListener("resize", this.resizeListenerBound);
  }

  /**
   * Removes the window resize event listener if previously registered.
   */
  public unregisterResizeListener(): void {
    if (typeof window !== "undefined" && this.resizeListenerBound) {
      window.removeEventListener("resize", this.resizeListenerBound);
      this.resizeListenerBound = undefined;
    }
  }

  /**
   * Common setup helper for arcade minigame presentation. Sets screen config, registers resize listener, and saves canvas reference.
   *
   * @param canvas - Optional HTML canvas element.
   */
  public setupCommonArcadeResources(canvas?: HTMLCanvasElement): void {
    if (canvas) {
      this.canvas = canvas;
    }
    this.handleScreenResize();
    this.registerResizeListener();
  }

  /**
   * Unregisters event listeners and disposes presentation shell resources.
   */
  public destroy(): void {
    this.unregisterResizeListener();
  }
}
