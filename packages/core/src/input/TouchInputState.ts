export interface TouchTapEvent {
  x: number;
  y: number;
  timestamp: number;
}

export interface TouchFlingEvent {
  direction: "up" | "down" | "left" | "right";
  timestamp: number;
}

export interface TouchLaneShiftEvent {
  direction: "left" | "right";
  timestamp: number;
}

export class TouchInputState {
  public moveX: number = 0;
  public moveY: number = 0;
  public aimX: number = 0;
  public aimY: number = 0;
  public paddlePosition: number = 0.5;
  public pointerX: number = 0;
  public pointerY: number = 0;

  private buttons: Record<string, boolean> = {};
  private tapsQueue: TouchTapEvent[] = [];
  private flingsQueue: TouchFlingEvent[] = [];
  private laneShiftsQueue: TouchLaneShiftEvent[] = [];

  public setButton(name: string, active: boolean): void {
    if (active) {
      this.buttons[name] = true;
    } else {
      delete this.buttons[name];
    }
  }

  public isButtonActive(name: string): boolean {
    return !!this.buttons[name];
  }

  public getActiveButtons(): string[] {
    return Object.keys(this.buttons).filter((key) => this.buttons[key]);
  }

  public pushTap(x: number, y: number, timestamp: number = Date.now()): void {
    this.tapsQueue.push({ x, y, timestamp });
  }

  public pushFling(direction: "up" | "down" | "left" | "right", timestamp: number = Date.now()): void {
    this.flingsQueue.push({ direction, timestamp });
  }

  public pushLaneShift(direction: "left" | "right", timestamp: number = Date.now()): void {
    this.laneShiftsQueue.push({ direction, timestamp });
  }

  public consumeTaps(): TouchTapEvent[] {
    const events = this.tapsQueue;
    this.tapsQueue = [];
    return events;
  }

  public consumeFlings(): TouchFlingEvent[] {
    const events = this.flingsQueue;
    this.flingsQueue = [];
    return events;
  }

  public consumeLaneShifts(): TouchLaneShiftEvent[] {
    const events = this.laneShiftsQueue;
    this.laneShiftsQueue = [];
    return events;
  }

  public flushDiscreteEvents(): void {
    this.tapsQueue = [];
    this.flingsQueue = [];
    this.laneShiftsQueue = [];
  }

  public reset(): void {
    this.moveX = 0;
    this.moveY = 0;
    this.aimX = 0;
    this.aimY = 0;
    this.paddlePosition = 0.5;
    this.pointerX = 0;
    this.pointerY = 0;
    this.buttons = {};
    this.flushDiscreteEvents();
  }
}
