import { System, World } from "@tiny-aster/core";
import { ShmupComponentRegistry, ShmupEventRegistry } from "../types/ShmupTypes";

/**
 * Fades and shrinks pool particles as their TTL expires so debris softens out
 * instead of popping when reclaim runs.
 */
export class ShmupParticleFadeSystem extends System<ShmupComponentRegistry, ShmupEventRegistry> {
  update(world: World<ShmupComponentRegistry, ShmupEventRegistry>, _dt: number): void {
    for (const entity of world.query("Render", "TTL")) {
      const render = world.getComponent(entity, "Render");
      if (!render || render.shape !== "particle") continue;

      const ttl = world.getComponent(entity, "TTL");
      if (!ttl) continue;

      const total = Math.max(1e-4, ttl.timeLeft || ttl.remaining || 1);
      const remaining = Math.max(0, ttl.remaining);
      const life = remaining / total;
      // Ease-out so particles stay bright briefly then fall off.
      const fade = life * life;

      world.mutateComponent(entity, "Render", (r) => {
        r.opacity = fade;
        // Optional shrink: store base size once via size * (0.55 + 0.45 * life)
        if (typeof r.size === "number" && r.size > 0) {
          const base = (r as { _particleBaseSize?: number })._particleBaseSize;
          if (base === undefined) {
            (r as { _particleBaseSize?: number })._particleBaseSize = r.size;
          }
          const b = (r as { _particleBaseSize?: number })._particleBaseSize ?? r.size;
          r.size = b * (0.5 + 0.5 * life);
        }
      });
    }
  }
}
