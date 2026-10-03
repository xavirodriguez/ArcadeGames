import { System, World, ShapeType, CircleShape } from "@tiny-aster/core";
import type { RacingComponentRegistry, RacingEventRegistry } from "../types/RacingRegistry";

function resolveCircleAgainstAabb(x: number, y: number, radius: number, wallX: number, wallY: number, width: number, height: number) {
  const minX = wallX - width / 2, maxX = wallX + width / 2;
  const minY = wallY - height / 2, maxY = wallY + height / 2;
  const closestX = Math.max(minX, Math.min(x, maxX));
  const closestY = Math.max(minY, Math.min(y, maxY));
  const dx = x - closestX, dy = y - closestY;
  const distanceSq = dx * dx + dy * dy;
  if (distanceSq >= radius * radius) return { x, y, hit: false, normalX: 0, normalY: 0 };

  if (distanceSq > 0) {
    const distance = Math.sqrt(distanceSq);
    return {
      x: x + (dx / distance) * (radius - distance),
      y: y + (dy / distance) * (radius - distance),
      hit: true, normalX: dx / distance, normalY: dy / distance
    };
  }

  const left = Math.abs(x - minX), right = Math.abs(maxX - x);
  const top = Math.abs(y - minY), bottom = Math.abs(maxY - y);
  const min = Math.min(left, right, top, bottom);
  if (min === left) return { x: minX - radius, y, hit: true, normalX: -1, normalY: 0 };
  if (min === right) return { x: maxX + radius, y, hit: true, normalX: 1, normalY: 0 };
  if (min === top) return { x, y: minY - radius, hit: true, normalX: 0, normalY: -1 };
  return { x, y: maxY + radius, hit: true, normalX: 0, normalY: 1 };
}

export class RacingWallSystem extends System<RacingComponentRegistry, RacingEventRegistry> {
  public update(world: World<RacingComponentRegistry, RacingEventRegistry>): void {
    const cars = world.query("Car", "Transform", "Velocity", "Collider");
    const walls = world.query("RacingWall", "Transform");

    for (let i = 0; i < cars.length; i += 1) {
      const car = cars[i];
      const transform = world.getMutableComponent(car, "Transform");
      const velocity = world.getMutableComponent(car, "Velocity");
      const collider = world.getComponent(car, "Collider");
      if (!transform || !velocity || !collider) continue;
      const radius = collider.shape.type === ShapeType.Circle ? (collider.shape as CircleShape).radius : 16;

      for (let j = 0; j < walls.length; j += 1) {
        const wall = walls[j];
        const wallTransform = world.getComponent(wall, "Transform");
        const wallData = world.getComponent(wall, "RacingWall");
        if (!wallTransform || !wallData) continue;

        const resolved = resolveCircleAgainstAabb(transform.x, transform.y, radius, wallTransform.x, wallTransform.y, wallData.width, wallData.height);
        if (!resolved.hit) continue;

        transform.x = resolved.x;
        transform.y = resolved.y;
        transform.dirty = true;
        const normalSpeed = velocity.vx * resolved.normalX + velocity.vy * resolved.normalY;
        if (normalSpeed < 0) {
          velocity.vx -= normalSpeed * resolved.normalX * 1.35;
          velocity.vy -= normalSpeed * resolved.normalY * 1.35;
        }
        velocity.vx *= 0.82;
        velocity.vy *= 0.82;
      }
    }
  }

  public onRegister(_world: World<RacingComponentRegistry, RacingEventRegistry>): void {}
  public dispose(): void {}
}
