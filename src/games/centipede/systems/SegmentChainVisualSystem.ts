import { System, World } from "@tiny-aster/core";
import { CentipedeComponentRegistry, CentipedeEventRegistry } from "../types/CentipedeTypes";
import { CentipedeConfig, DEFAULT_CENTIPEDE_CONFIG } from "../types/CentipedeConfigSchema";

export class SegmentChainVisualSystem extends System<CentipedeComponentRegistry, CentipedeEventRegistry> {
  public update(world: World<CentipedeComponentRegistry, CentipedeEventRegistry>, dt: number): void {
    const config = world.getResource<CentipedeConfig>("GameConfig") || DEFAULT_CENTIPEDE_CONFIG;
    const stiffness = config.visual.springStiffness;
    const damping = config.visual.springDamping;

    const segments = world.query("CentipedeSegment", "SegmentVisual", "Transform");

    for (const entity of segments) {
      const seg = world.getComponent(entity, "CentipedeSegment");
      const vis = world.getMutableComponent(entity, "SegmentVisual");
      const transform = world.getComponent(entity, "Transform");

      if (!seg || !vis || !transform) continue;

      if (vis.popTimerMs > 0) {
        vis.popTimerMs -= dt * 1000;
      }

      const targetX = transform.x;
      const targetY = transform.y;

      const dx = targetX - vis.visualX;
      const dy = targetY - vis.visualY;

      const ax = dx * stiffness - vis.vx * damping;
      const ay = dy * stiffness - vis.vy * damping;

      vis.vx += ax * dt;
      vis.vy += ay * dt;

      vis.visualX += vis.vx * dt;
      vis.visualY += vis.vy * dt;

      if (vis.vx !== 0 || vis.vy !== 0) {
        vis.angle = Math.atan2(vis.vy, vis.vx);
      } else {
        vis.angle = seg.dirX >= 0 ? 0 : Math.PI;
      }
    }
  }
}
