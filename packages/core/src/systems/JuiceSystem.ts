import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { VisualOffsetComponent, RenderComponent, CoreComponentRegistry } from "../ecs/CoreComponents";

/**
 * System that manages procedural "juice" visual animations (e.g., scale bounces, hit flashes, visual offsets).
 *
 * @remarks
 * Interpolates target numeric properties on `VisualOffsetComponent`, `RenderComponent`, or arbitrary components specified
 * via `JuiceAnimation.componentType`. Skips execution during rollback re-simulation (`world.isReSimulating === true`).
 *
 * @example
 * ```ts
 * const juiceSystem = new JuiceSystem();
 * world.addSystem(juiceSystem);
 * juiceSystem.update(world, 0.016);
 * ```
 *
 * @public
 */
export class JuiceSystem extends System<CoreComponentRegistry> {
    /**
     * Updates elapsed animation timers, evaluates easing curves, and applies interpolated component properties.
     *
     * @param world - The ECS world containing active entities and components.
     * @param deltaTime - Elapsed frame duration in seconds.
     */
    public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
        if (world.isReSimulating) return;

        const juiceEntities = world.query("Juice");
        const len = juiceEntities.length;

        for (let i = 0; i < len; i++) {
            const entity = juiceEntities[i];
            const jCheck = world.getComponent(entity, "Juice");
            if (!jCheck || jCheck.animations.length === 0) continue;

            // Safe for determinism/rollback. Fetch mutable Juice only when there are active animations to update, keeping stateVersion resting-state overhead to exactly zero.
            const j = world.getMutableComponent(entity, "Juice")!;
            const offset = world.getComponent(entity, "VisualOffset");
            const render = world.getComponent(entity, "Render");

            for (let k = j.animations.length - 1; k >= 0; k--) {
                const anim = j.animations[k];
                anim.elapsed += deltaTime;

                if (anim.delay && anim.elapsed < anim.delay) continue;

                const effectiveElapsed = anim.elapsed - (anim.delay || 0);
                const progress = Math.min(1, effectiveElapsed / anim.duration);
                const easedProgress = this.getEasedValue(progress, anim.easing);

                if (anim.startValue === undefined && anim.property) {
                    anim.startValue = this.getCurrentValue(world, entity, anim.property, anim.componentType, offset, render);
                }

                if (anim.target !== undefined && anim.startValue !== undefined && anim.property) {
                    const value = anim.startValue + (anim.target - anim.startValue) * easedProgress;
                    this.applyValue(world, entity, anim.property, value, anim.componentType);
                }

                if (progress >= 1) {
                    if (anim.repeat && anim.repeat > 0) {
                        anim.elapsed = 0;
                        anim.repeat--;
                    } else {
                        j.animations.splice(k, 1);
                    }
                }
            }
        }
    }

    private getCurrentValue(
        world: World<CoreComponentRegistry>,
        entity: number,
        prop: string,
        componentType?: string,
        offset?: import("../index").DeepReadonly<VisualOffsetComponent>,
        render?: import("../index").DeepReadonly<RenderComponent>
    ): number {
        if (componentType) {
            const comp = world.getComponent(entity, componentType as any);
            if (comp) {
                return (comp as unknown as Record<string, number>)[prop] ?? 0;
            }
            return 0;
        }

        if (offset && (prop === "offsetX" || prop === "offsetY" || prop === "x" || prop === "y" || prop === "scaleX" || prop === "scaleY")) {
            const key = (prop === "x" || prop === "y") ? (prop === "x" ? "offsetX" : "offsetY") : prop;
            return (offset as unknown as Record<string, number>)[key] ?? 0;
        }
        if (render && (prop === "opacity" || prop === "rotation")) {
            return (render as unknown as Record<string, number>)[prop] ?? 0;
        }
        return 0;
    }

    private applyValue(
        world: World<CoreComponentRegistry>,
        entity: number,
        prop: string,
        value: number,
        componentType?: string
    ): void {
        if (componentType) {
            const comp = world.getComponent(entity, componentType as any);
            if (comp) {
                const currentVal = (comp as unknown as Record<string, number>)[prop] ?? 0;
                if (Math.abs(currentVal - value) > 0.0001) {
                    const mutComp = world.getMutableComponent(entity, componentType as any);
                    if (mutComp) {
                        (mutComp as unknown as Record<string, number>)[prop] = value;
                    }
                }
            }
            return;
        }

        if (prop === "scaleX" || prop === "scaleY" || prop === "x" || prop === "y") {
            const key = (prop === "x" || prop === "y") ? (prop === "x" ? "offsetX" : "offsetY") : prop;
            const currentOffset = world.getComponent(entity, "VisualOffset");
            if (currentOffset) {
                const currentVal = (currentOffset as unknown as Record<string, number>)[key] ?? 0;
                // Safe for determinism/rollback. Gate mutable access on actual value change to prevent unnecessary stateVersion increments.
                if (Math.abs(currentVal - value) > 0.0001) {
                    const o = world.getMutableComponent(entity, "VisualOffset");
                    if (o) {
                        (o as unknown as Record<string, number>)[key] = value;
                    }
                }
            }
        } else if (prop === "opacity" || prop === "rotation") {
            const currentRender = world.getComponent(entity, "Render");
            if (currentRender) {
                const currentVal = (currentRender as unknown as Record<string, number>)[prop] ?? 0;
                // Safe for determinism/rollback. Gate mutable access on actual value change to prevent unnecessary stateVersion increments.
                if (Math.abs(currentVal - value) > 0.0001) {
                    const r = world.getMutableComponent(entity, "Render");
                    if (r) {
                        (r as unknown as Record<string, number>)[prop] = value;
                    }
                }
            }
        }
    }

    private getEasedValue(t: number, easing?: string): number {
        switch (easing) {
            case "easeIn": return t * t;
            case "easeOut": return t * (2 - t);
            case "easeInOut": return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            case "elasticOut": {
                const p = 0.3;
                return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
            }
            default: return t;
        }
    }
}
