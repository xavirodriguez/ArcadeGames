import { System, World, VehicleWaypointComponent, VehicleSteeringComponent } from "@tiny-aster/core";
import type { RacingComponentRegistry, RacingEventRegistry } from "../types/RacingRegistry";

export class VehicleAISystem extends System<RacingComponentRegistry, RacingEventRegistry> {
  public update(world: World<RacingComponentRegistry, RacingEventRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const h2h = world.getSingleton("HeadToHeadState");
    if (h2h && h2h.phase !== "racing") return;

    const aiCars = world.query("Car", "VehicleWaypoint", "VehicleSteering", "Transform");
    const humanCars = world.query("LocalPlayer", "Transform");
    const humanTransform = humanCars.length > 0 ? world.getComponent(humanCars[0], "Transform") : undefined;

    const len = aiCars.length;
    for (let i = 0; i < len; i++) {
      const entity = aiCars[i];
      if (world.hasComponent(entity, "LocalPlayer")) continue;

      const waypointsComp = world.getComponent(entity, "VehicleWaypoint") as VehicleWaypointComponent | undefined;
      const vehicle = world.getMutableComponent(entity, "VehicleSteering") as VehicleSteeringComponent | undefined;
      const transform = world.getComponent(entity, "Transform");

      if (!waypointsComp || !vehicle || !transform || waypointsComp.waypoints.length === 0) continue;

      const idx = waypointsComp.currentWaypointIndex;
      const target = waypointsComp.waypoints[idx];
      if (!target) continue;

      const dx = target.x - transform.x;
      const dy = target.y - transform.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= waypointsComp.targetRadius) {
        const nextIdx = (idx + 1) % waypointsComp.waypoints.length;
        world.mutateComponent(entity, "VehicleWaypoint", (m) => {
          (m as unknown as VehicleWaypointComponent).currentWaypointIndex = nextIdx;
        });
      }

      const desiredAngle = Math.atan2(dy, dx);
      let diffAngle = desiredAngle - (transform.rotation ?? 0);

      while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;
      while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;

      vehicle.steering = Math.max(-1, Math.min(1, diffAngle * 1.8));

      let throttle = Math.cos(diffAngle) > 0 ? Math.max(0.4, Math.cos(diffAngle)) : -0.2;

      // Rubber-banding adjustments relative to human player
      if (humanTransform) {
        const distToHuman = Math.hypot(humanTransform.x - transform.x, humanTransform.y - transform.y);
        const isBehindHuman = transform.x < humanTransform.x;

        if (isBehindHuman && distToHuman > 200) {
          throttle = Math.min(1.0, throttle * 1.25);
        } else if (!isBehindHuman && distToHuman > 300) {
          throttle *= 0.85;
        }
      }

      vehicle.throttle = throttle;
    }
  }

  public onRegister(_world: World<RacingComponentRegistry, RacingEventRegistry>): void {}
  public dispose(): void {}
}
