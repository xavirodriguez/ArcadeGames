import { System, World, CoreComponentRegistry, Component, Entity } from "@tiny-aster/core";

/**
 * Capture state discriminator union.
 * @public
 */
export type CaptureState = "normal" | "trapped" | "popped" | "escaped";

/**
 * Component managing capture lifecycle transitions (normal -> trapped -> popped / escaped).
 *
 * @example
 * ```ts
 * const capturable: CapturableComponent = {
 *   type: "Capturable",
 *   state: "normal",
 *   elapsed: 0,
 *   maxDuration: 5.0,
 *   floatVelocityY: -30
 * };
 * world.addComponent(entity, capturable);
 * ```
 *
 * @public
 */
export interface CapturableComponent extends Component {
  /** Component discriminator type. */
  type: "Capturable";
  /** Current capture lifecycle state. */
  state: CaptureState;
  /** Entity ID of the capturing bubble or trap. */
  captorEntity?: Entity;
  /** Elapsed trapped duration in seconds. */
  elapsed: number;
  /** Maximum trapped duration before auto-escaping in seconds. */
  maxDuration: number;
  /** Upward float velocity when trapped (defaults to -20 px/s). */
  floatVelocityY?: number;
}

/**
 * Creates a new {@link CapturableComponent}.
 *
 * @param options - Configuration parameters.
 * @returns Initialized CapturableComponent instance.
 * @public
 */
export function createCapturable(options?: {
  maxDuration?: number;
  floatVelocityY?: number;
}): CapturableComponent {
  return {
    type: "Capturable",
    state: "normal",
    elapsed: 0,
    maxDuration: options?.maxDuration ?? 4.0,
    floatVelocityY: options?.floatVelocityY ?? -20,
  };
}

/**
 * System managing capture state transitions, floating behavior, escape timers, and pop events.
 *
 * @public
 */
export class CaptureSystem extends System<CoreComponentRegistry> {
  /**
   * Traps a target entity inside a capture volume (e.g. bubble or net).
   *
   * @param world - Simulation world.
   * @param target - Entity being trapped.
   * @param captor - Captor entity ID (bubble/net).
   * @param maxDuration - Optional custom capture duration in seconds.
   * @returns `true` if target carried a CapturableComponent and was trapped.
   * @public
   */
  public static trap(
    world: World<CoreComponentRegistry>,
    target: Entity,
    captor?: Entity,
    maxDuration?: number
  ): boolean {
    const capturable = world.getMutableComponent(target, "Capturable" as any) as CapturableComponent | undefined;
    if (!capturable) return false;

    capturable.state = "trapped";
    capturable.captorEntity = captor;
    capturable.elapsed = 0;
    if (maxDuration !== undefined) {
      capturable.maxDuration = maxDuration;
    }

    const eventBus = world.getEventBus();
    if (eventBus) {
      eventBus.emit("capture:trapped" as any, {
        entity: target,
        captorEntity: captor,
      });
    }

    return true;
  }

  /**
   * Pops/destroys a trapped entity (e.g. player pops bubble containing trapped enemy).
   *
   * @param world - Simulation world.
   * @param target - Trapped entity being popped.
   * @param source - Entity triggering the pop (e.g. player).
   * @returns `true` if target was in `trapped` state and popped.
   * @public
   */
  public static pop(
    world: World<CoreComponentRegistry>,
    target: Entity,
    source?: Entity
  ): boolean {
    const capturable = world.getMutableComponent(target, "Capturable" as any) as CapturableComponent | undefined;
    if (!capturable || capturable.state !== "trapped") return false;

    capturable.state = "popped";

    const eventBus = world.getEventBus();
    if (eventBus) {
      eventBus.emit("capture:popped" as any, {
        entity: target,
        captorEntity: capturable.captorEntity,
        popSourceEntity: source,
      });
    }

    return true;
  }

  /**
   * Updates trapped entity float physics and escape timer transitions.
   *
   * @param world - Simulation world.
   * @param deltaTime - Frame duration in seconds.
   */
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true || deltaTime <= 0) return;

    const entities = world.query("Capturable" as any);
    const len = entities.length;

    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const capturable = world.getMutableComponent(entity, "Capturable" as any) as CapturableComponent | undefined;
      if (!capturable || capturable.state !== "trapped") continue;

      // Apply floating upward movement while trapped
      const vel = world.getMutableComponent(entity, "Velocity");
      if (vel) {
        vel.vx = 0;
        vel.vy = capturable.floatVelocityY ?? -20;
      }

      // Increment trapped timer
      capturable.elapsed += deltaTime;

      if (capturable.elapsed >= capturable.maxDuration) {
        capturable.state = "escaped";

        const eventBus = world.getEventBus();
        if (eventBus) {
          eventBus.emit("capture:escaped" as any, {
            entity,
            captorEntity: capturable.captorEntity,
          });
        }
      }
    }
  }
}
