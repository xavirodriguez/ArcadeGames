import {
  TransformComponent,
  VelocityComponent,
  EntityBuilder,
  World,
  Entity,
  CoreComponentRegistry,
  SystemPhase,
  JuiceSystem,
  ScreenShakeSystem,
  RenderUpdateSystem,
  ShapeType,
  BoxShape,
  Component
} from "@tiny-aster/core";
import { CollisionLayers } from "@tiny-aster/gameplay-kit";

/**
 * Audit of Player Blueprints Across Games:
 * ---------------------------------------
 * 1. SpaceInvadersGame:
 *    - Transform: { x, y }
 *    - Velocity: { vx: 0, vy: 0 }
 *    - Collider: CircleShape (radius: config.PLAYER_COLLIDER_RADIUS)
 *    - Gameplay: Health, Faction ("player"), Boundary, Input (moveLeft, moveRight, shoot), Combo
 *
 * 2. EchoRunnerGame:
 *    - Transform: { x, y }
 *    - Velocity: { vx: 0, vy: 0 }
 *    - Collider2D: AABB shape ({ halfWidth: 10, halfHeight: 15 })
 *    - Gameplay: Health, Hurtbox, PlatformerMovementConfig, PlatformerGravityConfig, PlatformerJumper, PlatformerGroundState
 *
 * 3. GeometryWars (Entities):
 *    - Transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1, ... }
 *    - Velocity: { vx: 0, vy: 0 }
 *    - Collider: None
 *    - Gameplay: Player (twin-stick), Aim (aimX, aimY, isFiring), Health (1)
 *
 * Conclusion:
 * `Transform` and `Velocity` share identical structural definitions across all games.
 * In contrast, `Collider` / `Collider2D` (Circle vs AABB vs Box), inputs, and gameplay
 * components vary significantly by game mechanics and must remain defined locally in each game's blueprints.
 */

/**
 * Creates a standard Transform component object initialized with default spatial properties.
 *
 * @param x - Initial X position in world space. Defaults to 0.
 * @param y - Initial Y position in world space. Defaults to 0.
 * @param options - Optional rotation (radians) and scale factors.
 * @returns Fully populated `TransformComponent`.
 * @public
 */
export function createStandardTransform(
  x = 0,
  y = 0,
  options: { rotation?: number; scaleX?: number; scaleY?: number } = {}
): TransformComponent {
  const rotation = options.rotation ?? 0;
  const scaleX = options.scaleX ?? 1;
  const scaleY = options.scaleY ?? 1;

  return {
    type: "Transform",
    x,
    y,
    rotation,
    scaleX,
    scaleY,
    worldX: x,
    worldY: y,
    worldRotation: rotation,
    worldScaleX: scaleX,
    worldScaleY: scaleY,
    dirty: false
  };
}

/**
 * Creates a standard Velocity component object initialized with default or given 2D velocity vectors.
 *
 * @param vx - Linear velocity along X axis. Defaults to 0.
 * @param vy - Linear velocity along Y axis. Defaults to 0.
 * @param angularVelocity - Angular velocity in radians per second. Defaults to 0.
 * @returns Fully populated `VelocityComponent`.
 * @public
 */
export function createStandardVelocity(
  vx = 0,
  vy = 0,
  angularVelocity = 0
): VelocityComponent {
  return {
    type: "Velocity",
    vx,
    vy,
    angularVelocity
  };
}

/**
 * Common configuration properties for platformer/runner physics.
 * @public
 */
export interface CommonPlatformerConfig {
  PLAYER_ACCEL: number;
  PLAYER_SPEED: number;
  PLAYER_DECEL: number;
  PLAYER_AIR_ACCEL: number;
  PLAYER_AIR_DECEL: number;
  PLAYER_JUMP_VEL: number;
  PLAYER_MIN_JUMP_VEL: number;
  RISE_GRAVITY: number;
  FALL_GRAVITY: number;
  APEX_THRESHOLD?: number;
  APEX_GRAVITY_MULTIPLIER?: number;
  COYOTE_TIME_MAX?: number;
  JUMP_BUFFER_MAX?: number;
  TILE_SIZE?: number;
  [key: string]: unknown;
}

/**
 * Constructs a PlatformerMovementConfig component object from a game configuration object.
 *
 * @param config - Game configuration containing platformer speed parameters.
 * @returns PlatformerMovementConfig component definition object.
 * @public
 */
export function createPlatformerMovementConfig(config: {
  PLAYER_ACCEL: number;
  PLAYER_SPEED: number;
  PLAYER_DECEL: number;
  PLAYER_AIR_ACCEL: number;
  PLAYER_AIR_DECEL: number;
}): Component & { type: string; [key: string]: unknown } {
  return {
    type: "PlatformerMovementConfig",
    acceleration: config.PLAYER_ACCEL,
    maxSpeed: config.PLAYER_SPEED,
    deceleration: config.PLAYER_DECEL,
    airAcceleration: config.PLAYER_AIR_ACCEL,
    airDeceleration: config.PLAYER_AIR_DECEL
  };
}

/**
 * Attaches common platformer movement, gravity, and ground-state components to a player entity.
 *
 * @param world - Simulation world.
 * @param entity - Entity ID.
 * @param config - Platformer physics configuration.
 * @public
 */
