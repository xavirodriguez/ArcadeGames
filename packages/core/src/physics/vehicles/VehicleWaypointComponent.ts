import { Component } from "../../ecs/Component";

/**
 * Waypoint coordinate structure for vehicle path navigation.
 * @public
 */
export interface VehicleWaypointNode {
  x: number;
  y: number;
}

/**
 * Component holding waypoint navigation sequence for AI controlled vehicles.
 * @public
 */
export interface VehicleWaypointComponent extends Component {
  /** Component discriminator type. */
  type: "VehicleWaypoint";
  /** Array of waypoint node coordinates defining track or path. */
  waypoints: VehicleWaypointNode[];
  /** Current active waypoint target index. */
  currentWaypointIndex: number;
  /** Distance threshold radius in world units to consider waypoint reached. */
  targetRadius: number;
  /** Whether waypoint path loops back to start upon completion. Defaults to true. */
  loop?: boolean;
}

/**
 * Creates a new {@link VehicleWaypointComponent}.
 *
 * @param waypoints - Array of waypoint node coordinates.
 * @param targetRadius - Radius distance threshold (default 60).
 * @param loop - Whether track loops (default true).
 * @returns Initialized VehicleWaypointComponent instance.
 * @public
 */
export function createVehicleWaypoint(
  waypoints: VehicleWaypointNode[],
  targetRadius = 60,
  loop = true
): VehicleWaypointComponent {
  return {
    type: "VehicleWaypoint",
    waypoints: waypoints.map((w) => ({ x: w.x, y: w.y })),
    currentWaypointIndex: 0,
    targetRadius,
    loop
  };
}
