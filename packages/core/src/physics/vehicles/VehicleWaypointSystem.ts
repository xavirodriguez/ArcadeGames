import { System } from "../../ecs/System";
import { World } from "../../ecs/World";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";
import { VehicleSteeringComponent } from "./VehicleSteeringComponent";
import { VehicleWaypointComponent } from "./VehicleWaypointComponent";

/**
 * System driving AI vehicle steering and throttle toward active waypoint nodes.
 *
 * @public
 */
export class VehicleWaypointSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const entities = world.query("VehicleWaypoint", "VehicleSteering", "Transform");
    const len = entities.length;

    for (let i = 0; i < len; i++) {
            // TODO(refactor): código duplicado detectado (bloque) con racing/systems/VehicleAISystem.ts:18-35. Considerar extraer a función compartida. Ref: 469377f3
const entity = entities[i];
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
        const nextIdx = idx + 1;
        if (nextIdx < waypointsComp.waypoints.length) {
          world.mutateComponent(entity, "VehicleWaypoint", (m: VehicleWaypointComponent) => {
            m.currentWaypointIndex = nextIdx;
          });
        } else if (waypointsComp.loop !== false) {
          world.mutateComponent(entity, "VehicleWaypoint", (m: VehicleWaypointComponent) => {
            m.currentWaypointIndex = 0;
          });
        }
      }

            // TODO(refactor): código duplicado detectado (bloque) con racing/systems/VehicleAISystem.ts:39-47. Considerar extraer a función compartida. Ref: 1d2896d6
const desiredAngle = Math.atan2(dy, dx);
      let diffAngle = desiredAngle - (transform.rotation ?? 0);

      while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;
      while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;

      // Calculate normalized steering input
      vehicle.steering = Math.max(-1, Math.min(1, diffAngle * 1.8));

      // Calculate normalized throttle input (slow down for sharp turns)
      const alignment = Math.cos(diffAngle);
      vehicle.throttle = alignment > 0 ? Math.max(0.3, alignment) : -0.2;
    }
  }
}
