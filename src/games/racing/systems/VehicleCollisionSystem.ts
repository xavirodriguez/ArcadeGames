import { System, World, ShapeType, CircleShape } from "@tiny-aster/core";
import type { RacingComponentRegistry, RacingEventRegistry } from "../types/RacingRegistry";

export class VehicleCollisionSystem extends System<RacingComponentRegistry, RacingEventRegistry> {
  public update(world: World<RacingComponentRegistry, RacingEventRegistry>): void {
    const cars = world.query("Car", "Transform", "Velocity", "Collider");
    const len = cars.length;

    for (let i = 0; i < len; i++) {
      const carA = cars[i];
      const transA = world.getMutableComponent(carA, "Transform");
      const velA = world.getMutableComponent(carA, "Velocity");
      const colA = world.getComponent(carA, "Collider");
      if (!transA || !velA || !colA) continue;

      const radiusA = colA.shape.type === ShapeType.Circle ? (colA.shape as CircleShape).radius : 16;

      for (let j = i + 1; j < len; j++) {
        const carB = cars[j];
        const transB = world.getMutableComponent(carB, "Transform");
        const velB = world.getMutableComponent(carB, "Velocity");
        const colB = world.getComponent(carB, "Collider");
        if (!transB || !velB || !colB) continue;

        const radiusB = colB.shape.type === ShapeType.Circle ? (colB.shape as CircleShape).radius : 16;

        const dx = transB.x - transA.x;
        const dy = transB.y - transA.y;
        const distSq = dx * dx + dy * dy;
        const minDist = radiusA + radiusB;

        if (distSq > 0 && distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;

          // Position separation
          transA.x -= nx * overlap * 0.5;
          transA.y -= ny * overlap * 0.5;
          transB.x += nx * overlap * 0.5;
          transB.y += ny * overlap * 0.5;
          transA.dirty = true;
          transB.dirty = true;

          // Elastic collision impulse
          const kx = velA.vx - velB.vx;
          const ky = velA.vy - velB.vy;
          const p = 2 * (nx * kx + ny * ky) / 2; // Equal mass assumption

          if (p > 0) {
            velA.vx -= p * nx * 0.85;
            velA.vy -= p * ny * 0.85;
            velB.vx += p * nx * 0.85;
            velB.vy += p * ny * 0.85;
          }
        }
      }
    }
  }

  public onRegister(_world: World<RacingComponentRegistry, RacingEventRegistry>): void {}
  public dispose(): void {}
}
