import { World } from "../src/ecs/World";
import { CoreComponentRegistry } from "../src/ecs/CoreComponents";
import { PlatformerMovementSystem } from "../src/physics/systems/PlatformerMovementSystem";
import { PlatformerGravitySystem } from "../src/physics/systems/PlatformerGravitySystem";
import { TileCollisionSystem } from "../src/physics/systems/TileCollisionSystem";
import { PlatformerCoyoteSystem } from "../src/systems/PlatformerCoyoteSystem";
import { PhysicsIntegrateSystem } from "../src/physics/dynamics/PhysicsIntegrateSystem";
import { EventBus } from "../src/events/EventBus";

describe("Platformer Systems Tests", () => {
  let world: World<CoreComponentRegistry>;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
    // Set up default EventBus resource
    const eventBus = new EventBus();
    world.setResource("EventBus", eventBus);
  });

  describe("Milestone 1 - Horizontal Movement", () => {
    it("should accelerate and decelerate velocity.vx towards target values", () => {
      const system = new PlatformerMovementSystem();
      const entity = world.createEntity();

      world.addComponent(entity, {
        type: "Velocity",
        vx: 0,
        vy: 0,
        angularVelocity: 0
      });

      world.addComponent(entity, {
        type: "PlatformerMovementConfig",
        acceleration: 800,
        maxSpeed: 200,
        deceleration: 1200,
        airAcceleration: 400,
        airDeceleration: 600
      });

      world.addComponent(entity, {
        type: "PlatformerInput",
        moveDir: 1, // Moving right
        jumpPressed: false,
        jumpHeld: false,
        jumpReleased: false
      });

      world.addComponent(entity, {
        type: "PlatformerGroundState",
        isGrounded: true,
        iceMultiplier: 1.0
      });

      // Update 1 frame of movement (0.1s) with accel 800 -> should reach 80
      system.update(world, 0.1);
      let vel = world.getComponent(entity, "Velocity")!;
      expect(vel.vx).toBe(80);

      // Change input to no move -> should decelerate from 80 towards 0 by 1200 * 0.05 = 60 -> vx = 20
      world.mutateComponent(entity, "PlatformerInput", (inp: any) => {
        inp.moveDir = 0;
      });
      system.update(world, 0.05);
      vel = world.getComponent(entity, "Velocity")!;
      expect(vel.vx).toBe(20);

      // Decelerate further -> should clamp at 0
      system.update(world, 0.1);
      vel = world.getComponent(entity, "Velocity")!;
      expect(vel.vx).toBe(0);
    });

    it("should apply ice multiplier to decrease acceleration and deceleration effectiveness", () => {
      const system = new PlatformerMovementSystem();
      const entity = world.createEntity();

      world.addComponent(entity, {
        type: "Velocity",
        vx: 0,
        vy: 0,
        angularVelocity: 0
      });

      world.addComponent(entity, {
        type: "PlatformerMovementConfig",
        acceleration: 1000,
        maxSpeed: 200,
        deceleration: 1000,
        airAcceleration: 500,
        airDeceleration: 500
      });

      world.addComponent(entity, {
        type: "PlatformerInput",
        moveDir: 1,
        jumpPressed: false,
        jumpHeld: false,
        jumpReleased: false
      });

      world.addComponent(entity, {
        type: "PlatformerGroundState",
        isGrounded: true,
        iceMultiplier: 0.2 // Reduced grip
      });

      // Normal accel 1000 * ice grip 0.2 = 200 effective accel. For 0.1s, vx should be 20.
      system.update(world, 0.1);
      const vel = world.getComponent(entity, "Velocity")!;
      expect(vel.vx).toBe(20);
    });
  });

  describe("Milestone 4 - Tile Collisions", () => {
    let tilemapEntity: number;

    const setupTilemap = (data: number[][], definitions: any) => {
      tilemapEntity = world.createEntity();
      world.addComponent(tilemapEntity, {
        type: "Tilemap",
        data,
        tileSize: 40,
        tileDefinitions: definitions
      });
      world.addComponent(tilemapEntity, {
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
    };

    it("should land on a solid tile and set isGrounded to true", () => {
      // 3x3 tilemap: row 2 is solid
      setupTilemap(
        [
          [0, 0, 0],
          [0, 0, 0],
          [1, 1, 1]
        ],
        { 1: { solid: true } }
      );

      const collisionSystem = new TileCollisionSystem();
      const entity = world.createEntity();

      // Place entity just above the solid tile and falling
      // Half height is 15. TileTop at y = 80.
      // So at y = 70, bottom is 70 + 15 = 85 (inside tile).
      // Prev position is y = 60 (bottom 75, safe above tile).
      world.addComponent(entity, {
        type: "Transform",
        x: 40,
        y: 70,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 40,
        worldY: 70,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });

      world.addComponent(entity, {
        type: "Velocity",
        vx: 0,
        vy: 100, // Falling
        angularVelocity: 0
      });

      world.addComponent(entity, {
        type: "Collider2D",
        shape: { type: "aabb", halfWidth: 10, halfHeight: 15 },
        layer: 1,
        mask: 0xFFFF,
        offsetX: 0,
        offsetY: 0,
        isTrigger: false,
        enabled: true
      });

      world.addComponent(entity, {
        type: "Tag",
        tags: ["TileCollider"]
      });

      world.addComponent(entity, {
        type: "PlatformerGroundState",
        isGrounded: false
      });

      // Update with dt = 0.1s. Prev position is 70 - 100 * 0.1 = 60.
      collisionSystem.update(world, 0.1);

      const trans = world.getComponent(entity, "Transform")!;
      const vel = world.getComponent(entity, "Velocity")!;
      const ground = world.getComponent(entity, "PlatformerGroundState")!;

      // Bottom must be pushed out to 80 (top of row 2 tile)
      // Since half height is 15, transform.y must be 80 - 15 = 65
      expect(trans.y).toBe(65);
      expect(vel.vy).toBe(0);
      expect(ground.isGrounded).toBe(true);
    });

    it("should pass through a one-way platform from below and land on it from above", () => {
      setupTilemap(
        [
          [0, 0, 0],
          [5, 5, 5], // One-way platforms at row 1 (y=40 to y=80)
          [0, 0, 0]
        ],
        { 5: { solid: true, oneWay: true } }
      );

      const collisionSystem = new TileCollisionSystem();
      const entity = world.createEntity();

      // Scenario A: Ascending from below (vy = -100). Should pass through.
      world.addComponent(entity, {
        type: "Transform",
        x: 40,
        y: 45, // bottom at 45 + 15 = 60 (inside platform)
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 40,
        worldY: 45,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });

      world.addComponent(entity, {
        type: "Velocity",
        vx: 0,
        vy: -100, // Rising
        angularVelocity: 0
      });

      world.addComponent(entity, {
        type: "Collider2D",
        shape: { type: "aabb", halfWidth: 10, halfHeight: 15 },
        layer: 1,
        mask: 0xFFFF,
        offsetX: 0,
        offsetY: 0,
        isTrigger: false,
        enabled: true
      });

      world.addComponent(entity, {
        type: "Tag",
        tags: ["TileCollider"]
      });

      world.addComponent(entity, {
        type: "PlatformerGroundState",
        isGrounded: false
      });

      collisionSystem.update(world, 0.1);

      let trans = world.getComponent(entity, "Transform")!;
      let vel = world.getComponent(entity, "Velocity")!;
      let ground = world.getComponent(entity, "PlatformerGroundState")!;

      // Position should be untouched by collision (kept at 45, rising)
      expect(trans.y).toBe(45);
      expect(vel.vy).toBe(-100);
      expect(ground.isGrounded).toBe(false);

      // Scenario B: Descending from above (vy = 100). Should land.
      // Reset position to be inside tile, but previously above.
      // Tile top is at y = 40.
      world.mutateComponent(entity, "Transform", (t: any) => {
        t.y = 35; // bottom is 35 + 15 = 50 (inside tile top edge 40)
      });
      world.mutateComponent(entity, "Velocity", (v: any) => {
        v.vy = 100; // Descending
      });

      // prev bottom was 35 - 100 * 0.1 + 15 = 40 (just at tileTop)
      collisionSystem.update(world, 0.1);

      trans = world.getComponent(entity, "Transform")!;
      vel = world.getComponent(entity, "Velocity")!;
      ground = world.getComponent(entity, "PlatformerGroundState")!;

      // Must land on top edge (y=40). transform.y = 40 - 15 = 25
      expect(trans.y).toBe(25);
      expect(vel.vy).toBe(0);
      expect(ground.isGrounded).toBe(true);
    });

    it("should handle spike tiles: reduce health and emit spike:hit EventBus event", () => {
      setupTilemap(
        [
          [0, 0, 0],
          [4, 4, 4] // Spike tiles
        ],
        { 4: { solid: true, kind: "spike" } }
      );

      const collisionSystem = new TileCollisionSystem();
      const entity = world.createEntity();

      world.addComponent(entity, {
        type: "Transform",
        x: 40,
        y: 30, // Inside tile top (tileTop = 40, halfHeight = 15, y = 30 -> bottom 45)
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 40,
        worldY: 30,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });

      world.addComponent(entity, {
        type: "Velocity",
        vx: 0,
        vy: 100,
        angularVelocity: 0
      });

      world.addComponent(entity, {
        type: "Collider2D",
        shape: { type: "aabb", halfWidth: 10, halfHeight: 15 },
        layer: 1,
        mask: 0xFFFF,
        offsetX: 0,
        offsetY: 0,
        isTrigger: false,
        enabled: true
      });

      world.addComponent(entity, {
        type: "Tag",
        tags: ["TileCollider"]
      });

      world.addComponent(entity, {
        type: "Health",
        current: 3,
        max: 3
      });

      const eventBus = world.getEventBus();
      let eventPayload: any = null;
      eventBus.on("spike:hit" as any, (payload) => {
        eventPayload = payload;
      });

      collisionSystem.update(world, 0.1);

      const health = world.getComponent(entity, "Health")!;
      expect(health.current).toBe(2);
      expect(eventPayload).not.toBeNull();
      expect(eventPayload.entity).toBe(entity);
    });

    it("should handle bounce tiles: invert vertical velocity with a bounce factor", () => {
      setupTilemap(
        [
          [0, 0, 0],
          [3, 3, 3] // Bounce tiles
        ],
        { 3: { solid: true, kind: "bounce", bounce: 1.5 } }
      );

      const collisionSystem = new TileCollisionSystem();
      const entity = world.createEntity();

      world.addComponent(entity, {
        type: "Transform",
        x: 40,
        y: 30, // bottom 45 (tile top is 40)
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 40,
        worldY: 30,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });

      world.addComponent(entity, {
        type: "Velocity",
        vx: 0,
        vy: 100,
        angularVelocity: 0
      });

      world.addComponent(entity, {
        type: "Collider2D",
        shape: { type: "aabb", halfWidth: 10, halfHeight: 15 },
        layer: 1,
        mask: 0xFFFF,
        offsetX: 0,
        offsetY: 0,
        isTrigger: false,
        enabled: true
      });

      world.addComponent(entity, {
        type: "Tag",
        tags: ["TileCollider"]
      });

      world.addComponent(entity, {
        type: "PlatformerGroundState",
        isGrounded: false
      });

      collisionSystem.update(world, 0.1);

      const vel = world.getComponent(entity, "Velocity")!;
      const ground = world.getComponent(entity, "PlatformerGroundState")!;

      // Inverted vy: -100 * 1.5 = -150
      expect(vel.vy).toBe(-150);
      expect(ground.isGrounded).toBe(false); // Bouncing up means we aren't grounded anymore
    });
  });

  describe("Milestone 2 - Gravity & Salto", () => {
    it("should apply asymmetrical gravity: fallGravity is larger than riseGravity", () => {
      const gravitySystem = new PlatformerGravitySystem();
      const entity = world.createEntity();

      world.addComponent(entity, {
        type: "Velocity",
        vx: 0,
        vy: -100, // Rising
        angularVelocity: 0
      });

      world.addComponent(entity, {
        type: "PlatformerGravityConfig",
        riseGravity: 400,
        fallGravity: 800,
        jumpVelocity: 300,
        minJumpVelocity: 100
      });

      // Update frame rising -> should use riseGravity (400 * 0.1 = 40) -> vy = -60
      gravitySystem.update(world, 0.1);
      let vel = world.getComponent(entity, "Velocity")!;
      expect(vel.vy).toBe(-60);

      // Reset to falling (vy = 100) -> should use fallGravity (800 * 0.1 = 80) -> vy = 180
      world.mutateComponent(entity, "Velocity", (v: any) => {
        v.vy = 100;
      });
      gravitySystem.update(world, 0.1);
      vel = world.getComponent(entity, "Velocity")!;
      expect(vel.vy).toBe(180);
    });
  });

  describe("Milestone 3 - Coyote Time and Jump Buffer", () => {
    it("should permit jumping within coyote time frame after leaving a platform", () => {
      const coyoteSystem = new PlatformerCoyoteSystem();
      const entity = world.createEntity();

      world.addComponent(entity, {
        type: "PlatformerGroundState",
        isGrounded: false // Just left platform!
      });

      world.addComponent(entity, {
        type: "PlatformerJumper",
        coyoteTimer: 0.15, // Had coyote time
        jumpBufferTimer: 0,
        coyoteTimeMax: 0.15,
        jumpBufferMax: 0.1
      });

      world.addComponent(entity, {
        type: "PlatformerGravityConfig",
        riseGravity: 500,
        fallGravity: 1000,
        jumpVelocity: 300,
        minJumpVelocity: 100
      });

      world.addComponent(entity, {
        type: "Velocity",
        vx: 0,
        vy: 0,
        angularVelocity: 0
      });

      // Since isGrounded is false, update should decrement coyoteTimer (0.15 - 0.05 = 0.10)
      coyoteSystem.update(world, 0.05);

      const jumper = world.getComponent(entity, "PlatformerJumper")!;
      expect(jumper.coyoteTimer).toBeCloseTo(0.10);
    });

    it("should queue jumping during jump buffer and trigger immediately upon landing", () => {
      const coyoteSystem = new PlatformerCoyoteSystem();
      const entity = world.createEntity();

      // Entity has landed (isGrounded transition)
      world.addComponent(entity, {
        type: "PlatformerGroundState",
        isGrounded: true
      });

      world.addComponent(entity, {
        type: "PlatformerJumper",
        coyoteTimer: 0,
        jumpBufferTimer: 0.08, // Buffered jump remaining
        coyoteTimeMax: 0.15,
        jumpBufferMax: 0.1
      });

      world.addComponent(entity, {
        type: "PlatformerGravityConfig",
        riseGravity: 500,
        fallGravity: 1000,
        jumpVelocity: 300,
        minJumpVelocity: 100
      });

      world.addComponent(entity, {
        type: "Velocity",
        vx: 0,
        vy: 0,
        angularVelocity: 0
      });

      // Update -> should execute buffered jump (set vy = -300, reset buffer/coyote, set grounded = false)
      coyoteSystem.update(world, 0.016);

      const vel = world.getComponent(entity, "Velocity")!;
      const ground = world.getComponent(entity, "PlatformerGroundState")!;
      const jumper = world.getComponent(entity, "PlatformerJumper")!;

      expect(vel.vy).toBe(-300);
      expect(ground.isGrounded).toBe(false);
      expect(jumper.jumpBufferTimer).toBe(0);
      expect(jumper.coyoteTimer).toBe(0);
    });
  });
});
