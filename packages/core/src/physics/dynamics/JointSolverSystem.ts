import { World } from "../../ecs/World";
import { System } from "../../ecs/System";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";
import { Entity } from "../../ecs/Entity";

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
            // TODO(refactor): código duplicado detectado (bloque) con physics/dynamics/PhysicsSolveSystem.ts:151-167. Considerar extraer a función compartida. Ref: cb8b6a3e
const ryB = worldAnchorBy - posBy;

      const vxA = velA ? velA.vx : 0;
      const vyA = velA ? velA.vy : 0;
      const wA = velA ? velA.angularVelocity : 0;

      const vxB = velB ? velB.vx : 0;
      const vyB = velB ? velB.vy : 0;
      const wB = velB ? velB.angularVelocity : 0;

      const vpAx = vxA - wA * ryA;
      const vpAy = vyA + wA * rxA;
      const vpBx = vxB - wB * ryB;
      const vpBy = vyB + wB * rxB;

      const relVx = vpBx - vpAx;
      const relVy = vpBy - vpAy;

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
                // TODO(refactor): código duplicado detectado (bloque) con physics/dynamics/JointSolverSystem.ts:173-201. Considerar extraer a función compartida. Ref: 0d4e8583
const fSpring = stiffness * deltaL;
        const fDamping = damping * (relVx * nx + relVy * ny);
        const totalForce = fSpring + fDamping;

        const Fx = totalForce * nx;
        const Fy = totalForce * ny;

        if (velA && !isStaticA) {
          const vA = w.getMutableComponent(entityA, "Velocity");
          if (vA) {
            vA.vx += Fx * invMassA * deltaTime;
            vA.vy += Fy * invMassA * deltaTime;
            if (invInertiaA > 0) {
              vA.angularVelocity += (rxA * Fy - ryA * Fx) * invInertiaA * deltaTime;
            }
          }
        }

        if (velB && !isStaticB) {
          const vB = w.getMutableComponent(entityB, "Velocity");
          if (vB) {
            vB.vx -= Fx * invMassB * deltaTime;
            vB.vy -= Fy * invMassB * deltaTime;
            if (invInertiaB > 0) {
              vB.angularVelocity -= (rxB * Fy - ryB * Fx) * invInertiaB * deltaTime;
            }
          }
        }
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

            if (velA && !isStaticA) {
              const vA = w.getMutableComponent(entityA, "Velocity");
              if (vA) {
                vA.vx += Fx * invMassA * deltaTime;
                vA.vy += Fy * invMassA * deltaTime;
                if (invInertiaA > 0) {
                  vA.angularVelocity += (rxA * Fy - ryA * Fx) * invInertiaA * deltaTime;
                }
              }
            }

            if (velB && !isStaticB) {
              const vB = w.getMutableComponent(entityB, "Velocity");
              if (vB) {
                vB.vx -= Fx * invMassB * deltaTime;
                vB.vy -= Fy * invMassB * deltaTime;
                if (invInertiaB > 0) {
                  vB.angularVelocity -= (rxB * Fy - ryB * Fx) * invInertiaB * deltaTime;
                }
              }
            }
          } else {
            // Rigid distance constraint
            const percent = 0.8;
            const corrX = err * nx * percent;
                        // TODO(refactor): código duplicado detectado (bloque) con physics/dynamics/JointSolverSystem.ts:263-281. Considerar extraer a función compartida. Ref: 3193328a
const corrY = err * ny * percent;

            if (!isStaticA && transA) {
              const tA = w.getMutableComponent(entityA, "Transform");
              if (tA) {
                tA.x += corrX * (invMassA / totalInvMass);
                tA.y += corrY * (invMassA / totalInvMass);
                tA.dirty = true;
              }
            }

            if (!isStaticB && transB) {
              const tB = w.getMutableComponent(entityB, "Transform");
              if (tB) {
                tB.x -= corrX * (invMassB / totalInvMass);
                tB.y -= corrY * (invMassB / totalInvMass);
                tB.dirty = true;
              }
            }

            const velAlongNormal = relVx * nx + relVy * ny;
            const rAcrossN = rxA * ny - ryA * nx;
            const rBcrossN = rxB * ny - ryB * nx;
            const effectiveInvMass =
              invMassA + invMassB + rAcrossN * rAcrossN * invInertiaA + rBcrossN * rBcrossN * invInertiaB;

            if (effectiveInvMass > 0) {
              const impulse = -velAlongNormal / effectiveInvMass;
              const impulseX = impulse * nx;
                            // TODO(refactor): código duplicado detectado (bloque) con physics/dynamics/JointSolverSystem.ts:287-310. Considerar extraer a función compartida. Ref: f667d271
const impulseY = impulse * ny;

              if (velA && !isStaticA) {
                const vA = w.getMutableComponent(entityA, "Velocity");
                if (vA) {
                  vA.vx -= impulseX * invMassA;
                  vA.vy -= impulseY * invMassA;
                  if (invInertiaA > 0) {
                    vA.angularVelocity -= (rxA * impulseY - ryA * impulseX) * invInertiaA;
                  }
                }
              }

              if (velB && !isStaticB) {
                                // TODO(refactor): código duplicado detectado (bloque) con physics/dynamics/PhysicsSolveSystem.ts:198-206. Considerar extraer a función compartida. Ref: d81d7c34
const vB = w.getMutableComponent(entityB, "Velocity");
                if (vB) {
                  vB.vx += impulseX * invMassB;
                  vB.vy += impulseY * invMassB;
                  if (invInertiaB > 0) {
                    vB.angularVelocity += (rxB * impulseY - ryB * impulseX) * invInertiaB;
                  }
                }
              }
            }
          }
        }
      } else if (joint.jointType === "revolute") {
        if (dist > 0.0001) {
          const corrX = dx;
          const corrY = dy;

          if (!isStaticA && transA) {
            const tA = w.getMutableComponent(entityA, "Transform");
            if (tA) {
              tA.x += corrX * (invMassA / totalInvMass);
              tA.y += corrY * (invMassA / totalInvMass);
              tA.dirty = true;
            }
          }

          if (!isStaticB && transB) {
            const tB = w.getMutableComponent(entityB, "Transform");
            if (tB) {
              tB.x -= corrX * (invMassB / totalInvMass);
              tB.y -= corrY * (invMassB / totalInvMass);
              tB.dirty = true;
            }
          }
        }

        const effectiveInvMass = invMassA + invMassB;
        if (effectiveInvMass > 0) {
          const impulseX = -relVx / effectiveInvMass;
          const impulseY = -relVy / effectiveInvMass;

          if (velA && !isStaticA) {
            const vA = w.getMutableComponent(entityA, "Velocity");
            if (vA) {
              vA.vx -= impulseX * invMassA;
              vA.vy -= impulseY * invMassA;
              if (invInertiaA > 0) {
                vA.angularVelocity -= (rxA * impulseY - ryA * impulseX) * invInertiaA;
              }
            }
          }

          if (velB && !isStaticB) {
            const vB = w.getMutableComponent(entityB, "Velocity");
            if (vB) {
              vB.vx += impulseX * invMassB;
              vB.vy += impulseY * invMassB;
              if (invInertiaB > 0) {
                vB.angularVelocity += (rxB * impulseY - ryB * impulseX) * invInertiaB;
              }
            }
          }
        }

        if (joint.enableMotor && joint.motorSpeed !== undefined) {
          const targetMotorSpeed = joint.motorSpeed;
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
