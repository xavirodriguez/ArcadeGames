import { System, World, CoreComponentRegistry, Component } from "@tiny-aster/core";

/**
 * Pattern type classification.
 * @public
 */
export type PathPatternType = "sine" | "circle" | "waypoints";

/**
 * Component defining scripted movement trajectories (sine wave, circular orbit, or waypoint path).
 *
 * @example
 * ```ts
 * const pattern: PathPatternComponent = {
 *   type: "PathPattern",
 *   pattern: "sine",
 *   originX: 100,
 *   originY: 200,
 *   speed: 50,
 *   frequency: 2.0,
 *   amplitude: 30,
 *   elapsed: 0
 * };
 * world.addComponent(entity, pattern);
 * ```
 *
 * @public
 */
export interface PathPatternComponent extends Component {
  /** Component discriminator type. */
  type: "PathPattern";
  /** Movement pattern classification. */
  pattern: PathPatternType;
  /** Origin X coordinate around which pattern oscillates or revolves. */
  originX: number;
  /** Origin Y coordinate around which pattern oscillates or revolves. */
  originY: number;
  /** Linear movement speed in units/s. */
  speed: number;
  /** Oscillation / rotation frequency in Hz (cycles per second). */
  frequency?: number;
  /** Oscillation / orbital radius amplitude in pixels. */
  amplitude?: number;
  /** Waypoint coordinate sequence for "waypoints" pattern. */
  waypoints?: { x: number; y: number }[];
  /** Current active target waypoint index. */
  currentWaypointIndex?: number;
  /** Whether waypoint path loops back to start (defaults to true). */
  loop?: boolean;
  /** Accumulated pattern motion time in seconds. */
  elapsed: number;
}

/**
 * Creates a new {@link PathPatternComponent}.
 *
 * @param config - Pattern configuration parameters.
 * @returns Initialized PathPatternComponent.
 * @public
 */
export function createPathPattern(config: {
  pattern: PathPatternType;
  originX: number;
  originY: number;
  speed: number;
  frequency?: number;
  amplitude?: number;
  waypoints?: { x: number; y: number }[];
  loop?: boolean;
}): PathPatternComponent {
  return {
    type: "PathPattern",
    pattern: config.pattern,
    originX: config.originX,
    originY: config.originY,
    speed: config.speed,
    frequency: config.frequency ?? 1.0,
    amplitude: config.amplitude ?? 40,
    waypoints: config.waypoints ? config.waypoints.map((w) => ({ ...w })) : [],
    currentWaypointIndex: 0,
    loop: config.loop ?? true,
    elapsed: 0,
  };
}

/**
 * System driving scripted enemy movement patterns (sine wave, circular orbit, and waypoints).
 *
 * @public
 */
export class PathPatternsSystem extends System<CoreComponentRegistry> {
  /**
   * Updates entity positions following their configured PathPatternComponent parameters.
   *
   * @param world - Simulation world.
   * @param deltaTime - Frame duration in seconds.
   */
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true || deltaTime <= 0) return;

    const entities = world.query("PathPattern" as any, "Transform");
    const len = entities.length;

    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const pattern = world.getMutableComponent(entity, "PathPattern" as any) as PathPatternComponent | undefined;
      const trans = world.getMutableComponent(entity, "Transform");
      if (!pattern || !trans) continue;

      pattern.elapsed += deltaTime;

      if (pattern.pattern === "sine") {
        const freq = pattern.frequency ?? 1.0;
        const amp = pattern.amplitude ?? 40;

        trans.x = pattern.originX + pattern.elapsed * pattern.speed;
        trans.y = pattern.originY + Math.sin(pattern.elapsed * freq * 2 * Math.PI) * amp;
        trans.dirty = true;
      } else if (pattern.pattern === "circle") {
        const freq = pattern.frequency ?? 1.0;
        const radius = pattern.amplitude ?? 40;
        const angle = pattern.elapsed * freq * 2 * Math.PI;

        trans.x = pattern.originX + Math.cos(angle) * radius;
        trans.y = pattern.originY + Math.sin(angle) * radius;
        trans.dirty = true;
      } else if (pattern.pattern === "waypoints" && pattern.waypoints && pattern.waypoints.length > 0) {
        const idx = pattern.currentWaypointIndex ?? 0;
        const target = pattern.waypoints[idx];
        if (!target) continue;

        const dx = target.x - trans.x;
        const dy = target.y - trans.y;
        const dist = Math.hypot(dx, dy);
        const step = pattern.speed * deltaTime;

        if (dist <= step || dist < 0.001) {
          // Reached target waypoint
          trans.x = target.x;
          trans.y = target.y;
          trans.dirty = true;

          const nextIdx = idx + 1;
          if (nextIdx < pattern.waypoints.length) {
            pattern.currentWaypointIndex = nextIdx;
          } else if (pattern.loop !== false) {
            pattern.currentWaypointIndex = 0;
          }
        } else {
          // Move toward target
          trans.x += (dx / dist) * step;
          trans.y += (dy / dist) * step;
          trans.dirty = true;
        }
      }
    }
  }
}
