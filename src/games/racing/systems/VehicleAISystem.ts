import { System, World, VehicleWaypointComponent, VehicleSteeringComponent, steerTowardWaypoint, applyWaypointSteering } from "@tiny-aster/core";
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
            // TODO(refactor): código duplicado detectado (bloque) con physics/vehicles/VehicleWaypointSystem.ts:105-112. Considerar extraer a función compartida. Ref: 469377f3
if (world.hasComponent(entity, "LocalPlayer")) continue;

      const waypointsComp = world.getComponent(entity, "VehicleWaypoint") as VehicleWaypointComponent | undefined;
      const vehicle = world.getMutableComponent(entity, "VehicleSteering") as VehicleSteeringComponent | undefined;
      const transform = world.getComponent(entity, "Transform");

      if (!waypointsComp || !vehicle || !transform) continue;

      const steerRes = steerTowardWaypoint(transform, waypointsComp, 0.4);
      if (!steerRes) continue;

      applyWaypointSteering(world, entity, waypointsComp, vehicle, steerRes);
      let throttle = steerRes.throttle;

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
