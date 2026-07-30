import { World } from "../../ecs/World";
import { EventBus } from "../../events/EventBus";
import { GameLoop } from "../../loop/GameLoop";
import { Entity } from "../../ecs/Entity";
import { ShapeType } from "../../physics/shapes/Shapes";
import { ColliderComponent, Collider2DComponent, TransformComponent } from "../../ecs/CoreComponents";

/** @public */
export interface EventLogEntry {
  timestamp: number;
  event: string;
  payload: any;
}

/** @public */
export interface FrameStats {
  fps: number;
  frameTime: number;
  tick: number;
  alpha: number;
}

/** @public */
export interface ColliderShapeInfo {
  type: "circle" | "aabb";
  x: number;
  y: number;
  isTrigger: boolean;
  shape: any;
}

/**
 * Manages runtime engine debug data, statistics, and event logging.
 *
 * @remarks
 * Designed to capture frame stats, system timings, entity snapshots, and
 * collider shapes to satisfy the DebugOverlay polling interface.
 *
 * @public
 */
export class DebugManager {
  private world: World;
  private eventBus: EventBus;
  private gameLoop: GameLoop;

  private tick = 0;
  private alpha = 0;
  private lastRenderTime = 0;
  private renderTimes: number[] = [];
  private currentFrameTime = 0;

  private systemTimings: Record<string, number> = {};
  private eventLog: EventLogEntry[] = [];

  private unsubscribeUpdate?: () => void;
  private unsubscribeRender?: () => void;

  private originalEmit?: typeof EventBus.prototype.emit;
  private originalWorldAddSystem?: typeof World.prototype.addSystem;
  private originalScheduleAddSystem?: typeof World.prototype.schedule.addSystem;
  private originalUpdates = new WeakMap<any, any>();

  constructor(world: World, eventBus: EventBus, gameLoop: GameLoop) {
    this.world = world;
    this.eventBus = eventBus;
    this.gameLoop = gameLoop;

    this.setupSubscriptions();
    this.setupMonkeyPatching();
  }

  private setupSubscriptions(): void {
    this.unsubscribeUpdate = this.gameLoop.subscribeUpdate(() => {
      this.tick++;
    });

    const renderCallback = (alpha: number) => {
      this.alpha = alpha;
      const now = performance.now();
      if (this.lastRenderTime > 0) {
        this.currentFrameTime = now - this.lastRenderTime;
      }
      this.lastRenderTime = now;
      this.renderTimes.push(now);

      const oneSecondAgo = now - 1000;
      while (this.renderTimes.length > 0 && this.renderTimes[0] < oneSecondAgo) {
        this.renderTimes.shift();
      }
    };
    this.unsubscribeRender = this.gameLoop.subscribeRender(renderCallback);
  }

  private setupMonkeyPatching(): void {
    const self = this;

    // 1. Monkey-patch EventBus.emit to record all events.
    // Note: EventBus does not have a native wildcard subscription mechanism,
    // so we intercept the emit call to log all dispatched events.
    this.originalEmit = this.eventBus.emit;
    this.eventBus.emit = function (this: any, event: any, payload: any) {
      self.logEvent(event, payload);
      return self.originalEmit!.call(this, event, payload);
    };

    // 2. Monkey-patch system update methods to track execution time.
    // Intercept when new systems are registered to wrap them automatically.
    const originalWorldAddSystem = this.world.addSystem;
    this.originalWorldAddSystem = originalWorldAddSystem;
    this.world.addSystem = function (this: any, system: any, config: any) {
      self.wrapSystem(system);
      return originalWorldAddSystem.call(this, system, config);
    };

    const originalScheduleAddSystem = this.world.schedule.addSystem;
    this.originalScheduleAddSystem = originalScheduleAddSystem;
    this.world.schedule.addSystem = function (this: any, system: any, config: any, world: any) {
      self.wrapSystem(system);
      return originalScheduleAddSystem.call(this, system, config, world);
    };

    // Wrap any existing systems that are already in the schedule.
    const existingSystems = this.world.schedule.getSystems();
    for (const system of existingSystems) {
      this.wrapSystem(system);
    }
  }

  private wrapSystem(system: any): void {
    if (!system || typeof system.update !== "function") return;
    if (system.update.__wrapped) return;

    const originalUpdate = system.update;
    this.originalUpdates.set(system, originalUpdate);

    const self = this;
    const wrappedUpdate = function (this: any, world: any, deltaTime: number) {
      const startTime = performance.now();
      try {
        originalUpdate.call(this, world, deltaTime);
      } finally {
        const duration = performance.now() - startTime;
        const systemName = system.constructor.name || "UnknownSystem";
        self.systemTimings[systemName] = duration;
      }
    };
    (wrappedUpdate as any).__wrapped = true;
    system.update = wrappedUpdate;
  }

