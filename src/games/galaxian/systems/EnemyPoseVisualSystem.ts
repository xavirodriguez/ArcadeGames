import { System, World } from "@tiny-aster/core";
import { GalaxianComponentRegistry, GalaxianEnemyComponent, VisualPoseComponent } from "../types/GalaxianTypes";

export class EnemyPoseVisualSystem extends System<GalaxianComponentRegistry> {
  private previousPositions = new Map<number, { x: number; y: number }>();

  public update(world: World<GalaxianComponentRegistry>, deltaTime: number): void {
    if (deltaTime <= 0) return;

    const enemyEntities = world.query("GalaxianEnemy", "Transform", "VisualPose");
    for (const entity of enemyEntities) {
      const enemy = world.getComponent(entity, "GalaxianEnemy") as GalaxianEnemyComponent | undefined;
      const transform = world.getComponent(entity, "Transform");
      const pose = world.getMutableComponent(entity, "VisualPose") as VisualPoseComponent | undefined;
      if (!enemy || !transform || !pose) continue;

      const prev = this.previousPositions.get(entity) || { x: transform.x, y: transform.y };
      const dx = transform.x - prev.x;
      const dy = transform.y - prev.y;
      this.previousPositions.set(entity, { x: transform.x, y: transform.y });

      if (enemy.state === "windup") {
        // Windup deformation: squashes vertically (0.9x), expands horizontally (1.25x)
        pose.rotation = transform.rotation;
        pose.scaleX = 1.25;
        pose.scaleY = 0.9;
      } else if (enemy.state === "diving") {
        // Tangent rotation from delta movement + stretch along movement axis
        if (Math.hypot(dx, dy) > 0.1) {
          const targetAngle = Math.atan2(dy, dx) - Math.PI / 2;
          // Smooth angular interpolation
          let diff = targetAngle - pose.rotation;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          pose.rotation += diff * Math.min(1.0, deltaTime * 12);
        }
        pose.scaleX = 1.0;
        pose.scaleY = 1.18; // Stretch along dive motion
      } else if (enemy.state === "returning") {
        pose.rotation = transform.rotation;
        pose.scaleX = 1.0;
        pose.scaleY = 1.0;
      } else {
        // In slot
        pose.rotation = transform.rotation;
        pose.scaleX = 1.0;
        pose.scaleY = 1.0;
      }
    }
  }
}
