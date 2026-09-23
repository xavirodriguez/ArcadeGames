import { World } from "../../ecs/World";
import { System } from "../../ecs/System";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";
import { PhysicsUtils } from "../utils/PhysicsUtils";

/**
 * System that solves physical joint and spring constraints across connected entities.
 *
 * @remarks
 * Executed during physics phase (`SystemPhase.Collision` or physics step) to calculate constraint errors,
 * apply spring forces, and enforce distance and revolute (pin) joint constraints.
 *
 * Fully deterministic calculations operating on standard floating-point operations.
 * Zero heap allocations during `update()` execution for optimal performance.
 *
 * @public
 */
export class JointSolverSystem<
  TRegistry extends CoreComponentRegistry = CoreComponentRegistry
> extends System<TRegistry> {
  private relVel = { x: 0, y: 0 };

  /**
   * Solves active joint constraints across all entities carrying a JointComponent.
   *
   * @param world - Simulation world containing entities and joint definitions.
   * @param deltaTime - Frame timestep delta in seconds.
   */
  public update(world: World<TRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true || deltaTime <= 0) return;

    const w = world as World<CoreComponentRegistry>;
    const jointEntities = w.query("Joint");
    const len = jointEntities.length;

    for (let i = 0; i < len; i++) {
      const jointEntity = jointEntities[i];
      const joint = w.getComponent(jointEntity, "Joint");
      if (!joint) continue;

      const entityA = joint.entityA;
      const entityB = joint.entityB;

      const transA = w.getComponent(entityA, "Transform");
      const transB = w.getComponent(entityB, "Transform");
      if (!transA && !transB) continue;

      const velA = w.getComponent(entityA, "Velocity");
      const velB = w.getComponent(entityB, "Velocity");

      const bodyA = w.getComponent(entityA, "RigidBody");
      const bodyB = w.getComponent(entityB, "RigidBody");

      const isStaticA = !transA || (bodyA ? bodyA.isStatic || bodyA.invMass === 0 : !velA);
      const isStaticB = !transB || (bodyB ? bodyB.isStatic || bodyB.invMass === 0 : !velB);

      if (isStaticA && isStaticB) continue;

      const invMassA = isStaticA ? 0 : bodyA ? bodyA.invMass : 1.0;
      const invMassB = isStaticB ? 0 : bodyB ? bodyB.invMass : 1.0;
      const totalInvMass = invMassA + invMassB;
      if (totalInvMass <= 0) continue;

      const invInertiaA = isStaticA ? 0 : bodyA ? bodyA.invInertia : 0;
      const invInertiaB = isStaticB ? 0 : bodyB ? bodyB.invInertia : 0;

      // Compute World Anchor Coordinates
      const rotA = transA ? (transA.worldRotation ?? transA.rotation) : 0;
      const cosA = Math.cos(rotA);
      const sinA = Math.sin(rotA);
      const anchorAx = joint.anchorA.x;
      const anchorAy = joint.anchorA.y;
      const posAx = transA ? (transA.worldX ?? transA.x) : 0;
      const posAy = transA ? (transA.worldY ?? transA.y) : 0;
      const worldAnchorAx = posAx + (anchorAx * cosA - anchorAy * sinA);
      const worldAnchorAy = posAy + (anchorAx * sinA + anchorAy * cosA);

      const rotB = transB ? (transB.worldRotation ?? transB.rotation) : 0;
      const cosB = Math.cos(rotB);
      const sinB = Math.sin(rotB);
      const anchorBx = joint.anchorB.x;
      const anchorBy = joint.anchorB.y;
      const posBx = transB ? (transB.worldX ?? transB.x) : 0;
      const posBy = transB ? (transB.worldY ?? transB.y) : 0;
      const worldAnchorBx = posBx + (anchorBx * cosB - anchorBy * sinB);
      const worldAnchorBy = posBy + (anchorBx * sinB + anchorBy * cosB);

      const dx = worldAnchorBx - worldAnchorAx;
      const dy = worldAnchorBy - worldAnchorAy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const rxA = worldAnchorAx - posAx;
      const ryA = worldAnchorAy - posAy;
      const rxB = worldAnchorBx - posBx;
      const ryB = worldAnchorBy - posBy;

      PhysicsUtils.computeRelativePointVelocity(velA, rxA, ryA, velB, rxB, ryB, this.relVel);
      const relVx = this.relVel.x;
      const relVy = this.relVel.y;

      if (joint.jointType === "spring") {
        const restLength = joint.restLength;
        const stiffness = joint.stiffness;
        const damping = joint.damping;

        let nx = 1;
        let ny = 0;
        if (dist > 0.0001) {
          nx = dx / dist;
          ny = dy / dist;
        }

        const deltaL = dist - restLength;
        const fSpring = stiffness * deltaL;
        const fDamping = damping * (relVx * nx + relVy * ny);
        const totalForce = fSpring + fDamping;

        const Fx = totalForce * nx;
        const Fy = totalForce * ny;

        PhysicsUtils.applyBodyPairImpulse(w, entityA, velA, isStaticA, invMassA, invInertiaA, rxA, ryA, entityB, velB, isStaticB, invMassB, invInertiaB, rxB, ryB, Fx, Fy, deltaTime, -deltaTime);
      } else if (joint.jointType === "distance") {
        const restLength = joint.restLength;
        const maxDistance = joint.maxDistance;
        const minLength = joint.minLength;
        const stiffness = joint.stiffness ?? 0;
        const damping = joint.damping ?? 0;

        let err = 0;
        if (maxDistance !== undefined && dist > maxDistance) {
          err = dist - maxDistance;
        } else if (minLength !== undefined && dist < minLength) {
          err = dist - minLength;
        } else if (maxDistance === undefined && minLength === undefined) {
          err = dist - restLength;
        }

        if (Math.abs(err) > 0.0001 && dist > 0.0001) {
          const nx = dx / dist;
          const ny = dy / dist;

          if (stiffness > 0) {
            const fSpring = stiffness * err;
            const fDamping = damping * (relVx * nx + relVy * ny);
            const totalForce = fSpring + fDamping;

            const Fx = totalForce * nx;
            const Fy = totalForce * ny;

            PhysicsUtils.applyBodyPairImpulse(w, entityA, velA, isStaticA, invMassA, invInertiaA, rxA, ryA, entityB, velB, isStaticB, invMassB, invInertiaB, rxB, ryB, Fx, Fy, deltaTime, -deltaTime);
          } else {
            // Rigid distance constraint
            const percent = 0.8;
            const corrX = err * nx * percent;
            const corrY = err * ny * percent;

            PhysicsUtils.applyPositionCorrection(w, entityA, isStaticA, transA, corrX, corrY, invMassA / totalInvMass);
            PhysicsUtils.applyPositionCorrection(w, entityB, isStaticB, transB, -corrX, -corrY, invMassB / totalInvMass);

            const velAlongNormal = relVx * nx + relVy * ny;
            const rAcrossN = rxA * ny - ryA * nx;
            const rBcrossN = rxB * ny - ryB * nx;
            const effectiveInvMass =
              invMassA + invMassB + rAcrossN * rAcrossN * invInertiaA + rBcrossN * rBcrossN * invInertiaB;

            if (effectiveInvMass > 0) {
              const impulse = -velAlongNormal / effectiveInvMass;
              const impulseX = impulse * nx;
              const impulseY = impulse * ny;

              PhysicsUtils.applyBodyPairImpulse(w, entityA, velA, isStaticA, invMassA, invInertiaA, rxA, ryA, entityB, velB, isStaticB, invMassB, invInertiaB, rxB, ryB, impulseX, impulseY);
            }
          }
        }
      } else if (joint.jointType === "revolute") {
        if (dist > 0.0001) {
          PhysicsUtils.applyPositionCorrection(w, entityA, isStaticA, transA, dx, dy, invMassA / totalInvMass);
          PhysicsUtils.applyPositionCorrection(w, entityB, isStaticB, transB, -dx, -dy, invMassB / totalInvMass);
        }

        const effectiveInvMass = invMassA + invMassB;
        if (effectiveInvMass > 0) {
          const impulseX = -relVx / effectiveInvMass;
          const impulseY = -relVy / effectiveInvMass;

          PhysicsUtils.applyBodyPairImpulse(w, entityA, velA, isStaticA, invMassA, invInertiaA, rxA, ryA, entityB, velB, isStaticB, invMassB, invInertiaB, rxB, ryB, impulseX, impulseY);
        }

        if (joint.enableMotor && joint.motorSpeed !== undefined) {
          const targetMotorSpeed = joint.motorSpeed;
          const wA = velA ? velA.angularVelocity : 0;
          const wB = velB ? velB.angularVelocity : 0;
          const relW = wB - wA;
          const errW = relW - targetMotorSpeed;
          const invInertiaSum = invInertiaA + invInertiaB;

          if (invInertiaSum > 0) {
            let torqueImpulse = -errW / invInertiaSum;
            if (joint.maxMotorTorque !== undefined) {
              const maxTorque = joint.maxMotorTorque * deltaTime;
              torqueImpulse = Math.max(-maxTorque, Math.min(maxTorque, torqueImpulse));
            }

            if (velA && !isStaticA) {
              const vA = w.getMutableComponent(entityA, "Velocity");
              if (vA) {
                vA.angularVelocity -= torqueImpulse * invInertiaA;
              }
            }

            if (velB && !isStaticB) {
              const vB = w.getMutableComponent(entityB, "Velocity");
              if (vB) {
                vB.angularVelocity += torqueImpulse * invInertiaB;
              }
            }
          }
        }
      }
    }
  }
}
