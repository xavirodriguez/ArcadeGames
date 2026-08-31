import { World } from "../src/ecs/World";
import { CoreComponentRegistry } from "../src/ecs/CoreComponents";
import { PlatformerMovementSystem } from "../src/physics/systems/PlatformerMovementSystem";
import { PlatformerGravitySystem } from "../src/physics/systems/PlatformerGravitySystem";
import { TileCollisionSystem } from "../src/physics/systems/TileCollisionSystem";
import { PlatformerCoyoteSystem } from "../src/systems/PlatformerCoyoteSystem";
import { PhysicsIntegrateSystem } from "../src/physics/dynamics/PhysicsIntegrateSystem";
import { EventBus } from "../src/events/EventBus";
import { MovingPlatformSystem } from "../src/physics/systems/MovingPlatformSystem";
import { PlatformCarrySystem } from "../src/physics/systems/PlatformCarrySystem";
import { Camera2DSystem } from "../src/rendering/Camera2D";
import { HitDetectionSystem } from "../src/systems/HitDetectionSystem";
import { CollisionSystem2D } from "../src/physics/collision/CollisionSystems";
import { HierarchySystem } from "../src/systems/HierarchySystem";
import { ShapeType, BoxShape } from "../src/physics/shapes/Shapes";

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
      eventBus.on("spike:hit", (payload) => {
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

  describe("Hito 7 - Control Aéreo", () => {
    it("should converge slower in the air than on the ground for the same deltaTime", () => {
      const movementSystem = new PlatformerMovementSystem();

      const config = {
        type: "PlatformerMovementConfig",
        acceleration: 1000,
        maxSpeed: 200,
        deceleration: 1000,
        airAcceleration: 400,
        airDeceleration: 400
      };

      const input = {
        type: "PlatformerInput",
        moveDir: 1, // Moving right
        jumpPressed: false,
        jumpHeld: false,
        jumpReleased: false
      };

      // Entity A: Grounded player
      const entityGround = world.createEntity();
      world.addComponent(entityGround, { type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 });
      world.addComponent(entityGround, { ...config } as any);
      world.addComponent(entityGround, { ...input } as any);
      world.addComponent(entityGround, { type: "PlatformerGroundState", isGrounded: true, iceMultiplier: 1.0 });

      // Entity B: Airborne player
      const entityAir = world.createEntity();
      world.addComponent(entityAir, { type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 });
      world.addComponent(entityAir, { ...config } as any);
      world.addComponent(entityAir, { ...input } as any);
      world.addComponent(entityAir, { type: "PlatformerGroundState", isGrounded: false });

      // Run movement system for 0.1s
      movementSystem.update(world, 0.1);

      const velGround = world.getComponent(entityGround, "Velocity")!;
      const velAir = world.getComponent(entityAir, "Velocity")!;

      // On ground: accel is 1000 * 0.1s = 100 vx
      expect(velGround.vx).toBe(100);
      // In air: air accel is 400 * 0.1s = 40 vx (slower convergence!)
      expect(velAir.vx).toBe(40);
      expect(velAir.vx).toBeLessThan(velGround.vx);
    });
  });

  describe("Hito 8 - Control del ápice ('hang time')", () => {
    it("should reduce applied gravity near the jump peak (apex)", () => {
      const gravitySystem = new PlatformerGravitySystem();

      const config = {
        type: "PlatformerGravityConfig",
        riseGravity: 600,
        fallGravity: 1000,
        jumpVelocity: 300,
        minJumpVelocity: 100,
        apexThreshold: 50,
        apexGravityMultiplier: 0.2
      };

      // Entity A: Far from apex (rising fast, vy = -150)
      const entityFar = world.createEntity();
      world.addComponent(entityFar, { type: "Velocity", vx: 0, vy: -150, angularVelocity: 0 });
      world.addComponent(entityFar, { ...config } as any);

      // Entity B: Near apex (rising slowly, vy = -20)
      const entityNear = world.createEntity();
      world.addComponent(entityNear, { type: "Velocity", vx: 0, vy: -20, angularVelocity: 0 });
      world.addComponent(entityNear, { ...config } as any);

      // Run gravity system for 0.1s
      gravitySystem.update(world, 0.1);

      const velFar = world.getComponent(entityFar, "Velocity")!;
      const velNear = world.getComponent(entityNear, "Velocity")!;

      // Far from apex change: riseGravity (600) * 0.1s = 60 -> vy becomes -150 + 60 = -90
      expect(velFar.vy).toBe(-90);

      // Near apex change: riseGravity (600) * apexGravityMultiplier (0.2) * 0.1s = 12 -> vy becomes -20 + 12 = -8
      expect(velNear.vy).toBe(-8);

      // Change in vy is smaller near apex
      const deltaFar = Math.abs(velFar.vy - (-150));
      const deltaNear = Math.abs(velNear.vy - (-20));
      expect(deltaNear).toBeLessThan(deltaFar);
    });
  });

  describe("Hito 9 - Plataformas Móviles y Carry", () => {
    it("should move moving platform deterministically using sine wave pattern", () => {
      const movingPlatformSystem = new MovingPlatformSystem();
      const platform = world.createEntity();

      world.addComponent(platform, {
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
      world.addComponent(platform, {
        type: "Velocity",
        vx: 0,
        vy: 0,
        angularVelocity: 0
      });
      world.addComponent(platform, {
        type: "MovingPlatform",
        pattern: "sine",
        startX: 100,
        startY: 100,
        amplitudeX: 50,
        amplitudeY: 0,
        frequency: 0.25, // 4s full period
        elapsed: 0
      });

      // Update 1s (0.25 period, sin(pi/2) = 1) -> platform x should go to 100 + 50 = 150
      movingPlatformSystem.update(world, 1.0);

      const trans = world.getComponent(platform, "Transform")!;
      expect(trans.x).toBeCloseTo(150);
    });

    it("should carry player displacement when grounded on moving platform, and stop when jumping off", () => {
      const carrySystem = new PlatformCarrySystem();

      const platform = world.createEntity();
      world.addComponent(platform, {
        type: "Transform",
        x: 100,
        y: 200,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 100,
        worldY: 200,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });
      world.addComponent(platform, { type: "Velocity", vx: 50, vy: 0, angularVelocity: 0 });
      world.addComponent(platform, {
        type: "Collider2D",
        shape: { type: "aabb", halfWidth: 30, halfHeight: 10 },
        layer: 2,
        mask: 0xFFFF,
        offsetX: 0,
        offsetY: 0,
        isTrigger: false,
        enabled: true
      });
      world.addComponent(platform, {
        type: "MovingPlatform",
        pattern: "sine",
        startX: 100,
        startY: 200,
        amplitudeX: 50,
        amplitudeY: 0,
        frequency: 0.25,
        elapsed: 0
      });

      const player = world.createEntity();
      // Position player just above platform. Player bottom edge is y + 15 = 190. Platform top is 200 - 10 = 190.
      world.addComponent(player, {
        type: "Transform",
        x: 100,
        y: 175,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 100,
        worldY: 175,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });
      world.addComponent(player, { type: "Velocity", vx: 0, vy: 10, angularVelocity: 0 });
      world.addComponent(player, {
        type: "Collider2D",
        shape: { type: "aabb", halfWidth: 10, halfHeight: 15 },
        layer: 1,
        mask: 0xFFFF,
        offsetX: 0,
        offsetY: 0,
        isTrigger: false,
        enabled: true
      });
      world.addComponent(player, { type: "PlatformerGroundState", isGrounded: false });

      // Update 1 frame to detect landing (dt = 0.1s, player was at 174 previously, falling. So landing check applies)
      carrySystem.update(world, 0.1);

      let playerGround = world.getComponent(player, "PlatformerGroundState")!;
      let playerTrans = world.getComponent(player, "Transform")!;

      expect(playerGround.isGrounded).toBe(true);
      expect(playerGround.carrierEntity).toBe(platform);
      // Snapped perfectly: platform top (190) - player halfHeight (15) = 175
      expect(playerTrans.y).toBe(175);

      // Another frame to check carry displacement: platform speed is 50. In 0.1s, platform moves 5.
      carrySystem.update(world, 0.1);
      playerTrans = world.getComponent(player, "Transform")!;
      expect(playerTrans.x).toBe(105); // shifted!

      // Jump off platform: set isGrounded = false, carrySystem should clear carrierEntity
      world.mutateComponent(player, "PlatformerGroundState", (g) => {
        g.isGrounded = false;
      });
      carrySystem.update(world, 0.1);
      playerGround = world.getComponent(player, "PlatformerGroundState")!;
      expect(playerGround.carrierEntity).toBeUndefined();
    });
  });

  describe("Hito 10 - Cámara con look-ahead y deadzone vertical suavizada", () => {
    it("should displace smoothly ahead in horizontal movement and respect vertical deadzone", () => {
      const cameraSystem = new Camera2DSystem();

      const screenConfig = { width: 800, height: 600 };
      world.setResource("ScreenConfig", screenConfig);

      const player = world.createEntity();
      world.addComponent(player, { type: "Tag", tags: ["Player"] });
      world.addComponent(player, {
        type: "Transform",
        x: 400,
        y: 300,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 400,
        worldY: 300,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });
      // Player moving fast to the right
      world.addComponent(player, { type: "Velocity", vx: 200, vy: 0, angularVelocity: 0 });

      const camera = world.createEntity();
      world.addComponent(camera, {
        type: "Camera2D",
        zoom: 1.0,
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        followEntity: player,
        lookAheadX: 100,
        smoothingX: 5.0,
        smoothingY: 5.0,
        verticalDeadzone: 50
      });

      // Update camera. Player is at 400 moving right. Target centerX = 400 + 100 = 500.
      // Screen width is 800, so target top-left X = 500 - 400 = 100.
      cameraSystem.update(world, 0.1);

      let cam = world.getComponent(camera, "Camera2D")!;
      // Expected target top-left X is 100. Smooth convergence from x=0:
      // t = 1 - exp(-5 * 0.1) = 1 - exp(-0.5) = 1 - 0.6065 = 0.3935
      // x should be around 0 + 100 * 0.3935 = 39.35
      expect(cam.x).toBeCloseTo(39.35, 1);
      // y target is centered (300 - 300 = 0), so it should stay at 0.
      expect(cam.y).toBe(0);

      // Now, test vertical deadzone. Player jumps slightly to y = 320.
      // Camera center is cam.y + 300 = 300. Distance is 20 < deadzone (50).
      // Camera y target shouldn't change from 0.
      world.mutateComponent(player, "Transform", (t) => {
        t.y = 320;
      });
      cameraSystem.update(world, 0.1);
      cam = world.getComponent(camera, "Camera2D")!;
      expect(cam.y).toBe(0); // within deadzone, no Y camera motion!

      // Player jumps high to y = 400.
      // Distance is 100 > deadzone (50). Excess is 50.
      // Camera Y target moves to 50. Camera y should converge smoothly towards 50.
      world.mutateComponent(player, "Transform", (t) => {
        t.y = 400;
      });
      cameraSystem.update(world, 0.1);
      cam = world.getComponent(camera, "Camera2D")!;
      // Converges smoothly!
      expect(cam.y).toBeGreaterThan(0);
      expect(cam.y).toBeLessThan(50);
    });
  });

  describe("Hito 11 - Hitbox / Hurtbox Separados", () => {
    it("should process triggers between hitbox/hurtbox child entities and emit a single damage event", () => {
      const collisionSystem = new CollisionSystem2D();
      const hitDetectionSystem = new HitDetectionSystem();
      const hierarchySystem = new HierarchySystem();

      // Setup Collision Layers bitflags
      const HITBOX_LAYER = 1 << 3;
      const HURTBOX_LAYER = 1 << 4;

      // Attacker Entity
      const attacker = world.createEntity();
      world.addComponent(attacker, {
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
        dirty: true
      });

      // Hitbox Child Entity
      const hitbox = world.createEntity();
      world.addComponent(hitbox, {
        type: "Transform",
        x: 10, // offset from parent
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 10,
        worldY: 0,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: true,
        parentEntity: attacker
      });
      world.addComponent(hitbox, {
        type: "Collider",
        shape: { type: ShapeType.Box, width: 20, height: 20 } as BoxShape,
        layer: HITBOX_LAYER,
        mask: HURTBOX_LAYER,
        enabled: true,
        isTrigger: true
      });
      world.addComponent(hitbox, { type: "CollisionEvents", collisions: [], activeTriggers: [], triggersEntered: [], triggersExited: [] });
      world.addComponent(hitbox, { type: "Hitbox", hitEntities: [] });

      // Victim Entity
      const victim = world.createEntity();
      world.addComponent(victim, {
        type: "Transform",
        x: 125,
        y: 100,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 125,
        worldY: 100,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: true
      });

      // Hurtbox Child Entity
      const hurtbox = world.createEntity();
      world.addComponent(hurtbox, {
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
        dirty: true,
        parentEntity: victim
      });
      world.addComponent(hurtbox, {
        type: "Collider",
        shape: { type: ShapeType.Box, width: 20, height: 20 } as BoxShape,
        layer: HURTBOX_LAYER,
        mask: HITBOX_LAYER,
        enabled: true,
        isTrigger: true
      });
      world.addComponent(hurtbox, { type: "CollisionEvents", collisions: [], activeTriggers: [], triggersEntered: [], triggersExited: [] });
      world.addComponent(hurtbox, { type: "Hurtbox" });

      // Run Hierarchy System to position child entities correctly
      // Hitbox worldX should become: attacker.x (100) + offset.x (10) = 110.
      // Hurtbox worldX should become: victim.x (125) + offset.x (0) = 125.
      hierarchySystem.update(world, 0.1);

      const hbTrans = world.getComponent(hitbox, "Transform")!;
      expect(hbTrans.worldX).toBe(110);

      // Listen for hitbox hit events
      let hitEventsCount = 0;
      let attackerId: any = null;
      let victimId: any = null;

      const eventBus = world.getEventBus();
      eventBus.on("hitbox:hit", (event: any) => {
        hitEventsCount++;
        attackerId = event.attacker;
        victimId = event.victim;
      });

      // Run Collision System to detect trigger overlap between Hitbox (x=110, w=20) and Hurtbox (x=125, w=20)
      collisionSystem.update(world, 0.1);

      // Run Hit Detection System to process trigger events
      hitDetectionSystem.update(world, 0.1);
      eventBus.flushDeferred();

      expect(hitEventsCount).toBe(1);
      expect(attackerId).toBe(attacker);
      expect(victimId).toBe(victim);

      // Run systems again - since the overlap persists, the hit shouldn't re-trigger (single-hit filter)
      collisionSystem.update(world, 0.1);
      hitDetectionSystem.update(world, 0.1);
      expect(hitEventsCount).toBe(1); // Still exactly 1 hit event!

      // Deactivate Hitbox by setting enabled = false
      world.mutateComponent(hitbox, "Collider", (col) => {
        col.enabled = false;
      });

      // Verify that after deactivation, it no longer triggers collisions/events
      collisionSystem.update(world, 0.1);
      hitDetectionSystem.update(world, 0.1);
      expect(hitEventsCount).toBe(1); // No new hits
    });
  });
});
