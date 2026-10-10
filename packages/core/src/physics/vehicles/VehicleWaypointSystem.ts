import { System } from "../../ecs/System";
import { World } from "../../ecs/World";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";
import { VehicleSteeringComponent } from "./VehicleSteeringComponent";
import { VehicleWaypointComponent } from "./VehicleWaypointComponent";

/**
 * Normalizes an angle in radians to the range [-PI, PI].
 * @public
 */
export function normalizeAngle(angle: number): number {
  let diff = angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

export interface SteerWaypointResult {
  steering: number;
  throttle: number;
  nextIndex: number;
  reachedTarget: boolean;
}

/**
 * Computes normalized steering and base throttle inputs for a vehicle traveling toward its active waypoint.
 *
 * @param transform - Current spatial position and rotation of the vehicle.
 * @param waypointsComp - Active vehicle waypoint component containing target coordinates and radius.
 * @param minPositiveThrottle - Floor for throttle when aligned with target (defaults to 0.3).
 * @returns Result object containing calculated inputs and next waypoint index, or null if no waypoints exist.
 * @public
 */
export function steerTowardWaypoint(
  transform: { x: number; y: number; rotation?: number },
  waypointsComp: VehicleWaypointComponent,
  minPositiveThrottle = 0.3
): SteerWaypointResult | null {
  if (waypointsComp.waypoints.length === 0) return null;

  const idx = waypointsComp.currentWaypointIndex;
  const target = waypointsComp.waypoints[idx];
  if (!target) return null;

  const dx = target.x - transform.x;
  const dy = target.y - transform.y;
  const dist = Math.hypot(dx, dy);

  let reachedTarget = false;
  let nextIndex = idx;

  if (dist <= waypointsComp.targetRadius) {
    reachedTarget = true;
    const candidateIdx = idx + 1;
    if (candidateIdx < waypointsComp.waypoints.length) {
      nextIndex = candidateIdx;
    } else if (waypointsComp.loop !== false) {
      nextIndex = 0;
    }
  }

  const desiredAngle = Math.atan2(dy, dx);
  const diffAngle = normalizeAngle(desiredAngle - (transform.rotation ?? 0));

  const steering = Math.max(-1, Math.min(1, diffAngle * 1.8));
  const alignment = Math.cos(diffAngle);
  const throttle = alignment > 0 ? Math.max(minPositiveThrottle, alignment) : -0.2;

  return { steering, throttle, nextIndex, reachedTarget };
}

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
      const entity = entities[i];
      const waypointsComp = world.getComponent(entity, "VehicleWaypoint") as VehicleWaypointComponent | undefined;
      const vehicle = world.getMutableComponent(entity, "VehicleSteering") as VehicleSteeringComponent | undefined;
      const transform = world.getComponent(entity, "Transform");

      if (!waypointsComp || !vehicle || !transform) continue;

      const steerRes = steerTowardWaypoint(transform, waypointsComp, 0.3);
      if (!steerRes) continue;

      if (steerRes.reachedTarget && steerRes.nextIndex !== waypointsComp.currentWaypointIndex) {
        world.mutateComponent(entity, "VehicleWaypoint", (m: VehicleWaypointComponent) => {
          m.currentWaypointIndex = steerRes.nextIndex;
        });
      }

      vehicle.steering = steerRes.steering;
      vehicle.throttle = steerRes.throttle;
    }
  }
}
