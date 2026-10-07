/**
 * Discrete tap event representation.
 * @public
 */
export interface TouchTapEvent {
  x: number;
  y: number;
  timestamp: number;
}

/**
 * Discrete fling event representation.
 * @public
 */
export interface TouchFlingEvent {
  dirX: number;
  dirY: number;
  speed?: number;
}

/**
 * Discrete lane shift event representation.
 * @public
 */
export type TouchLaneShiftEvent = "left" | "right";

/**
 * Data contract representing the complete continuous and discrete touch input state.
 * @public
 */
export interface ITouchInputState {
  /** Continuous normalized horizontal movement axis [-1, 1] */
  moveX: number;
  /** Continuous normalized vertical movement axis [-1, 1] */
  moveY: number;
  /** Action button state flags by button name */
  buttons: Record<string, boolean>;
  /** Paddle / Slider position */
  paddlePos: { x: number; y: number };
  /** General screen pointer / target position */
  pointerPos: { x: number; y: number };
  /** Queue of discrete tap events */
  taps: TouchTapEvent[];
  /** Queue of discrete fling events */
  flings: TouchFlingEvent[];
  /** Queue of discrete lane shift events */
  laneShifts: TouchLaneShiftEvent[];
}

/**
 * Mutable touch input state manager consumed per simulation frame.
 * Platform-agnostic (pure JS/TS logic).
 * @public
 */
export class TouchInputState implements ITouchInputState {
  public moveX = 0;
  public moveY = 0;
  public buttons: Record<string, boolean> = {};
  public paddlePos = { x: 0, y: 0 };
  public pointerPos = { x: 0, y: 0 };
  public taps: TouchTapEvent[] = [];
  public flings: TouchFlingEvent[] = [];
  public laneShifts: TouchLaneShiftEvent[] = [];

  /**
   * Updates continuous movement axes [-1, 1].
   */
  public setMove(x: number, y: number): void {
    this.moveX = x;
    this.moveY = y;
  }

  /**
   * Sets button pressed flag.
   */
  public setButton(name: string, pressed: boolean): void {
    this.buttons[name] = pressed;
  }

  /**
   * Reads button pressed state.
   */
  public getButton(name: string): boolean {
    return !!this.buttons[name];
  }

  /**
   * Updates paddle position.
   */
  public setPaddlePos(x: number, y: number): void {
    this.paddlePos.x = x;
    this.paddlePos.y = y;
  }

  /**
   * Updates pointer position.
   */
  public setPointerPos(x: number, y: number): void {
    this.pointerPos.x = x;
    this.pointerPos.y = y;
  }

  /**
   * Enqueues a tap event.
   */
  public addTap(x: number, y: number, timestamp = Date.now()): void {
    this.taps.push({ x, y, timestamp });
  }

  /**
   * Enqueues a fling event.
   */
  public addFling(dirX: number, dirY: number, speed?: number): void {
    this.flings.push({ dirX, dirY, speed });
  }

  /**
   * Enqueues a lane shift event.
   */
  public addLaneShift(direction: TouchLaneShiftEvent): void {
    this.laneShifts.push(direction);
  }

  /**
   * Pops and returns all accumulated tap events, clearing the queue.
   */
  public consumeTaps(): TouchTapEvent[] {
    const consumed = this.taps;
    this.taps = [];
    return consumed;
  }

  /**
   * Pops and returns all accumulated fling events, clearing the queue.
   */
  public consumeFlings(): TouchFlingEvent[] {
    const consumed = this.flings;
    this.flings = [];
    return consumed;
  }

  /**
   * Pops and returns all accumulated lane shift events, clearing the queue.
   */
  public consumeLaneShifts(): TouchLaneShiftEvent[] {
    const consumed = this.laneShifts;
    this.laneShifts = [];
    return consumed;
  }

  /**
   * Consumes all discrete event queues in a single call.
   */
  public consumeEvents(): {
    taps: TouchTapEvent[];
    flings: TouchFlingEvent[];
    laneShifts: TouchLaneShiftEvent[];
  } {
    return {
      taps: this.consumeTaps(),
      flings: this.consumeFlings(),
      laneShifts: this.consumeLaneShifts(),
    };
  }

  /**
   * Resets all continuous and discrete states to default/empty.
   */
  public reset(): void {
    this.moveX = 0;
    this.moveY = 0;
    this.buttons = {};
    this.paddlePos = { x: 0, y: 0 };
    this.pointerPos = { x: 0, y: 0 };
    this.taps = [];
    this.flings = [];
    this.laneShifts = [];
  }
}
