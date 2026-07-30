import { World } from "../ecs/World";
import { GameLoop } from "../loop/GameLoop";

/** @public */
export interface RecorderFrame {
  tick: number;
  timestamp: number;
  inputs: Array<{
    entityId: number;
    componentType: string;
    data: any;
  }>;
}

/**
 * Captures and records user input states per simulation tick.
 *
 * @remarks
 * Subscribes to the GameLoop's update tick and captures any component matching
 * "input" safely in a JSON serializable format.
 *
 * @public
 */
export class ReplayRecorder {
  private world: World;
  private gameLoop: GameLoop;
  private isRecording = false;
  private frames: RecorderFrame[] = [];
  private unsubscribeUpdate?: () => void;
  private tickCounter = 0;

  constructor(world: World, gameLoop: GameLoop) {
    this.world = world;
    this.gameLoop = gameLoop;
  }

  /**
   * Starts capturing inputs per tick.
   */
  public startRecording(): void {
    if (this.isRecording) return;
    this.isRecording = true;
    this.frames = [];
    this.tickCounter = 0;

    this.unsubscribeUpdate = this.gameLoop.subscribeUpdate(() => {
      if (!this.isRecording) return;
      this.tickCounter++;
      this.captureFrame();
    });
  }

  /**
   * Stops recording and returns the captured replay data.
   */
  public stopRecording(): any {
    this.isRecording = false;
    if (this.unsubscribeUpdate) {
      this.unsubscribeUpdate();
      this.unsubscribeUpdate = undefined;
    }
    return {
      recordedAt: Date.now(),
      totalTicks: this.tickCounter,
      frames: [...this.frames],
    };
  }

  private captureFrame(): void {
    const entities = this.world.getAllEntities();
    const frameInputs: any[] = [];

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const types = this.world.getEntityComponentTypes(entity);
      for (let j = 0; j < types.length; j++) {
        const type = types[j];
        if (type.toLowerCase().includes("input")) {
          const comp = this.world.getComponent(entity, type as any);
          if (comp) {
            frameInputs.push({
              entityId: entity,
              componentType: type,
              data: this.safeSerialize(comp),
            });
          }
        }
      }
    }

    this.frames.push({
      tick: this.tickCounter,
      timestamp: performance.now(),
      inputs: frameInputs,
    });
  }

  private safeSerialize(val: any): any {
    const seen = new WeakSet();
    const str = JSON.stringify(val, (key, value) => {
      if (value !== null && typeof value === "object") {
        if (value instanceof Set) {
          return Array.from(value);
        }
        if (seen.has(value)) {
          return "[Circular]";
        }
        seen.add(value);
      }
      return value;
    });
    return str ? JSON.parse(str) : null;
  }

  /**
   * Disposes of any active loop subscriptions.
   */
  public dispose(): void {
    if (this.unsubscribeUpdate) {
      this.unsubscribeUpdate();
      this.unsubscribeUpdate = undefined;
    }
  }
}