  private logEvent(event: string, payload: any): void {
    const timestamp = performance.now();
    const safePayload = this.safeSerialize(payload);
    this.eventLog.push({ timestamp, event, payload: safePayload });
    if (this.eventLog.length > 200) {
      this.eventLog.shift();
    }
  }

  private safeSerialize(val: any): any {
    const seen = new WeakSet();
    const str = JSON.stringify(val, (key, value) => {
      if (value !== null && typeof value === "object") {
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
   * Retrieves frame rate and timing statistics.
   */
  public getFrameStats(): FrameStats {
    const fps = this.renderTimes.length;
    return {
      fps,
      frameTime: this.currentFrameTime,
      tick: this.tick,
      alpha: this.alpha,
    };
  }

  /**
   * Retrieves timing records for registered systems.
   */
  public getSystemTimings(): Record<string, number> {
    return { ...this.systemTimings };
  }

  /**
   * Generates a safe, non-circular state snapshot of all active entities and components.
   */
  public getEntitySnapshot(): Array<{ id: number; components: Record<string, unknown> }> {
    const entities = this.world.getAllEntities();
    const snapshot: Array<{ id: number; components: Record<string, unknown> }> = [];

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const types = this.world.getEntityComponentTypes(entity);
      const components: Record<string, unknown> = {};

      for (let j = 0; j < types.length; j++) {
        const type = types[j];
        const comp = this.world.getComponent(entity, type as any);
        if (comp !== undefined) {
          components[type] = this.safeSerialize(comp);
        }
      }

      snapshot.push({
        id: entity,
        components,
      });
    }

    return snapshot;
  }

  /**
   * Returns the event logs.
   */
  public getEventLog(): EventLogEntry[] {
    return [...this.eventLog];
  }

  /**
   * Clears the event logs buffer.
   */
  public clearEventLog(): void {
    this.eventLog = [];
  }

  /**
   * Maps active entity physical colliders into the standardized Shape format.
   */
  public getColliderShapes(): ColliderShapeInfo[] {
    const entities = this.world.getAllEntities();
    const shapes: ColliderShapeInfo[] = [];

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const transform = this.world.getComponent(entity, "Transform" as any) as TransformComponent | undefined;
      const x = transform ? transform.x : 0;
      const y = transform ? transform.y : 0;

      // Handle Collider2DComponent
      const col2d = this.world.getComponent(entity, "Collider2D" as any) as Collider2DComponent | undefined;
      if (col2d && col2d.enabled) {
        const cx = x + (col2d.offsetX || 0);
        const cy = y + (col2d.offsetY || 0);
        shapes.push({
          type: col2d.shape.type as "circle" | "aabb",
          x: cx,
          y: cy,
          isTrigger: col2d.isTrigger,
          shape: col2d.shape,
        });
        continue;
      }

      // Handle ColliderComponent
      const col = this.world.getComponent(entity, "Collider" as any) as ColliderComponent | undefined;
      if (col && col.enabled) {
        const cx = x + (col.offsetX || 0);
        const cy = y + (col.offsetY || 0);
        const shape = col.shape;

        if (shape.type === ShapeType.Circle) {
          shapes.push({
            type: "circle",
            x: cx,
            y: cy,
            isTrigger: col.isTrigger,
            shape: { radius: shape.radius },
          });
        } else if (shape.type === ShapeType.Box) {
          shapes.push({
            type: "aabb",
            x: cx,
            y: cy,
            isTrigger: col.isTrigger,
            shape: {
              halfWidth: shape.width / 2,
              halfHeight: shape.height / 2,
            },
          });
        }
        // Note: ConvexPolygonShape is explicitly ignored because ColliderShapeInfo overlay only supports circle and aabb.
      }
    }

    return shapes;
  }

  /**
   * Disposes the DebugManager by unsubscribing from event sources and restoring original updates.
   */
  public dispose(): void {
    if (this.unsubscribeUpdate) {
      this.unsubscribeUpdate();
    }
    if (this.unsubscribeRender) {
      this.unsubscribeRender();
    }
    if (this.originalEmit) {
      this.eventBus.emit = this.originalEmit;
    }
    if (this.originalWorldAddSystem) {
      this.world.addSystem = this.originalWorldAddSystem;
    }
    if (this.originalScheduleAddSystem) {
      this.world.schedule.addSystem = this.originalScheduleAddSystem;
    }

    const systems = this.world.schedule.getSystems();
    for (const system of systems) {
      const original = this.originalUpdates.get(system);
      if (original) {
        system.update = original;
      }
    }
  }
}
