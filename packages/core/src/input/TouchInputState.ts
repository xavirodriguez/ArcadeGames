/**
 * Platform-agnostic mutable state container for touch inputs.
 * Captures both continuous states (axes, buttons, paddle) and discrete consumable event queues.
 * @public
 */

export interface DiscreteTapEvent {
  x: number;
  y: number;
  id?: string;
  timestamp: number;
}

export interface DiscreteFlingEvent {
  direction: "up" | "down" | "left" | "right";
  velocityX: number;
  velocityY: number;
  timestamp: number;
}

export interface DiscreteLaneShiftEvent {
  direction: -1 | 1 | "left" | "right";
  timestamp: number;
}

export interface TouchPointerState {
  x: number;
  y: number;
  active: boolean;
}

export class TouchInputState {
  /** Continuous directional axis x in [-1, 1]. */
  public moveX: number = 0;
  /** Continuous directional axis y in [-1, 1]. */
  public moveY: number = 0;

  /** Continuous aiming axis x in [-1, 1]. */
  public aimX: number = 0;
  /** Continuous aiming axis y in [-1, 1]. */
  public aimY: number = 0;

  /** Map of named button flags currently pressed. */
  public buttons: Record<string, boolean> = {};

  /** Active pointer position (e.g. touch coordinate on canvas/screen). */
  public pointer: TouchPointerState = { x: 0, y: 0, active: false };

  /** Active paddle position (e.g. Arkanoid/Pong paddle position). */
  public paddle: TouchPointerState = { x: 0, y: 0, active: false };

  /** Discrete tap event queue consumed per frame. */
  private tapsQueue: DiscreteTapEvent[] = [];

  /** Discrete fling event queue consumed per frame. */
  private flingsQueue: DiscreteFlingEvent[] = [];

  /** Discrete lane shift event queue consumed per frame. */
  private laneShiftsQueue: DiscreteLaneShiftEvent[] = [];

  public setMoveAxis(x: number, y: number): void {
    this.moveX = x;
    this.moveY = y;
  }

  public setAimAxis(x: number, y: number): void {
    this.aimX = x;
    this.aimY = y;
  }

  public setButton(name: string, pressed: boolean): void {
    this.buttons[name] = pressed;
  }

  public getButton(name: string): boolean {
    return Boolean(this.buttons[name]);
  }

  public setPointer(x: number, y: number, active: boolean = true): void {
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.active = active;
  }

  public setPaddle(x: number, y: number, active: boolean = true): void {
    this.paddle.x = x;
    this.paddle.y = y;
    this.paddle.active = active;
  }

  public pushTap(tap: { x: number; y: number; id?: string; timestamp?: number }): void {
    this.tapsQueue.push({
      x: tap.x,
      y: tap.y,
      id: tap.id,
      timestamp: tap.timestamp ?? Date.now(),
    });
  }

  public pushFling(fling: {
    direction: "up" | "down" | "left" | "right";
    velocityX?: number;
    velocityY?: number;
    timestamp?: number;
  }): void {
    this.flingsQueue.push({
      direction: fling.direction,
      velocityX: fling.velocityX ?? 0,
      velocityY: fling.velocityY ?? 0,
      timestamp: fling.timestamp ?? Date.now(),
    });
  }

  public pushLaneShift(laneShift: {
    direction: -1 | 1 | "left" | "right";
    timestamp?: number;
  }): void {
    this.laneShiftsQueue.push({
      direction: laneShift.direction,
      timestamp: laneShift.timestamp ?? Date.now(),
    });
  }

  /** Consumes and returns all queued tap events, clearing the internal queue. */
  public consumeTaps(): DiscreteTapEvent[] {
    const taps = this.tapsQueue;
    this.tapsQueue = [];
    return taps;
  }

  /** Consumes and returns all queued fling events, clearing the internal queue. */
  public consumeFlings(): DiscreteFlingEvent[] {
    const flings = this.flingsQueue;
    this.flingsQueue = [];
    return flings;
  }

  /** Consumes and returns all queued lane shift events, clearing the internal queue. */
  public consumeLaneShifts(): DiscreteLaneShiftEvent[] {
    const laneShifts = this.laneShiftsQueue;
    this.laneShiftsQueue = [];
    return laneShifts;
  }

  /** Consumes and returns all discrete events at once, clearing internal queues. */
  public consumeEvents(): {
    taps: DiscreteTapEvent[];
    flings: DiscreteFlingEvent[];
    laneShifts: DiscreteLaneShiftEvent[];
  } {
    return {
      taps: this.consumeTaps(),
      flings: this.consumeFlings(),
      laneShifts: this.consumeLaneShifts(),
    };
  }

  /** Resets all continuous states and clears all event queues. */
  public reset(): void {
    this.moveX = 0;
    this.moveY = 0;
    this.aimX = 0;
    this.aimY = 0;
    this.buttons = {};
    this.pointer = { x: 0, y: 0, active: false };
    this.paddle = { x: 0, y: 0, active: false };
    this.tapsQueue = [];
    this.flingsQueue = [];
    this.laneShiftsQueue = [];
  }
}
