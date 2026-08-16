import { EventBus } from "../events/EventBus";

/**
 * Representation of the different states in the Arcade Kernel.
 * @public
 */
export enum ArcadeState {
  BOOT = "BOOT",
  LOADING = "LOADING",
  TITLE = "TITLE",
  MENU = "MENU",
  PLAYING = "PLAYING",
  PAUSED = "PAUSED",
  GAME_OVER = "GAME_OVER",
  STORY = "STORY"
}

/**
 * Valid transitions definition map to enforce flow determinism.
 */
const VALID_TRANSITIONS: Record<ArcadeState, Set<ArcadeState>> = {
  [ArcadeState.BOOT]: new Set([ArcadeState.LOADING]),
  [ArcadeState.LOADING]: new Set([ArcadeState.TITLE, ArcadeState.MENU]),
  [ArcadeState.TITLE]: new Set([ArcadeState.MENU, ArcadeState.PLAYING]),
  [ArcadeState.MENU]: new Set([ArcadeState.PLAYING, ArcadeState.LOADING, ArcadeState.STORY]),
  [ArcadeState.PLAYING]: new Set([ArcadeState.PAUSED, ArcadeState.GAME_OVER, ArcadeState.MENU, ArcadeState.STORY]),
  [ArcadeState.PAUSED]: new Set([ArcadeState.PLAYING, ArcadeState.MENU, ArcadeState.GAME_OVER]),
  [ArcadeState.GAME_OVER]: new Set([ArcadeState.PLAYING, ArcadeState.MENU, ArcadeState.TITLE]),
  [ArcadeState.STORY]: new Set([ArcadeState.PLAYING, ArcadeState.MENU])
};

/**
 * Central State Machine managing high-level application flows and retro game states.
 *
 * @remarks
 * Decouples the frontend layout transitions (e.g. going from Menu to Playing) from
 * both React Native and specific game logic.
 * @public
 */
export class ArcadeKernel {
  private currentState: ArcadeState = ArcadeState.BOOT;
  private eventBus: EventBus<any>;

  constructor(eventBus?: EventBus<any>) {
    this.eventBus = eventBus ?? new EventBus();
  }

  /**
   * Retrieves the current active state of the Arcade Kernel.
   */
  public getState(): ArcadeState {
    return this.currentState;
  }

  /**
   * Transitions the application flow to a next state if valid.
   * Emits state transition events to notify external presentation layers.
   */
  public transitionTo(nextState: ArcadeState, payload?: Record<string, unknown>): void {
    if (this.currentState === nextState) return;

    const allowed = VALID_TRANSITIONS[this.currentState];
    if (!allowed || !allowed.has(nextState)) {
      throw new Error(`[ArcadeKernel] Invalid transition: Cannot transition from ${this.currentState} to ${nextState}`);
    }

    const previousState = this.currentState;
    this.currentState = nextState;

    this.eventBus.emit("arcade:state_changed", {
      from: previousState,
      to: nextState,
      ...payload
    });
  }
}
