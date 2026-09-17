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
import { SnapshotSerializer } from "../src/snapshots/SnapshotSerializer";
import { SnapshotRestore } from "../src/snapshots/SnapshotRestore";
import { CoreComponentRegistry } from "../src/ecs/CoreComponents";

describe("Physics Impulse Solver & Joints Subsystem Tests", () => {
  let world: World<CoreComponentRegistry>;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
  });

  describe("PhysicsSolveSystem (Impulse Resolution & Mass/Inertia)", () => {
    it("should resolve elastic linear impulse collision conserving momentum", () => {
      const collisionSystem = new CollisionSystem2D();
      const solveSystem = new PhysicsSolveSystem();

      // Entity A: moving right at 100 px/s with mass = 2
      const entityA = world.createEntity();
      world.addComponent(entityA, {
        type: "Transform",
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 0,
        worldY: 0,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });
      world.addComponent(entityA, { type: "Velocity", vx: 100, vy: 0, angularVelocity: 0 });
      world.addComponent(entityA, {
        type: "Collider2D",
        shape: { type: "circle", radius: 10 },
        layer: 1,
        mask: 1,
        offsetX: 0,
        offsetY: 0,
        isTrigger: false,
        enabled: true
      });
      world.addComponent(entityA, createRigidBody({ mass: 2, restitution: 1.0 }));
      world.addComponent(entityA, {
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: []
      });

      // Entity B: stationary at x=15 with mass = 1
      const entityB = world.createEntity();
      world.addComponent(entityB, {
        type: "Transform",
        x: 15,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 15,
        worldY: 0,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });
      world.addComponent(entityB, { type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 });
      world.addComponent(entityB, {
        type: "Collider2D",
        shape: { type: "circle", radius: 10 },
        layer: 1,
        mask: 1,
        offsetX: 0,
        offsetY: 0,
        isTrigger: false,
        enabled: true
      });
      world.addComponent(entityB, createRigidBody({ mass: 1, restitution: 1.0 }));
      world.addComponent(entityB, {
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: []
      });

      const initialMomentumX = 2 * 100 + 1 * 0; // 200

      collisionSystem.update(world, 0.016);
      solveSystem.update(world, 0.016);

      const velA = world.getComponent(entityA, "Velocity")!;
      const velB = world.getComponent(entityB, "Velocity")!;

      const finalMomentumX = 2 * velA.vx + 1 * velB.vx;

      expect(Math.abs(finalMomentumX - initialMomentumX)).toBeLessThan(0.01);
      expect(velB.vx).toBeGreaterThan(0); // B launched forward
    });

    it("should resolve inelastic collision where objects move together", () => {
      const collisionSystem = new CollisionSystem2D();
      const solveSystem = new PhysicsSolveSystem();

      const entityA = world.createEntity();
      world.addComponent(entityA, {
        type: "Transform",
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 0,
        worldY: 0,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });
      world.addComponent(entityA, { type: "Velocity", vx: 60, vy: 0, angularVelocity: 0 });
      world.addComponent(entityA, {
        type: "Collider2D",
        shape: { type: "circle", radius: 10 },
        layer: 1,
        mask: 1,
        offsetX: 0,
        offsetY: 0,
        isTrigger: false,
        enabled: true
      });
      world.addComponent(entityA, createRigidBody({ mass: 1, restitution: 0.0 }));
      world.addComponent(entityA, {
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: []
      });

      const entityB = world.createEntity();
      world.addComponent(entityB, {
        type: "Transform",
        x: 12,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 12,
        worldY: 0,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });
      world.addComponent(entityB, { type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 });
      world.addComponent(entityB, {
        type: "Collider2D",
        shape: { type: "circle", radius: 10 },
        layer: 1,
        mask: 1,
        offsetX: 0,
        offsetY: 0,
        isTrigger: false,
        enabled: true
      });
      world.addComponent(entityB, createRigidBody({ mass: 1, restitution: 0.0 }));
      world.addComponent(entityB, {
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: []
      });

      collisionSystem.update(world, 0.016);
      solveSystem.update(world, 0.016);

      const velA = world.getComponent(entityA, "Velocity")!;
      const velB = world.getComponent(entityB, "Velocity")!;

      // In perfect 1:1 inelastic collision from 60 + 0, final velocity should be 30 each
      expect(velA.vx).toBeCloseTo(30, 1);
      expect(velB.vx).toBeCloseTo(30, 1);
    });
  });

  describe("JointSolverSystem (Constraints)", () => {
    it("should enforce rigid distance joint constraint between two entities", () => {
      const jointSystem = new JointSolverSystem();

      const entityA = world.createEntity();
      world.addComponent(entityA, {
        type: "Transform",
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 0,
        worldY: 0,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });
      world.addComponent(entityA, { type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 });
      world.addComponent(entityA, createRigidBody({ mass: 1, isStatic: true }));

      const entityB = world.createEntity();
      world.addComponent(entityB, {
        type: "Transform",
        x: 100,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 100,
        worldY: 0,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });
      world.addComponent(entityB, { type: "Velocity", vx: 50, vy: 0, angularVelocity: 0 });
      world.addComponent(entityB, createRigidBody({ mass: 1, isStatic: false }));

      // Joint with target restLength = 50 (currently separated at 100)
      const jointEntity = world.createEntity();
      world.addComponent(
        jointEntity,
        createDistanceJoint(entityA, entityB, { x: 0, y: 0 }, { x: 0, y: 0 }, 50)
      );

      jointSystem.update(world, 0.016);

      const transB = world.getComponent(entityB, "Transform")!;
      expect(transB.x).toBeLessThan(100); // Pulled closer towards 50
    });

    it("should apply spring acceleration towards rest length", () => {
      const jointSystem = new JointSolverSystem();

      const entityA = world.createEntity();
      world.addComponent(entityA, {
        type: "Transform",
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 0,
        worldY: 0,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });
      world.addComponent(entityA, { type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 });
      world.addComponent(entityA, createRigidBody({ isStatic: true }));

      const entityB = world.createEntity();
      world.addComponent(entityB, {
        type: "Transform",
        x: 100,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 100,
        worldY: 0,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });
      world.addComponent(entityB, { type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 });
      world.addComponent(entityB, createRigidBody({ mass: 1, isStatic: false }));

      const jointEntity = world.createEntity();
      world.addComponent(
        jointEntity,
        createSpringJoint(entityA, entityB, { x: 0, y: 0 }, { x: 0, y: 0 }, 50, 100, 10)
      );

      jointSystem.update(world, 0.016);

      const velB = world.getComponent(entityB, "Velocity")!;
      expect(velB.vx).toBeLessThan(0); // Accelerated left towards origin
    });

    it("should keep revolute joint anchors aligned", () => {
      const jointSystem = new JointSolverSystem();

      const entityA = world.createEntity();
      world.addComponent(entityA, {
        type: "Transform",
        x: 50,
        y: 50,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 50,
        worldY: 50,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });
      world.addComponent(entityA, createRigidBody({ isStatic: true }));

      const entityB = world.createEntity();
      world.addComponent(entityB, {
        type: "Transform",
        x: 60,
        y: 60,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 60,
        worldY: 60,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });
      world.addComponent(entityB, { type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 });
      world.addComponent(entityB, createRigidBody({ mass: 1, isStatic: false }));

      const jointEntity = world.createEntity();
      world.addComponent(
        jointEntity,
        createRevoluteJoint(entityA, entityB, { x: 0, y: 0 }, { x: 0, y: 0 })
      );

      jointSystem.update(world, 0.016);

      const transB = world.getComponent(entityB, "Transform")!;
      expect(transB.x).toBeCloseTo(50, 1);
      expect(transB.y).toBeCloseTo(50, 1);
    });
  });

  describe("Snapshot Serialization Compatibility", () => {
    it("should correctly serialize and restore RigidBody and Joint components", () => {
      const entityA = world.createEntity();
      world.addComponent(entityA, {
        type: "Transform",
        x: 10,
        y: 20,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 10,
        worldY: 20,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });
      world.addComponent(entityA, createRigidBody({ mass: 5, restitution: 0.8, friction: 0.4 }));

      const entityB = world.createEntity();
      world.addComponent(entityB, {
        type: "Transform",
        x: 30,
        y: 20,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 30,
        worldY: 20,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });
      world.addComponent(entityB, createRigidBody({ mass: 1 }));

      const jointEntity = world.createEntity();
      world.addComponent(
        jointEntity,
        createSpringJoint(entityA, entityB, { x: 0, y: 0 }, { x: 0, y: 0 }, 20, 150, 12)
      );

      const snapshot = SnapshotSerializer.snapshot(world);

      const newWorld = new World<CoreComponentRegistry>();
      SnapshotRestore.restore(newWorld, snapshot);

      const restoredBodyA = newWorld.getComponent(entityA, "RigidBody");
      expect(restoredBodyA).toBeDefined();
      expect(restoredBodyA?.mass).toBe(5);
      expect(restoredBodyA?.restitution).toBe(0.8);

      const restoredJoint = newWorld.getComponent(jointEntity, "Joint");
      expect(restoredJoint).toBeDefined();
      expect(restoredJoint?.jointType).toBe("spring");
      if (restoredJoint && restoredJoint.jointType === "spring") {
        expect(restoredJoint.stiffness).toBe(150);
        expect(restoredJoint.restLength).toBe(20);
      }
    });
  });
});
