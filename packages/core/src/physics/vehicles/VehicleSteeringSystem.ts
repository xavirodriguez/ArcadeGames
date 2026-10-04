import { System } from "../../ecs/System";
import { World } from "../../ecs/World";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";
import { VehicleSteeringComponent } from "./VehicleSteeringComponent";
import { Entity } from "../../ecs/Entity";

/**
 * System processing vehicle traction, steering rotation, throttle acceleration, and lateral drift damping.
 *
 * @remarks
 * Decomposes linear velocity into longitudinal (forward/backward) and lateral (sideways) components,
 * damping lateral velocity according to `traction` and `driftFactor` to simulate realistic driving physics.
 *
 * @public
 */
export class VehicleSteeringSystem extends System<CoreComponentRegistry> {
  private candidateEntities: Entity[] | null = null;

  /**
   * Sets candidate entity list for vehicle steering processing.
   *
   * @param entities - Entity ID list or `null` to process all matching world entities.
   */
  public setCandidates(entities: Entity[] | null): void {
    this.candidateEntities = entities;
  }

  /**
   * Updates vehicle steering rotation, throttle acceleration, speed clamping, and lateral traction.
   *
   * @param world - Simulation world instance.
   * @param deltaTime - Frame duration in seconds.
   *
   * @sideEffect Mutates `Transform` and `Velocity` components on active vehicle entities.
   */
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true || deltaTime <= 0) return;

    const resourceCandidates = world.getResource<Entity[]>("SpatialCullingCandidates");
    const candidates = this.candidateEntities ?? resourceCandidates ?? null;
    const entities = candidates ?? world.query("VehicleSteering", "Transform", "Velocity");

    const len = entities.length;
    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const vehicle = world.getComponent(entity, "VehicleSteering") as VehicleSteeringComponent | undefined;
      if (!vehicle) continue;

      const trans = world.getMutableComponent(entity, "Transform");
      const vel = world.getMutableComponent(entity, "Velocity");
      if (!trans || !vel) continue;

      // 1. Steering rotation
      if (vehicle.steering !== 0 && vehicle.steeringRate > 0) {
        const rotChange = vehicle.steering * vehicle.steeringRate * deltaTime;
        trans.rotation = (trans.rotation ?? 0) + rotChange;
        trans.dirty = true;
      }

      const rot = trans.worldRotation ?? trans.rotation ?? 0;
      const forwardX = Math.cos(rot);
      const forwardY = Math.sin(rot);
      const rightX = -forwardY;
      const rightY = forwardX;

      // 2. Throttle acceleration
      if (vehicle.throttle !== 0 && vehicle.acceleration > 0) {
        const accel = vehicle.throttle * vehicle.acceleration * deltaTime;
        vel.vx += forwardX * accel;
        vel.vy += forwardY * accel;
      }

      // 3. Decompose velocity into longitudinal and lateral components
      const currentVx = vel.vx;
      const currentVy = vel.vy;

      const vLong = currentVx * forwardX + currentVy * forwardY;
      const vLat = currentVx * rightX + currentVy * rightY;

      // 4. Damp lateral velocity based on traction and drift factor
      // High traction and low driftFactor reduce lateral sliding rapidly
      const gripDamping = Math.exp(-vehicle.traction * (1.0 - vehicle.driftFactor) * 10.0 * deltaTime);
      const vLatNew = vLat * gripDamping;

      // 5. Reconstruct total velocity
      let newVx = vLong * forwardX + vLatNew * rightX;
      let newVy = vLong * forwardY + vLatNew * rightY;

      // 6. Max speed cap
      const speedSq = newVx * newVx + newVy * newVy;
      if (vehicle.maxSpeed > 0 && speedSq > vehicle.maxSpeed * vehicle.maxSpeed) {
        const speed = Math.sqrt(speedSq);
        const scale = vehicle.maxSpeed / speed;
        newVx *= scale;
        newVy *= scale;
      }

      vel.vx = newVx;
      vel.vy = newVy;
    }
  }
}
