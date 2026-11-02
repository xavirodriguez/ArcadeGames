import { World } from "../src/ecs/World";
import { CoreComponentRegistry } from "../src/ecs/CoreComponents";
import { MovingPlatformSystem } from "../src/physics/systems/MovingPlatformSystem";
import { PlatformCarrySystem } from "../src/physics/systems/PlatformCarrySystem";
import { PhysicsIntegrateSystem } from "../src/physics/dynamics/PhysicsIntegrateSystem";
import { PlatformerJumpSystem } from "../src/systems/PlatformerJumpSystem";
import { PlatformerJumpSystem } from "../src/systems/PlatformerJumpSystem";
import { TileCollisionSystem } from "../src/physics/systems/TileCollisionSystem";

describe("Locomotion B5 moving-platform support", () => {
  const addTransform = (world: World<CoreComponentRegistry>, entity: number, x: number, y: number): void => {
    world.addComponent(entity, {
      type: "Transform", x, y, rotation: 0, scaleX: 1, scaleY: 1,
      worldX: x, worldY: y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false
    });
  };

  const createPlatform = (world: World<CoreComponentRegistry>, x = 100, y = 200, vx = 50, vy = 0): number => {
    const platform = world.createEntity();
    addTransform(world, platform, x, y);
    world.addComponent(platform, { type: "Velocity", vx, vy, angularVelocity: 0 });
    world.addComponent(platform, {
      type: "Collider2D", shape: { type: "aabb", halfWidth: 30, halfHeight: 10 },
      layer: 2, mask: 0xffff, offsetX: 0, offsetY: 0, isTrigger: false, enabled: true
    });
    world.addComponent(platform, {
      type: "MovingPlatform", pattern: "sine", startX: x, startY: y,
      amplitudeX: 50, amplitudeY: 0, frequency: 0.25, elapsed: 0
    });
    return platform;
  };

  const createPassenger = (world: World<CoreComponentRegistry>, platform: number, x = 100, y = 175): number => {
    const passenger = world.createEntity();
    addTransform(world, passenger, x, y);
    world.addComponent(passenger, { type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 });
    world.addComponent(passenger, {
      type: "Collider2D", shape: { type: "aabb", halfWidth: 10, halfHeight: 15 },
      layer: 1, mask: 0xffff, offsetX: 0, offsetY: 0, isTrigger: false, enabled: true
    });
    world.addComponent(passenger, { type: "PlatformerGroundState", isGrounded: true, carrierEntity: platform });
    world.addComponent(passenger, { type: "PhysicsContactState", contacts: [], isGrounded: false });
    return passenger;
  };

  it("advances the platform before carrying and publishes its world-space support velocity", () => {
    const world = new World<CoreComponentRegistry>();
    const platform = createPlatform(world);
    const passenger = createPassenger(world, platform);
    const moving = new MovingPlatformSystem();
    const carry = new PlatformCarrySystem();

    moving.update(world, 1);
    carry.update(world, 1);

    expect(world.getComponent(platform, "Transform")?.x).toBeCloseTo(150, 5);
    expect(world.getComponent(platform, "Velocity")?.vx).toBeCloseTo(50, 5);
    new TileCollisionSystem().update(world, 1);
    expect(world.getComponent(passenger, "PhysicsContactState")?.groundContact?.entity).toBe(platform);
    new PhysicsIntegrateSystem().update(world, 1);
    expect(world.getComponent(passenger, "Transform")?.x).toBeCloseTo(150, 5);
    expect(world.getComponent(platform, "Transform")?.x).toBeCloseTo(150, 5);
    const contact = world.getComponent(passenger, "PhysicsContactState")?.groundContact;
    expect(contact?.entity).toBe(platform);
    expect(contact?.normal).toEqual({ x: 0, y: -1 });
    expect(contact?.surfaceVelocity).toEqual({ x: 50, y: 0 });
  });

  it("inherits vertical platform motion on landing and snaps to the moving top", () => {
    const world = new World<CoreComponentRegistry>();
    const platform = createPlatform(world, 100, 200, 10, 20);
    world.mutateComponent(platform, "Transform", transform => { transform.x += 1; transform.y += 2; });
    const passenger = createPassenger(world, platform, 100, 176);
    world.mutateComponent(passenger, "Velocity", velocity => { velocity.vy = 30; });
    world.mutateComponent(passenger, "PlatformerGroundState", state => {
      state.isGrounded = false;
      state.carrierEntity = undefined;
    });

    new PlatformCarrySystem().update(world, 0.1);

    expect(world.getComponent(passenger, "Transform")?.y).toBeCloseTo(175, 5);
    expect(world.getComponent(passenger, "Velocity")).toMatchObject({ vx: 10, vy: 20 });
    expect(world.getComponent(passenger, "PlatformerGroundState")?.carrierEntity).toBe(platform);
    expect(world.getComponent(passenger, "PhysicsContactState")?.groundContact?.surfaceVelocity).toEqual({ x: 0, y: 20 });
    new PhysicsIntegrateSystem().update(world, 0.1);
    expect(world.getComponent(passenger, "Transform")?.x).toBeCloseTo(101, 5);
    expect(world.getComponent(passenger, "Transform")?.y).toBeCloseTo(177, 5);

    world.mutateComponent(platform, "Transform", transform => { transform.x += 1; transform.y += 2; });
    new PlatformCarrySystem().update(world, 0.1);
    new PhysicsIntegrateSystem().update(world, 0.1);
    expect(world.getComponent(passenger, "Transform")?.x).toBeCloseTo(102, 5);
    expect(world.getComponent(passenger, "Transform")?.y).toBeCloseTo(179, 5);
    expect(world.getComponent(platform, "Transform")?.x).toBeCloseTo(102, 5);
    expect(world.getComponent(platform, "Transform")?.y).toBeCloseTo(204, 5);
  });

  it("preserves the configured fraction of support velocity on jump detachment", () => {
    const world = new World<CoreComponentRegistry>();
    const platform = createPlatform(world, 100, 200, 40, 10);
    const passenger = createPassenger(world, platform);
    world.addComponent(passenger, {
      type: "LocomotionProfile",
      ground: { maxSpeed: 200, acceleration: 1000, deceleration: 800, brakingAcceleration: 1200, turnAcceleration: 1000 },
      air: { maxSpeed: 200, acceleration: 300, deceleration: 100, brakingAcceleration: 200, turnAcceleration: 150, steeringMultiplier: 0.3 },
      momentum: { groundDrag: 0.1, airDrag: 0.02, preserveMomentum: 0.5 }
    });
    world.addComponent(passenger, {
      type: "PlatformerInput", moveDir: 0, jumpPressed: true, jumpHeld: true, jumpReleased: false
    });
    world.addComponent(passenger, {
      type: "PlatformerJumper", coyoteTimer: 0, jumpBufferTimer: 0, coyoteTimeMax: 0.1, jumpBufferMax: 0.1
    });
    world.addComponent(passenger, {
      type: "PlatformerGravityConfig", riseGravity: 600, fallGravity: 900, jumpVelocity: 300, minJumpVelocity: 100
    });
    world.mutateComponent(passenger, "Velocity", velocity => { velocity.vx = 40; velocity.vy = 10; });
    world.mutateComponent(passenger, "PhysicsContactState", state => {
      state.contacts = [{
        entity: platform, point: { x: 100, y: 190 }, normal: { x: 0, y: -1 },
        separation: 0, surfaceVelocity: { x: 40, y: 10 }
      }];
      state.groundContact = state.contacts[0];
      state.isGrounded = true;
    });
    world.mutateComponent(passenger, "PlatformerGroundState", state => { state.isGrounded = false; });

    new PlatformerJumpSystem().update(world, 1 / 60);
    new PlatformCarrySystem().update(world, 1 / 60);

    expect(world.getComponent(passenger, "Velocity")?.vx).toBe(20);
    expect(world.getComponent(passenger, "Velocity")?.vy).toBe(-295);
    expect(world.getComponent(passenger, "PlatformerGroundState")?.carrierEntity).toBeUndefined();
    expect(world.getComponent(passenger, "PhysicsContactState")?.groundContact).toBeUndefined();
  });

  it("preserves only the configured support fraction when walking off the platform edge", () => {
    const world = new World<CoreComponentRegistry>();
    const platform = createPlatform(world, 100, 200, 50, 10);
    const passenger = createPassenger(world, platform, 140, 175);
    world.addComponent(passenger, {
      type: "LocomotionProfile",
      ground: { maxSpeed: 200, acceleration: 1000, deceleration: 800, brakingAcceleration: 1200, turnAcceleration: 1000 },
      air: { maxSpeed: 200, acceleration: 300, deceleration: 100, brakingAcceleration: 200, turnAcceleration: 150, steeringMultiplier: 0.3 },
      momentum: { groundDrag: 0.1, airDrag: 0.02, preserveMomentum: 0.5 }
    });
    world.mutateComponent(passenger, "Velocity", velocity => { velocity.vx = 50; velocity.vy = 10; });
    world.mutateComponent(passenger, "PhysicsContactState", state => {
      const contact = {
        entity: platform, point: { x: 140, y: 190 }, normal: { x: 0, y: -1 },
        separation: 0, surfaceVelocity: { x: 50, y: 10 }
      };
      state.contacts = [contact];
      state.groundContact = contact;
      state.isGrounded = true;
    });

    new PlatformCarrySystem().update(world, 1);

    expect(world.getComponent(passenger, "PlatformerGroundState")?.carrierEntity).toBeUndefined();
    expect(world.getComponent(passenger, "PlatformerGroundState")?.isGrounded).toBe(false);
    expect(world.getComponent(passenger, "Velocity")?.vx).toBeCloseTo(25);
    expect(world.getComponent(passenger, "Velocity")?.vy).toBeCloseTo(5);
    expect(world.getComponent(passenger, "PhysicsContactState")?.groundContact).toBeUndefined();
  });

  it("does not inherit platform velocity without an opt-in locomotion profile", () => {
    const world = new World<CoreComponentRegistry>();
    const platform = createPlatform(world, 100, 200, 40, 10);
    const passenger = createPassenger(world, platform);
    world.mutateComponent(passenger, "Velocity", velocity => { velocity.vx = 43; velocity.vy = -290; });
    world.mutateComponent(passenger, "PhysicsContactState", state => {
      const contact = {
        entity: platform, point: { x: 100, y: 190 }, normal: { x: 0, y: -1 },
        separation: 0, surfaceVelocity: { x: 40, y: 10 }
      };
      state.contacts = [contact];
      state.groundContact = contact;
      state.isGrounded = true;
    });
    world.mutateComponent(passenger, "PlatformerGroundState", state => { state.isGrounded = false; });

    new PlatformCarrySystem().update(world, 1 / 60);

    // Contact-aware movement velocity contains the full support component. Without a profile,
    // detachment removes that component rather than inheriting platform momentum.
    expect(world.getComponent(passenger, "Velocity")).toMatchObject({ vx: 3, vy: -300 });
  });

  it("does not advance phase or produce non-finite velocity for a zero-length step", () => {
    const world = new World<CoreComponentRegistry>();
    const platform = createPlatform(world);
    new MovingPlatformSystem().update(world, 0);
    expect(world.getComponent(platform, "MovingPlatform")?.elapsed).toBe(0);
    expect(world.getComponent(platform, "Velocity")).toMatchObject({ vx: 50, vy: 0 });
    expect(Number.isFinite(world.getComponent(platform, "Velocity")!.vx)).toBe(true);
  });
});
