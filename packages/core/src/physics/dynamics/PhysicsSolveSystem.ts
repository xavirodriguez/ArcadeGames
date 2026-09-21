import { World } from "../../ecs/World";
import { System } from "../../ecs/System";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";
import { Collision } from "../collision/CollisionTypes";
import { Entity } from "../../ecs/Entity";
import { PhysicsUtils } from "../utils/PhysicsUtils";

/**
 * System that solves physical collision constraints and impulse responses.
 *
 * @remarks
 * Executed in `SystemPhase.Collision` after narrowphase collision detection to resolve penetration overlap
 * and apply physical impulse forces across rigid bodies in the simulation world.
 *
 * Consumes collision manifolds recorded in `CollisionEventsComponent` by `CollisionSystem2D`.
 * Supports positional separation, normal impulse (restitution), and tangential impulse (friction)
 * taking into account `RigidBodyComponent` mass, inertia, and material parameters.
 *
 * @public
 */
export class PhysicsSolveSystem<
  TRegistry extends CoreComponentRegistry = CoreComponentRegistry
> extends System<TRegistry> {
  private processedPairs = new Set<string>();

  /**
   * Solves active physical collision constraints across matching entities in the world.
   *
   * @param world - Simulation world containing active physics entities and collision manifolds.
   * @param _deltaTime - Elapsed frame time step in seconds.
   */
  public update(world: World<TRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    this.processedPairs.clear();
    const w = world as World<CoreComponentRegistry>;
    const entitiesWithEvents = w.query("CollisionEvents");
    const len = entitiesWithEvents.length;

    for (let i = 0; i < len; i++) {
      const entityA = entitiesWithEvents[i];
      const events = w.getComponent(entityA, "CollisionEvents");
      if (!events || events.collisions.length === 0) continue;

      const colCount = events.collisions.length;
      for (let j = 0; j < colCount; j++) {
        const col = events.collisions[j];
        const entityB = col.otherEntity;

        const pairKey = entityA < entityB ? `${entityA},${entityB}` : `${entityB},${entityA}`;
        if (this.processedPairs.has(pairKey)) continue;
        this.processedPairs.add(pairKey);

        this.solveCollision(w, entityA, entityB, col);
      }
    }
  }

  /**
   * Resolves physical response (positional separation and impulse forces) for a colliding entity pair.
   */
  private solveCollision(
    world: World<CoreComponentRegistry>,
    entityA: Entity,
    entityB: Entity,
    col: Collision
  ): void {
    const transA = world.getComponent(entityA, "Transform");
    const transB = world.getComponent(entityB, "Transform");
    if (!transA || !transB) return;

    const velA = world.getComponent(entityA, "Velocity");
    const velB = world.getComponent(entityB, "Velocity");

    const bodyA = world.getComponent(entityA, "RigidBody");
    const bodyB = world.getComponent(entityB, "RigidBody");

    const isStaticA = bodyA ? bodyA.isStatic || bodyA.invMass === 0 : !velA;
    const isStaticB = bodyB ? bodyB.isStatic || bodyB.invMass === 0 : !velB;

    if (isStaticA && isStaticB) return;

    const invMassA = isStaticA ? 0 : bodyA ? bodyA.invMass : 1.0;
    const invMassB = isStaticB ? 0 : bodyB ? bodyB.invMass : 1.0;
    const totalInvMass = invMassA + invMassB;
    if (totalInvMass <= 0) return;

    const invInertiaA = isStaticA ? 0 : bodyA ? bodyA.invInertia : 0;
    const invInertiaB = isStaticB ? 0 : bodyB ? bodyB.invInertia : 0;

    const restitutionA = bodyA ? bodyA.restitution : 0.0;
    const restitutionB = bodyB ? bodyB.restitution : 0.0;
    const restitution = Math.max(restitutionA, restitutionB);

    const frictionA = bodyA ? bodyA.friction : 0.2;
    const frictionB = bodyB ? bodyB.friction : 0.2;
    const friction = Math.sqrt(frictionA * frictionB);

    const normalX = col.normalX;
    const normalY = col.normalY;
    const depth = col.depth;

    // 1. Positional Separation (Penetration Resolution)
    if (depth > 0) {
      const slop = 0.01;
      const percent = 0.8;
      const penCorrection = (Math.max(depth - slop, 0) / totalInvMass) * percent;
      const corrX = penCorrection * normalX;
      const corrY = penCorrection * normalY;

      if (!isStaticA) {
        const tA = world.getMutableComponent(entityA, "Transform");
        if (tA) {
          tA.x -= corrX * invMassA;
          tA.y -= corrY * invMassA;
          tA.dirty = true;
        }
      }
      if (!isStaticB) {
        const tB = world.getMutableComponent(entityB, "Transform");
        if (tB) {
          tB.x += corrX * invMassB;
          tB.y += corrY * invMassB;
          tB.dirty = true;
        }
      }
    }

    // 2. Impulse Resolution
    let cx = (transA.worldX ?? transA.x) + (transB.worldX ?? transB.x) * 0.5;
    let cy = (transA.worldY ?? transA.y) + (transB.worldY ?? transB.y) * 0.5;
    const cpCount = col.contactPoints ? col.contactPoints.length : 0;
    if (cpCount > 0) {
      cx = 0;
      cy = 0;
      for (let k = 0; k < cpCount; k++) {
        cx += col.contactPoints[k].x;
        cy += col.contactPoints[k].y;
      }
      cx /= cpCount;
      cy /= cpCount;
    }

    const posAx = transA.worldX ?? transA.x;
    const posAy = transA.worldY ?? transA.y;
    const posBx = transB.worldX ?? transB.x;
    const posBy = transB.worldY ?? transB.y;

    const rxA = cpCount > 0 ? cx - posAx : 0;
    const ryA = cpCount > 0 ? cy - posAy : 0;
    const rxB = cpCount > 0 ? cx - posBx : 0;
    const ryB = cpCount > 0 ? cy - posBy : 0;

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

    const velAlongNormal = relVx * normalX + relVy * normalY;

    // Do not resolve if velocities are separating
    if (velAlongNormal > 0) return;

    const rAcrossN = rxA * normalY - ryA * normalX;
    const rBcrossN = rxB * normalY - ryB * normalX;
    const effectiveInvMass =
      invMassA + invMassB + rAcrossN * rAcrossN * invInertiaA + rBcrossN * rBcrossN * invInertiaB;

    if (effectiveInvMass <= 0) return;

    const j = -(1 + restitution) * velAlongNormal / effectiveInvMass;

    const impulseX = j * normalX;
    const impulseY = j * normalY;

    PhysicsUtils.applyBodyImpulse(world, entityA, velA, isStaticA, invMassA, invInertiaA, rxA, ryA, impulseX, impulseY, -1.0);
    PhysicsUtils.applyBodyImpulse(world, entityB, velB, isStaticB, invMassB, invInertiaB, rxB, ryB, impulseX, impulseY, 1.0);

    // 3. Tangential Friction Impulse
    if (friction > 0) {
      const tangentX = -normalY;
      const tangentY = normalX;

      const velAlongTangent = relVx * tangentX + relVy * tangentY;

      const rAcrossT = rxA * tangentY - ryA * tangentX;
      const rBcrossT = rxB * tangentY - ryB * tangentX;
      const effectiveTangentInvMass =
        invMassA + invMassB + rAcrossT * rAcrossT * invInertiaA + rBcrossT * rBcrossT * invInertiaB;

      if (effectiveTangentInvMass > 0) {
        let jt = -velAlongTangent / effectiveTangentInvMass;

        const maxFriction = Math.abs(j) * friction;
        jt = Math.max(-maxFriction, Math.min(maxFriction, jt));

        const frictionImpulseX = jt * tangentX;
        const frictionImpulseY = jt * tangentY;

        PhysicsUtils.applyBodyImpulse(world, entityA, velA, isStaticA, invMassA, invInertiaA, rxA, ryA, frictionImpulseX, frictionImpulseY, -1.0);
        PhysicsUtils.applyBodyImpulse(world, entityB, velB, isStaticB, invMassB, invInertiaB, rxB, ryB, frictionImpulseX, frictionImpulseY, 1.0);
      }
    }
  }
}
