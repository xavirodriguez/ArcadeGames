import { System, World } from "@tiny-aster/core";
import { ShmupComponentRegistry, ShmupEventRegistry } from "../types/ShmupTypes";

function smoothstep(progress: number): number {
  const clamped = Math.max(0, Math.min(1, progress));
  return clamped * clamped * (3 - 2 * clamped);
}

export class EnemyPathSystem extends System<ShmupComponentRegistry, ShmupEventRegistry> {
  update(world: World<ShmupComponentRegistry, ShmupEventRegistry>, deltaTime: number): void {
    for (const entity of world.query("ShmupEnemy", "EnemyPath", "Transform")) {
      const path = world.getMutableComponent(entity, "EnemyPath");
      const transform = world.getMutableComponent(entity, "Transform");
      if (!path || !transform) continue;
      path.elapsed += deltaTime;
      const t = path.elapsed;
      if (path.kind === "sine") {
        transform.x = path.originX + Math.sin(t * path.frequency) * path.amplitude;
      } else if (path.kind === "arc") {
        const duration = path.duration > 0 ? path.duration : 8;
        const progress = Math.min(1, Math.max(0, t / duration));
        transform.x = path.originX + Math.sin(progress * Math.PI) * path.amplitude;
      } else if (path.kind === "hover") {
        // Deterministic entry easing + bob. Both are functions of accumulated
        // simulation time, so they are frame-rate independent and replay-safe.
        const entryProgress = path.duration > 0 ? t / path.duration : 1;
        const hoverY = path.hoverY ?? path.originY;
        const eased = smoothstep(entryProgress);
        const bobTime = Math.max(0, t - path.duration);
        const bob = entryProgress >= 1
          ? Math.sin(bobTime * (path.bobFrequency ?? 0)) * (path.bobAmplitude ?? 0)
          : 0;
        transform.x = path.originX + Math.sin(t * path.frequency) * path.amplitude;
        transform.y = path.originY + (hoverY - path.originY) * eased + bob;
      }
      transform.dirty = true;
    }
  }
}
