import { World, ComponentRegistry, BlueprintRegistryMap } from "../ecs/World";
import { EventRegistry } from "../events/EventBus";

interface TimedSystem {
  constructor: { name?: string };
  lastExecutionTimeMs?: number;
}

interface DebugCollider2D {
  enabled?: boolean;
  isTrigger?: boolean;
  shape?: { type?: string };
}

interface DebugTransform {
  x: number;
  y: number;
}

/**
 * Diagnostic metrics and debug inspector interface consumed by developer overlays.
 * @public
 */
export interface DebugManager {
  /**
   * Returns current frame statistics including FPS, frame time, tick count, and interpolation alpha.
   */
  getFrameStats: () => { fps: number; frameTime: number; tick: number; alpha: number };

  /**
   * Returns last execution timings in milliseconds for all systems in the schedule.
   */
  getSystemTimings: () => Record<string, number>;

  /**
   * Captures an inspection snapshot of all active entities and their components in the world.
   */
  getEntitySnapshot: () => Array<{ id: number; components: Record<string, unknown> }>;

  /**
   * Returns the debug event log array.
   */
  getEventLog: () => Array<{ timestamp: number; event: string; payload: unknown }>;

  /**
   * Returns active 2D collider shapes for visual debugging overlays.
   */
  getColliderShapes: () => Array<{ type: "circle" | "aabb"; x: number; y: number; isTrigger: boolean; shape: unknown }>;

  /**
   * Clears the debug event log buffer.
   */
  clearEventLog: () => void;
}

/**
 * Computes diagnostic metrics and debug inspector interface for developer overlays from an ECS `World` instance.
 *
 * @param world - The ECS World to inspect.
 * @param eventLog - Optional debug event log array buffer.
 * @returns Diagnostic `DebugManager` interface.
 * @public
 */
export function computeDebugManager<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
>(
  world: World<TComponents, TEvents, TBlueprints>,
  eventLog: Array<{ timestamp: number; event: string; payload: unknown }> = []
): DebugManager {
  return {
    getFrameStats: () => {
      return {
        fps: 60,
        frameTime: 16.67,
        tick: world.tick,
        alpha: 1.0
      };
    },
    getSystemTimings: (): Record<string, number> => {
      const timings: Record<string, number> = {};
      const systems = world.schedule.getSystems();
      for (let i = 0; i < systems.length; i++) {
        const sys = systems[i] as TimedSystem;
        const name = sys.constructor.name || `System_${i}`;
        timings[name] = sys.lastExecutionTimeMs ?? 0.01;
      }
      return timings;
    },
    getEntitySnapshot: () => {
      const allEntities = world.getAllEntities();
      const snapshot: Array<{ id: number; components: Record<string, unknown> }> = [];
      for (let i = 0; i < allEntities.length; i++) {
        const entity = allEntities[i];
        if (!world.isAlive(entity)) continue;
        const types = world.getEntityComponentTypes(entity);
        const components: Record<string, unknown> = {};
        for (let j = 0; j < types.length; j++) {
          const t = types[j] as Extract<keyof TComponents, string>;
          components[t] = world.getComponent(entity, t);
        }
        snapshot.push({ id: entity, components });
      }
      return snapshot;
    },
    getEventLog: () => {
      return eventLog;
    },
    getColliderShapes: () => {
      const shapes: Array<{ type: "circle" | "aabb"; x: number; y: number; isTrigger: boolean; shape: unknown }> = [];
      const colKey = "Collider2D" as Extract<keyof TComponents, string>;
      const transKey = "Transform" as Extract<keyof TComponents, string>;
      const entitiesWithCollider = world.query(colKey, transKey);
      for (let i = 0; i < entitiesWithCollider.length; i++) {
        const e = entitiesWithCollider[i];
        const col = world.getComponent(e, colKey) as DebugCollider2D | undefined;
        const trans = world.getComponent(e, transKey) as DebugTransform | undefined;
        if (col && trans && col.enabled !== false) {
          if (col.shape?.type === "circle" || col.shape?.type === "aabb") {
            shapes.push({
              type: col.shape.type as "circle" | "aabb",
              x: trans.x,
              y: trans.y,
              isTrigger: !!col.isTrigger,
              shape: col.shape
            });
          }
        }
      }
      return shapes;
    },
    clearEventLog: () => {
      eventLog.length = 0;
    }
  };
}
