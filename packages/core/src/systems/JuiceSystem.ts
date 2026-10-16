import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { VisualOffsetComponent, RenderComponent, CoreComponentRegistry } from "../ecs/CoreComponents";

/**
 * Helper to safely extract a numeric property from a generic object without `any` or `unknown`.
 */
function getNumericProperty<T extends object>(obj: T, prop: string): number {
    if (prop in obj) {
        const val = Reflect.get(obj, prop);
        if (typeof val === "number") {
            return val;
        }
    }
    return 0;
}

/**
 * Helper to safely assign a numeric property onto a generic object without `any` or `unknown`.
 */
function setNumericProperty<T extends object>(obj: T, prop: string, value: number): void {
    if (prop in obj) {
        Reflect.set(obj, prop, value);
    }
}

function resolveComponentObject(
    world: World<CoreComponentRegistry>,
    entity: number,
    componentType: string
): object | null {
    const registryKey = componentType as Extract<keyof CoreComponentRegistry, string>;
    if (world.hasComponent(entity, registryKey)) {
        const comp = world.getComponent(entity, registryKey);
        if (comp && typeof comp === "object") {
            return comp as object;
        }
    }
    return null;
}

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
    public override runsWhileFrozen = true;

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
            const comp = resolveComponentObject(world, entity, componentType);
            if (comp) {
                return getNumericProperty(comp, prop);
            }
            return 0;
        }

        if (offset && (prop === "offsetX" || prop === "offsetY" || prop === "x" || prop === "y" || prop === "scaleX" || prop === "scaleY")) {
            const key = (prop === "x" || prop === "y") ? (prop === "x" ? "offsetX" : "offsetY") : prop;
            return getNumericProperty(offset, key);
        }
        if (render && (prop === "opacity" || prop === "rotation")) {
            return getNumericProperty(render, prop);
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
            const comp = resolveComponentObject(world, entity, componentType);
            if (comp) {
                const currentVal = getNumericProperty(comp, prop);
                if (Math.abs(currentVal - value) > 0.0001) {
                    const registryKey = componentType as Extract<keyof CoreComponentRegistry, string>;
                    const mutComp = world.getMutableComponent(entity, registryKey);
                    if (mutComp && typeof mutComp === "object") {
                        setNumericProperty(mutComp, prop, value);
                    }
                }
            }
            return;
        }

        if (prop === "scaleX" || prop === "scaleY" || prop === "x" || prop === "y" || prop === "offsetX" || prop === "offsetY") {
            const key = (prop === "x" || prop === "y") ? (prop === "x" ? "offsetX" : "offsetY") : prop;
            const currentOffset = world.getComponent(entity, "VisualOffset");
            if (currentOffset) {
                const currentVal = getNumericProperty(currentOffset, key);
                if (Math.abs(currentVal - value) > 0.0001) {
                    const mutOffset = world.getMutableComponent(entity, "VisualOffset");
                    if (mutOffset) {
                        setNumericProperty(mutOffset, key, value);
                    }
                }
            }
        } else if (prop === "opacity" || prop === "rotation") {
            const currentRender = world.getComponent(entity, "Render");
            if (currentRender) {
                const currentVal = getNumericProperty(currentRender, prop);
                if (Math.abs(currentVal - value) > 0.0001) {
                    const mutRender = world.getMutableComponent(entity, "Render");
                    if (mutRender) {
                        setNumericProperty(mutRender, prop, value);
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