export function setupPlatformerMovementComponents(
  world: World<CoreComponentRegistry>,
  entity: Entity,
  config: CommonPlatformerConfig
): void {
  world.addComponent(entity, createPlatformerMovementConfig(config));
  world.addComponent(entity, {
    type: "PlatformerGravityConfig",
    riseGravity: config.RISE_GRAVITY,
    fallGravity: config.FALL_GRAVITY,
    jumpVelocity: config.PLAYER_JUMP_VEL,
    minJumpVelocity: config.PLAYER_MIN_JUMP_VEL,
    ...(config.APEX_THRESHOLD !== undefined ? { apexThreshold: config.APEX_THRESHOLD } : {}),
    ...(config.APEX_GRAVITY_MULTIPLIER !== undefined ? { apexGravityMultiplier: config.APEX_GRAVITY_MULTIPLIER } : {})
  } as { type: string; [key: string]: unknown });
  world.addComponent(entity, {
    type: "PlatformerGroundState",
    isGrounded: false,
    iceMultiplier: 1.0
  } as { type: string; [key: string]: unknown });
}

/**
 * Configures an entity with tilemap rendering and data components.
 *
 * @param world - Target simulation world.
 * @param entity - Target entity ID.
 * @param tileSize - Width/height of each grid tile in pixels.
 * @param data - 2D tile layout index array.
 * @param tileDefinitions - Tile definitions metadata dictionary.
 * @public
 */
export function setupTilemapEntity(
  world: World<CoreComponentRegistry>,
  entity: Entity,
  tileSize: number,
  data: number[][],
  tileDefinitions: unknown
): void {
  EntityBuilder.fromEntity(world, entity)
    .withTransform({ x: 0, y: 0 })
    .withRender({ shape: "tilemap", size: tileSize, order: 0 });

  world.addComponent(entity, {
    type: "Tilemap",
    data,
    tileSize,
    tileDefinitions
  } as { type: string; [key: string]: unknown });
}

/**
 * Interface representing any blueprint registry capable of registering blueprints.
 * @public
 */
export interface RegistrableBlueprintRegistry {
  register(name: string, definition: any): void;
}

/**
 * Registers the standard 'tilemap' blueprint in the provided blueprint map.
 *
 * @param blueprints - Blueprint registry instance.
 * @param defaultConfig - Fallback config containing default TILE_SIZE.
 * @public
 */
export function registerPlatformerTilemapBlueprint(
  blueprints: RegistrableBlueprintRegistry,
  defaultConfig: { TILE_SIZE: number }
): void {
  blueprints.register("tilemap", {
    spawn: (world: World<CoreComponentRegistry>, entity: Entity, args: { data: number[][]; tileDefinitions: Record<number, unknown> }) => {
      const config = world.getResource<{ TILE_SIZE: number }>("GameConfig") || defaultConfig;
      setupTilemapEntity(world, entity, config.TILE_SIZE, args.data, args.tileDefinitions);
    }
  });
}

/**
 * Configuration options for creating a main 2D follow camera entity.
 * @public
 */
export interface Camera2DOptions {
  zoom?: number;
  lookAheadX?: number;
  smoothingX?: number;
  smoothingY?: number;
  verticalDeadzone?: number;
}

/**
 * Creates and initializes a main Camera2D entity tracking a target entity.
 *
 * @param world - Simulation world.
 * @param followEntity - Target entity to track.
 * @param options - Camera tuning options.
 * @returns Spawned camera entity ID.
 * @public
 */
export function createMainCamera2D(
  world: World<CoreComponentRegistry>,
  followEntity: Entity,
  options: Camera2DOptions = {}
): Entity {
  const cameraEntity = world.createEntity();
  world.addComponent(cameraEntity, {
    type: "Camera2D",
    zoom: options.zoom ?? 1.0,
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    isMain: true,
    followEntity,
    lookAheadX: options.lookAheadX ?? 40,
    smoothingX: options.smoothingX ?? 3.5,
    smoothingY: options.smoothingY ?? 3.5,
    verticalDeadzone: options.verticalDeadzone ?? 45
  } as { type: string; [key: string]: unknown });
  return cameraEntity;
}

/**
 * Registers standard presentation systems (Juice, ScreenShake, RenderUpdate) to the world.
 *
 * @param world - Target simulation world.
 * @public
 */
export function registerPresentationSystems<TReg extends CoreComponentRegistry = CoreComponentRegistry>(
  world: World<TReg>
): void {
  world.addSystem(new JuiceSystem(), { phase: SystemPhase.Presentation });
  world.addSystem(new ScreenShakeSystem(), { phase: SystemPhase.Presentation });
  world.addSystem(new RenderUpdateSystem(), { phase: SystemPhase.Presentation });
}

/**
 * Creates a standard BoxShape collider configuration for paddle entities.
 *
 * @param width - Paddle width.
 * @param height - Paddle height.
 * @public
 */
export function createPaddleColliderConfig(width: number, height: number) {
  return {
    shape: { type: ShapeType.Box, width, height } as BoxShape,
    layer: CollisionLayers.PLAYER,
    mask: CollisionLayers.PROJECTILE
  };
}
