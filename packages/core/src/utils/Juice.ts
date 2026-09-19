import { World, BlueprintRegistryMap } from "../ecs/World";
import { EventRegistry } from "../events/EventBus";
import { Entity } from "../ecs/Entity";
import { RenderComponent, JuiceComponent, CoreComponentRegistry, ScreenShakeComponent } from "../ecs/CoreComponents";

/**
 * Static utility for applying juice effects (squash, stretch, shake, flash).
 * Works in tandem with the JuiceSystem.
 * @public
 */
export class Juice {
  /**
   * Adds a temporary color flash to an entity.
   */
  public static flash<
    TComponents extends CoreComponentRegistry = CoreComponentRegistry,
    TEvents extends EventRegistry = EventRegistry,
    TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
  >(world: World<TComponents, TEvents, TBlueprints>, entity: Entity, frames: number = 5): void {
    const coreWorld = world as unknown as World<CoreComponentRegistry>;
    coreWorld.mutateComponent(entity, "Render", (render) => {
      render.hitFlashFrames = frames;
    });
  }

  /**
   * Shakes the screen (world singleton Camera2D if available, or ScreenShake resource).
   */
  public static shake<
    TComponents extends CoreComponentRegistry = CoreComponentRegistry,
    TEvents extends EventRegistry = EventRegistry,
    TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
  >(world: World<TComponents, TEvents, TBlueprints>, intensity: number, duration: number): void {
    const coreWorld = world as unknown as World<CoreComponentRegistry>;
    const shake = coreWorld.getSingleton("ScreenShake");
    if (shake) {
        coreWorld.mutateSingleton("ScreenShake", (s) => {
            s.intensity = Math.max(s.intensity, intensity);
            s.duration = Math.max(s.duration, duration);
            s.remaining = Math.max(s.remaining, duration);
        });
    } else {
        // Fallback to resource-based shake if component not found
        const res = coreWorld.getResource<{intensity: number, duration: number, remaining: number}>("ScreenShake");
        if (res) {
            res.intensity = Math.max(res.intensity, intensity);
            res.duration = Math.max(res.duration, duration);
            res.remaining = Math.max(res.remaining, duration);
        } else {
            // Fallback for GameState singleton holding screenShake (e.g. Space Invaders)
            const gameState = coreWorld.getSingleton("GameState") as { screenShake?: { intensity?: number; duration?: number; totalDuration?: number } } | undefined;
            if (gameState && "screenShake" in gameState) {
                const durSec = duration > 10 ? duration / 1000 : duration;
                coreWorld.mutateSingleton("GameState", (gs) => {
                    const currentShake = (gs as { screenShake?: { intensity?: number; duration?: number; totalDuration?: number } }).screenShake;
                    if (!currentShake || (currentShake.duration ?? 0) <= 0) {
                        (gs as { screenShake?: unknown }).screenShake = {
                            intensity,
                            duration: durSec,
                            elapsed: 0,
                            totalDuration: durSec
                        };
                    } else {
                        (gs as { screenShake?: unknown }).screenShake = {
                            intensity: Math.max(currentShake.intensity ?? 0, intensity),
                            duration: Math.max(currentShake.duration ?? 0, durSec),
                            elapsed: 0,
                            totalDuration: Math.max(currentShake.totalDuration ?? 0, durSec)
                        };
                    }
                });
            }
        }
    }
  }

  /**
   * Adds a general juice animation to an entity.
   */
  public static add<
    TComponents extends CoreComponentRegistry = CoreComponentRegistry,
    TEvents extends EventRegistry = EventRegistry,
    TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
  >(world: World<TComponents, TEvents, TBlueprints>, entity: Entity, anim: {
    componentType?: string;
    property: string;
    target: number;
    duration: number;
    easing?: string;
    delay?: number;
    repeat?: number;
  }): void {
    const coreWorld = world as unknown as World<CoreComponentRegistry>;
    if (!coreWorld.hasComponent(entity, "Juice")) {
        coreWorld.addComponent(entity, { type: "Juice", active: true, animations: [] });
    }
    if (!anim.componentType && !coreWorld.hasComponent(entity, "VisualOffset")) {
        coreWorld.addComponent(entity, { type: "VisualOffset", offsetX: 0, offsetY: 0 });
    }

    const durationInSeconds = anim.duration / 1000;
    const delayInSeconds = anim.delay ? anim.delay / 1000 : 0;

    coreWorld.mutateComponent(entity, "Juice", (juice) => {
        juice.animations.push({
            type: "animation",
            ...anim,
            duration: durationInSeconds,
            delay: delayInSeconds,
            elapsed: 0
        });
    });
  }

  /**
   * Simple squash and stretch animation.
   */
  public static squash<
    TComponents extends CoreComponentRegistry = CoreComponentRegistry,
    TEvents extends EventRegistry = EventRegistry,
    TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
  >(world: World<TComponents, TEvents, TBlueprints>, entity: Entity, sx: number, sy: number, duration: number): void {
    this.add(world, entity, {
        property: "scaleX",
        target: sx,
        duration: duration / 2,
        easing: "easeOut"
    });
    this.add(world, entity, {
        property: "scaleX",
        target: 1,
        duration: duration / 2,
        delay: duration / 2,
        easing: "elasticOut"
    });
    this.add(world, entity, {
        property: "scaleY",
        target: sy,
        duration: duration / 2,
        easing: "easeOut"
    });
    this.add(world, entity, {
        property: "scaleY",
        target: 1,
        duration: duration / 2,
        delay: duration / 2,
        easing: "elasticOut"
    });
  }
}
