import { World } from "../src/ecs/World";
import { CollisionSystem2D } from "../src/physics/collision/CollisionSystems";
import { PhysicsSolveSystem } from "../src/physics/dynamics/PhysicsSolveSystem";
import { JointSolverSystem } from "../src/physics/dynamics/JointSolverSystem";
import { createRigidBody } from "../src/physics/dynamics/RigidBodyComponent";
import {
  createDistanceJoint,
  createSpringJoint,
  createRevoluteJoint
} from "../src/physics/dynamics/JointComponent";
import { CoreComponentRegistry } from "../src/ecs/CoreComponents";

describe("Physics Solver Characterization Baseline Tests", () => {
  let world: World<CoreComponentRegistry>;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
  });

  it("should reproduce exact floating-point snapshots over 20 steps for Spring, Distance, Revolute joints and Collisions", () => {
    const collisionSystem = new CollisionSystem2D();
    const solveSystem = new PhysicsSolveSystem();
    const jointSystem = new JointSolverSystem();

    // 1. Spring Joint Entities
    const springA = world.createEntity();
    world.addComponent(springA, {
      type: "Transform",
      x: 10,
      y: 20,
      rotation: 0.1,
      scaleX: 1,
      scaleY: 1,
      worldX: 10,
      worldY: 20,
      worldRotation: 0.1,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(springA, { type: "Velocity", vx: 5, vy: -2, angularVelocity: 0.5 });
    world.addComponent(springA, createRigidBody({ mass: 2, inertia: 10 }));

    const springB = world.createEntity();
    world.addComponent(springB, {
      type: "Transform",
      x: 60,
      y: 80,
      rotation: -0.2,
      scaleX: 1,
      scaleY: 1,
      worldX: 60,
      worldY: 80,
      worldRotation: -0.2,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(springB, { type: "Velocity", vx: -3, vy: 4, angularVelocity: -0.1 });
    world.addComponent(springB, createRigidBody({ mass: 3, inertia: 15 }));

    const springJointEntity = world.createEntity();
    world.addComponent(
      springJointEntity,
      createSpringJoint(springA, springB, { x: 2, y: -1 }, { x: -3, y: 2 }, 30, 120, 8)
    );

    // 2. Distance Joint Entities (Rigid impulse mode)
    const distA = world.createEntity();
    world.addComponent(distA, {
      type: "Transform",
      x: 100,
      y: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 100,
      worldY: 100,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(distA, { type: "Velocity", vx: 10, vy: 0, angularVelocity: 0.2 });
    world.addComponent(distA, createRigidBody({ mass: 1, inertia: 5 }));

    const distB = world.createEntity();
    world.addComponent(distB, {
      type: "Transform",
      x: 200,
      y: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 200,
      worldY: 100,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(distB, { type: "Velocity", vx: -20, vy: 5, angularVelocity: -0.3 });
    world.addComponent(distB, createRigidBody({ mass: 2, inertia: 8 }));

    const distJointEntity = world.createEntity();
    world.addComponent(
      distJointEntity,
      createDistanceJoint(distA, distB, { x: 5, y: 0 }, { x: -5, y: 0 }, 50)
    );

    // 3. Revolute Joint Entities
    const revA = world.createEntity();
    world.addComponent(revA, {
      type: "Transform",
      x: 300,
      y: 300,
      rotation: 0.5,
      scaleX: 1,
      scaleY: 1,
      worldX: 300,
      worldY: 300,
      worldRotation: 0.5,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(revA, { type: "Velocity", vx: 2, vy: 2, angularVelocity: 1.0 });
    world.addComponent(revA, createRigidBody({ mass: 4, inertia: 20 }));

    const revB = world.createEntity();
    world.addComponent(revB, {
      type: "Transform",
      x: 310,
      y: 305,
      rotation: 0.1,
      scaleX: 1,
      scaleY: 1,
      worldX: 310,
      worldY: 305,
      worldRotation: 0.1,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(revB, { type: "Velocity", vx: -1, vy: -1, angularVelocity: -0.5 });
    world.addComponent(revB, createRigidBody({ mass: 2, inertia: 10 }));

    const revJointEntity = world.createEntity();
    world.addComponent(
      revJointEntity,
      createRevoluteJoint(revA, revB, { x: 0, y: 0 }, { x: 0, y: 0 })
    );

    // 4. Collision Entities with Friction & Restitution
    const colA = world.createEntity();
    world.addComponent(colA, {
      type: "Transform",
      x: 400,
      y: 400,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 400,
      worldY: 400,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(colA, { type: "Velocity", vx: 50, vy: 10, angularVelocity: 0.1 });
    world.addComponent(colA, {
      type: "Collider2D",
      shape: { type: "circle", radius: 15 },
      layer: 1,
      mask: 1,
      offsetX: 0,
      offsetY: 0,
      isTrigger: false,
      enabled: true
    });
    world.addComponent(colA, createRigidBody({ mass: 1, inertia: 5, restitution: 0.6, friction: 0.3 }));
    world.addComponent(colA, {
      type: "CollisionEvents",
      collisions: [],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: []
    });

    const colB = world.createEntity();
    world.addComponent(colB, {
      type: "Transform",
      x: 420,
      y: 405,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 420,
      worldY: 405,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(colB, { type: "Velocity", vx: -30, vy: -5, angularVelocity: -0.2 });
    world.addComponent(colB, {
      type: "Collider2D",
      shape: { type: "circle", radius: 15 },
      layer: 1,
      mask: 1,
      offsetX: 0,
      offsetY: 0,
      isTrigger: false,
      enabled: true
    });
    world.addComponent(colB, createRigidBody({ mass: 2, inertia: 10, restitution: 0.6, friction: 0.3 }));
    world.addComponent(colB, {
      type: "CollisionEvents",
      collisions: [],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: []
    });

    const dt = 0.016;
    const history: Array<{
      step: number;
      springA: { vx: number; vy: number; w: number };
      springB: { vx: number; vy: number; w: number };
      distA: { vx: number; vy: number; w: number; x: number; y: number };
      distB: { vx: number; vy: number; w: number; x: number; y: number };
      revA: { vx: number; vy: number; w: number };
      revB: { vx: number; vy: number; w: number };
      colA: { vx: number; vy: number; w: number };
      colB: { vx: number; vy: number; w: number };
    }> = [];

    for (let step = 0; step < 20; step++) {
      collisionSystem.update(world, dt);
      solveSystem.update(world, dt);
      jointSystem.update(world, dt);

      const vSpringA = world.getComponent(springA, "Velocity")!;
      const vSpringB = world.getComponent(springB, "Velocity")!;
      const vDistA = world.getComponent(distA, "Velocity")!;
      const vDistB = world.getComponent(distB, "Velocity")!;
      const tDistA = world.getComponent(distA, "Transform")!;
      const tDistB = world.getComponent(distB, "Transform")!;
      const vRevA = world.getComponent(revA, "Velocity")!;
      const vRevB = world.getComponent(revB, "Velocity")!;
      const vColA = world.getComponent(colA, "Velocity")!;
      const vColB = world.getComponent(colB, "Velocity")!;

      history.push({
        step,
        springA: { vx: vSpringA.vx, vy: vSpringA.vy, w: vSpringA.angularVelocity },
        springB: { vx: vSpringB.vx, vy: vSpringB.vy, w: vSpringB.angularVelocity },
        distA: { vx: vDistA.vx, vy: vDistA.vy, w: vDistA.angularVelocity, x: tDistA.x, y: tDistA.y },
        distB: { vx: vDistB.vx, vy: vDistB.vy, w: vDistB.angularVelocity, x: tDistB.x, y: tDistB.y },
        revA: { vx: vRevA.vx, vy: vRevA.vy, w: vRevA.angularVelocity },
        revB: { vx: vRevB.vx, vy: vRevB.vy, w: vRevB.angularVelocity },
        colA: { vx: vColA.vx, vy: vColA.vy, w: vColA.angularVelocity },
        colB: { vx: vColB.vx, vy: vColB.vy, w: vColB.angularVelocity }
      });
    }

    expect(history).toMatchSnapshot();
  });
});
