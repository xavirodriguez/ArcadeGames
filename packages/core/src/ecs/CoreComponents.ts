import { Component, ComponentRegistry } from "./Component";
import { Entity } from "./Entity";
import { Shape } from "../physics/shapes/Shapes";
import { CollisionLayer, CollisionMask, Collision } from "../physics/collision/CollisionTypes";
import { World } from "./World";

/** @public */
export interface TransformComponent extends Component {
  /** Component discriminator type. */
  type: "Transform";
  /** Local X position. */
  x: number;
  /** Local Y position. */
  y: number;
  /** Local rotation in radians. */
  rotation: number;
  /** Local X scale factor. */
  scaleX: number;
  /** Local Y scale factor. */
  scaleY: number;
  /** World-space X position computed by hierarchy system. */
  worldX: number;
  /** World-space Y position computed by hierarchy system. */
  worldY: number;
  /** World-space rotation in radians. */
  worldRotation: number;
  /** World-space X scale factor. */
  worldScaleX: number;
  /** World-space Y scale factor. */
  worldScaleY: number;
  /** Whether transform matrix is dirty and needs recalculation. */
  dirty: boolean;
  /** Optional parent entity ID in spatial hierarchy. */
  parentEntity?: Entity;
}

/** @public */
export interface VelocityComponent extends Component {
  /** Component discriminator type. */
  type: "Velocity";
  /** X linear velocity. */
  vx: number;
  /** Y linear velocity. */
  vy: number;
  /** Angular velocity in radians per second. */
  angularVelocity: number;
}

/** @public */
export interface FrictionComponent extends Component {
  /** Component discriminator type. */
  type: "Friction";
  /** Linear friction coefficient. */
  value: number;
}

/** @public */
export interface BoundaryComponent extends Component {
  /** Component discriminator type. */
  type: "Boundary";
  /** Boundary width. */
  width: number;
  /** Boundary height. */
  height: number;
  /** Boundary behavior mode when entity leaves bounds. */
  mode: "wrap" | "bounce" | "destroy";
  /** Whether to bounce on the X axis when mode is "bounce". Defaults to true. */
  bounceX?: boolean;
  /** Whether to bounce on the Y axis when mode is "bounce". Defaults to true. */
  bounceY?: boolean;
}

/** @public */
export interface TTLComponent extends Component {
  /** Component discriminator type. */
  type: "TTL";
  /**
   * @deprecated Use `TTLComponent.remaining` instead.
   */
  timeLeft: number;
  /** Remaining time to live in seconds. */
  remaining: number;
  /** Optional event emitted when TTL expires. */
  onCompleteEvent?: string;
}

/**
 * Context provided when releasing an entity back to a pool.
 * @public
 */
export interface ReleaseContext<
  TWorld extends World = World,
> {
  /** Target ECS World reference. */
  world: TWorld;
  /** Entity ID being released. */
  entity: Entity;
}

/**
 * Extended release context for component-set pools.
 * @public
 */
export interface ComponentSetReleaseContext<
  T extends Record<string, Component>,
  TWorld extends World = World,
> extends ReleaseContext<TWorld> {
  /** Optional pooled component container structure. */
  container?: T;
}

/**
 * Component marking pooled entities that can be reclaimed.
 * @public
 */
export interface ReclaimableComponent<TWorld extends World = World> extends Component {
  /** Component discriminator type. */
  type: "Reclaimable";
  /** Name of the pool. */
  poolName: string;
  /** ID of the pool. */
  poolId: string;
  /** Callback fired when entity is reclaimed. */
  onReclaim?: (context: ReleaseContext<TWorld>) => void;
}

/**
 * Interface for object pools releasing entity structures.
 * @public
 */
export interface IEntityPool {
  /** Releases an entity using the given release context. */
  release(context: ReleaseContext): void;
}

/** @public */
export interface RenderComponent extends Component {
  /** Component discriminator type. */
  type: "Render";
  /** Optional sprite identifier for rendering. */
  spriteId?: string;
  /** Optional fill or stroke color string. */
  color?: string;
  /** Whether the entity is visible for rendering. */
  visible: boolean;
  /** Opacity transparency value between 0.0 and 1.0. */
  opacity: number;
  /** Z-index sorting order. */
  order: number;
  /** Rotation angle in radians. */
  rotation: number;
  /** Angular velocity in radians per second. */
  angularVelocity: number;
  /** Remaining frames for hit flash visual effect. */
  hitFlashFrames: number;
  /** Primitive shape descriptor if no sprite ID is set. */
  shape?: string;
  /** Base rendering scale size or radius. */
  size?: number;
}

/** @public */
export interface HealthComponent extends Component {
  /** Component discriminator type. */
  type: "Health";
  /** Current health points. */
  current: number;
  /** Maximum health capacity. */
  max: number;
  /** Remaining invulnerability duration in seconds. */
  invulnerableRemaining?: number;
}

/** @public */
export interface InputStateComponent extends Component {
  /** Component discriminator type. */
  type: "InputState";
  /** Map of active analog axes and their normalized positions. */
  axes: Record<string, number>;
  /** Map of active button action states. */
  buttons: Record<string, boolean>;
}

/** @public */
export interface AnimationDefinition {
  /** Sequence of sprite frame indices. */
  frames: number[];
  /** Playback frame rate in frames per second. */
  frameRate: number;
  /** Whether animation loops indefinitely. */
  loop?: boolean;
  /** Optional event key triggered when non-looping animation completes. */
  onCompleteEvent?: string;
}

/** @public */
export interface AnimatorComponent extends Component {
  /** Component discriminator type. */
  type: "Animator";
  /** Whether animation playback is currently active. */
  isPlaying: boolean;
  /** Map of registered animation definitions by name. */
  animations: Record<string, AnimationDefinition>;
  /** Name of active animation clip. */
  current: string | null;
  /** Accumulated frame duration elapsed. */
  elapsed: number;
  /** Current active animation frame index. */
  frame: number;
}

/** @public */
export interface StateMachineComponent extends Component {
  /** Component discriminator type. */
  type: "StateMachine";
  /** Name of the current active FSM state. */
  currentState: string;
  /** Time elapsed in seconds within current state. */
  elapsedInState: number;
  /** State machine context data storage. */
  data: Record<string, unknown>;
  /** Identifier matching the state machine definition. */
  machineId: string;
  /** Total elapsed time in milliseconds across states. */
  elapsedMs: number;
  /** Name of the previous state, if any. */
  previousState?: string;
}

/** @public */
export interface ParticleEmitterConfig {
  /** Particle type descriptor. */
  type: string;
  /** X origin coordinate. */
  x: number;
  /** Y origin coordinate. */
  y: number;
  /** Total particle count per burst or cycle. */
  count: number;
  /** Whether particles are spawned as a single burst. */
  burst?: boolean;
  /** Spawn rate in particles per second. */
  rate: number;
  /** Angle emission range in radians [min, max]. */
  angle?: [number, number];
  /** Emission speed range [min, max]. */
  speed?: [number, number];
  /** Particle lifetime duration range in seconds [min, max]. */
  lifetime?: [number, number];
  /** Particle render size range [min, max]. */
  size?: [number, number];
  /** Color string or palette of color strings. */
  color?: string | string[];
  /** Spawn offset bounding area. */
  position?: [number, number, number, number] | {x: number, y: number};
  /** Whether the emitter loops continuously. */
  loop?: boolean;
}

/** @public */
export interface ParticleEmitterComponent extends Component {
  /** Component discriminator type. */
  type: "ParticleEmitter";
  /** Emitter configuration parameters. */
  config: ParticleEmitterConfig;
  /** Whether emission is currently active. */
  active: boolean | number;
  /** Accumulated emission time elapsed. */
  elapsed: number;
}

/** @public */
export interface TileDefinition {
  /** Whether the tile is solid for physical collisions. */
  solid: boolean;
  /** Whether the tile is a one-way platform. */
  oneWay: boolean;
  /** Optional friction coefficient override. */
  friction?: number;
  /** Optional bounciness coefficient. */
  bounce?: number;
  /** Optional damage inflicted upon contact. */
  damage?: number;
  /** Tile functional classification. */
  kind?: "normal" | "ice" | "spike" | "bounce";
}

/** @public */
export interface TilemapComponent extends Component {
  /** Component discriminator type. */
  type: "Tilemap";
  /** 2D grid matrix of tile IDs. */
  data: number[][];
  /** Tile width/height dimensions in pixels. */
  tileSize: number;
  /** Visible tile range coordinates. */
  visibleRange?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  /** Mapping of tile IDs to definitions. */
  tileDefinitions?: Record<number, TileDefinition>;
}

/** @public */
export interface PlatformerMovementConfigComponent extends Component {
  /** Component discriminator type. */
  type: "PlatformerMovementConfig";
  /** Ground acceleration rate. */
  acceleration: number;
  /** Maximum horizontal movement speed. */
  maxSpeed: number;
  /** Ground deceleration rate. */
  deceleration: number;
  /** Air acceleration rate. */
  airAcceleration: number;
  /** Air deceleration rate. */
  airDeceleration: number;
}

/** @public */
export interface PlatformerInputComponent extends Component {
  /** Component discriminator type. */
  type: "PlatformerInput";
  /** Horizontal movement direction (-1, 0, 1). */
  moveDir: number;
  /** Whether jump was pressed this frame. */
  jumpPressed: boolean;
  /** Whether jump button is currently held. */
  jumpHeld: boolean;
  /** Whether jump button was released this frame. */
  jumpReleased: boolean;
}

/** @public */
export interface PlatformerGravityConfigComponent extends Component {
  /** Component discriminator type. */
  type: "PlatformerGravityConfig";
  /** Upward jump rising gravity scale. */
  riseGravity: number;
  /** Downward falling gravity scale. */
  fallGravity: number;
  /** Initial impulse jump velocity. */
  jumpVelocity: number;
  /** Minimum jump velocity for short hops. */
  minJumpVelocity: number;
  /** Vertical velocity threshold near jump apex. */
  apexThreshold?: number;
  /** Gravity reduction multiplier near jump apex. */
  apexGravityMultiplier?: number;
}

/** @public */
export interface PlatformerJumperComponent extends Component {
  /** Component discriminator type. */
  type: "PlatformerJumper";
  /** Remaining coyote time duration. */
  coyoteTimer: number;
  /** Remaining jump buffer duration. */
  jumpBufferTimer: number;
  /** Maximum coyote time allowed after leaving ground. */
  coyoteTimeMax: number;
  /** Maximum jump buffer window duration. */
  jumpBufferMax: number;
}

/** @public */
export interface PlatformerGroundStateComponent extends Component {
  /** Component discriminator type. */
  type: "PlatformerGroundState";
  /** Whether entity is currently standing on solid ground. */
  isGrounded: boolean;
  /** Optional friction modifier on ice ground. */
  iceMultiplier?: number;
  /** Optional carrier entity ID (e.g. moving platform). */
  carrierEntity?: Entity;
}

/** @public */
export interface Camera2DComponent extends Component {
  /** Component discriminator type. */
  type: "Camera2D";
  /** Camera zoom magnification level. */
  zoom: number;
  /** Target focus X coordinate. */
  targetX: number;
  /** Target focus Y coordinate. */
  targetY: number;
  /** Whether this is the main active viewport camera. */
  isMain?: boolean;
  /** Current camera viewport center X. */
  x: number;
  /** Current camera viewport center Y. */
  y: number;
  /** Target entity to follow. */
  followEntity?: Entity;
  /** Horizontal lookahead offset distance. */
  lookAheadX?: number;
  /** Horizontal position smoothing factor. */
  smoothingX?: number;
  /** Vertical position smoothing factor. */
  smoothingY?: number;
  /** Vertical deadzone box height. */
  verticalDeadzone?: number;
}

/** @public */
export interface MovingPlatformComponent extends Component {
  /** Component discriminator type. */
  type: "MovingPlatform";
  /** Motion pattern type. */
  pattern: "sine";
  /** Origin start X position. */
  startX: number;
  /** Origin start Y position. */
  startY: number;
  /** Horizontal oscillation amplitude. */
  amplitudeX: number;
  /** Vertical oscillation amplitude. */
  amplitudeY: number;
  /** Oscillation frequency rate. */
  frequency: number;
  /** Total elapsed motion time. */
  elapsed: number;
}

/** @public */
export interface HitboxComponent extends Component {
  /** Component discriminator type. */
  type: "Hitbox";
  /** List of entities already hit in current attack cycle. */
  hitEntities?: Entity[];
}

/** @public */
export interface HurtboxComponent extends Component {
  /** Component discriminator type. */
  type: "Hurtbox";
}

/** @public */
export interface ScreenShakeComponent extends Component {
  /** Component discriminator type. */
  type: "ScreenShake";
  /** Shake displacement intensity. */
  intensity: number;
  /** Total shake duration. */
  duration: number;
  /** Remaining shake duration. */
  remaining: number;
}

/** @public */
export interface VisualOffsetComponent extends Component {
  /** Component discriminator type. */
  type: "VisualOffset";
  /** Render offset X. */
  offsetX: number;
  /** Render offset Y. */
  offsetY: number;
}

/** @public */
export interface SpatialNodeComponent extends Component {
  /** Component discriminator type. */
  type: "SpatialNode";
  /** Spatial grid cell X. */
  gridX: number;
  /** Spatial grid cell Y. */
  gridY: number;
  /** Whether spatial node is active. */
  active?: boolean;
}

/** @public */
export interface DeadComponent extends Component {
  /** Component discriminator type. */
  type: "Dead";
}

/** @public */
export interface HapticRequestComponent<TPattern extends string = string> extends Component {
  /** Component discriminator type. */
  type: "HapticRequest";
  /** Vibration pattern name or string. */
  pattern: TPattern;
  /** Vibration intensity scaling. */
  intensity?: number;
}

/** @public */
export interface JuiceAnimation {
  /** Animation type descriptor. */
  type: string;
  /** Target component property key. */
  property?: string;
  /** Total animation duration in seconds. */
  duration: number;
  /** Elapsed duration in seconds. */
  elapsed: number;
  /** Target end value. */
  target?: number;
  /** Initial starting value. */
  startValue?: number;
  /** Ending value. */
  endValue?: number;
  /** Delay before animation starts in seconds. */
  delay?: number;
  /** Easing function name. */
  easing?: string;
  /** Repeat count or infinity option. */
  repeat?: number;
}

/** @public */
export interface JuiceComponent extends Component {
  /** Component discriminator type. */
  type: "Juice";
  /** Whether juice animations are active. */
  active: boolean;
  /** List of active juice animation clips. */
  animations: JuiceAnimation[];
}

/** @public */
export interface CollisionEventsComponent extends Component {
  /** Component discriminator type. */
  type: "CollisionEvents";
  /** List of active physical collision encounters. */
  collisions: Collision[];
  /** Active trigger overlap entities. */
  activeTriggers: Entity[];
  /** Entities that entered triggers this frame. */
  triggersEntered: Entity[];
  /** Entities that exited triggers this frame. */
  triggersExited: Entity[];
}

/** @public */
export interface ColliderComponent extends Component {
  /** Component discriminator type. */
  type: "Collider";
  /** Collider geometric shape. */
  shape: Shape;
  /** Collision layer bitfield. */
  layer: CollisionLayer;
  /** Collision mask bitfield. */
  mask: CollisionMask;
  /** Whether collider is active. */
  enabled: boolean;
  /** Whether collider acts as a trigger sensor. */
  isTrigger: boolean;
  /** Center offset X. */
  offsetX?: number;
  /** Center offset Y. */
  offsetY?: number;
}

/** @public */
export interface SpriteComponent extends Component {
  /** Component discriminator type. */
  type: "Sprite";
  /** Texture atlas ID. */
  textureId?: string;
  /** Asset key descriptor. */
  assetKey?: string;
  /** Source rectangle frame coordinates. */
  srcRect?: { x: number; y: number; w: number; h: number };
  /** Anchor pivot normalized position (0.5 = center). */
  anchor?: { x: number; y: number };
  /** Whether sprite is horizontally flipped. */
  flipX?: boolean;
  /** Whether sprite is vertically flipped. */
  flipY?: boolean;
  /** Color tint applied to sprite. */
  tint?: string;
}

/** @public */
export interface TrailComponent extends Component {
  /** Component discriminator type. */
  type: "Trail";
  /** History point trajectory coordinates. */
  points: {x: number, y: number}[];
  /** Maximum length capacity of trail points. */
  maxLength: number;
  /** Current buffer head index. */
  currentIndex: number;
  /** Point count stored in trail. */
  count: number;
}

/** @public */
export interface IHierarchicalComponent extends Component {
  /** Parent entity ID. */
  parentEntity?: Entity;
  /** List of child entity IDs. */
  children: Entity[];
}

/** @public */
export interface Collider2DComponent extends Component {
  /** Component discriminator type. */
  type: "Collider2D";
  /** Simple 2D geometric shape description. */
  shape: { type: "circle"; radius: number } | { type: "aabb"; halfWidth: number; halfHeight: number };
  /** Collision layer bit. */
  layer: number;
  /** Collision mask bitfield. */
  mask: number;
  /** Center offset X. */
  offsetX: number;
  /** Center offset Y. */
  offsetY: number;
  /** Whether collider is a trigger sensor. */
  isTrigger: boolean;
  /** Whether collider is enabled. */
  enabled: boolean;
}

/**
 * Registry map of standard core components used in the framework.
 * @public
 */
export interface CoreComponentRegistry extends ComponentRegistry {
  /** Transform component. */
  Transform: TransformComponent;
  /** Velocity component. */
  Velocity: VelocityComponent;
  /** Friction component. */
  Friction: FrictionComponent;
  /** Boundary component. */
  Boundary: BoundaryComponent;
  /** Time to live component. */
  TTL: TTLComponent;
  /** Reclaimable component. */
  Reclaimable: ReclaimableComponent;
  /** Render component. */
  Render: RenderComponent;
  /** Health component. */
  Health: HealthComponent;
  /** Input state component. */
  InputState: InputStateComponent;
  /** Animator component. */
  Animator: AnimatorComponent;
  /** State machine component. */
  StateMachine: StateMachineComponent;
  /** Particle emitter component. */
  ParticleEmitter: ParticleEmitterComponent;
  /** Tilemap component. */
  Tilemap: TilemapComponent;
  /** Camera 2D component. */
  Camera2D: Camera2DComponent;
  /** Screen shake component. */
  ScreenShake: ScreenShakeComponent;
  /** Visual offset component. */
  VisualOffset: VisualOffsetComponent;
  /** Spatial node component. */
  SpatialNode: SpatialNodeComponent;
  /** Haptic request component. */
  HapticRequest: HapticRequestComponent<string>;
  /** Juice component. */
  Juice: JuiceComponent;
  /** Collision events component. */
  CollisionEvents: CollisionEventsComponent;
  /** Collider component. */
  Collider: ColliderComponent;
  /** Dead tag component. */
  Dead: DeadComponent;
  /** Collider 2D component. */
  Collider2D: Collider2DComponent;
  /** Trail component. */
  Trail: TrailComponent;
  /** Sprite component. */
  Sprite: SpriteComponent;
  /** Tag component. */
  Tag: import("./TagComponent").TagComponent;
  /** Faction component. */
  Faction: import("../ai/FactionComponent").FactionComponent;
  /** Steering component. */
  Steering: import("../ai/SteeringComponent").SteeringComponent;
  /** Platformer movement config. */
  PlatformerMovementConfig: PlatformerMovementConfigComponent;
  /** Platformer input component. */
  PlatformerInput: PlatformerInputComponent;
  /** Platformer gravity config. */
  PlatformerGravityConfig: PlatformerGravityConfigComponent;
  /** Platformer jumper component. */
  PlatformerJumper: PlatformerJumperComponent;
  /** Platformer ground state. */
  PlatformerGroundState: PlatformerGroundStateComponent;
  /** Moving platform component. */
  MovingPlatform: MovingPlatformComponent;
  /** Hitbox component. */
  Hitbox: HitboxComponent;
  /** Hurtbox component. */
  Hurtbox: HurtboxComponent;
  /** Respawn point component. */
  RespawnPoint: RespawnPointComponent;
  /** Respawnable component. */
  Respawnable: RespawnableComponent;
  /** Collectible component. */
  Collectible: CollectibleComponent;
  /** Enemy component. */
  Enemy: EnemyComponent;
  /** Patrol component. */
  Patrol: PatrolComponent;
  /** Ground detector component. */
  GroundDetector: GroundDetectorComponent;
  /** Player sensor component. */
  PlayerSensor: PlayerSensorComponent;
}

/**
 * Component representing a respawn point.
 * @public
 */
export interface RespawnPointComponent extends Component {
  /** Component discriminator type. */
  type: "RespawnPoint";
  /** X position. */
  x: number;
  /** Y position. */
  y: number;
  /** Identifier of associated checkpoint. */
  checkpointId: string;
}

/**
 * Component used to mark entities that can be destroyed and respawned.
 * It stores original spawning blueprint name and arguments.
 * @public
 */
export interface RespawnableComponent extends Component {
  /** Component discriminator type. */
  type: "Respawnable";
  /** Blueprint key used for respawning. */
  blueprintKey: string;
  /** Initial blueprint arguments. */
  initialArgs: any;
}

/**
 * Component representing a generic collectible.
 * @public
 */
export interface CollectibleComponent extends Component {
  /** Component discriminator type. */
  type: "Collectible";
  /** Collectible category or type. */
  kind: string;
  /** Value or score points awarded upon pickup. */
  value: number;
  /** Whether collectible state persists across runs. */
  persistent: boolean;
  /** Whether collectible can only be acquired once. */
  collectOnce: boolean;
  /** Unique collectible identifier. */
  id: string;
}

/**
 * Component representing an enemy.
 * @public
 */
export interface EnemyComponent extends Component {
  /** Component discriminator type. */
  type: "Enemy";
  /** Enemy archetype behavior mode. */
  kind: "patrol" | "jumper" | "charger";
}

/**
 * Component for enemies that patrol between horizontal coordinates.
 * @public
 */
export interface PatrolComponent extends Component {
  /** Component discriminator type. */
  type: "Patrol";
  /** Start X coordinate bound. */
  startX: number;
  /** End X coordinate bound. */
  endX: number;
  /** Current movement direction (-1 or 1). */
  direction: number;
  /** Patrol movement speed. */
  patrolSpeed: number;
}

/**
 * Component for horizontal ground and wall detection.
 * @public
 */
export interface GroundDetectorComponent extends Component {
  /** Component discriminator type. */
  type: "GroundDetector";
  /** Whether ground is detected ahead. */
  hasGroundAhead: boolean;
  /** Whether a wall obstacle is detected ahead. */
  hasWallAhead: boolean;
  /** Sensor offset X. */
  sensorOffsetX: number;
  /** Sensor offset Y. */
  sensorOffsetY: number;
}

/**
 * Component for players or targeting sensors.
 * @public
 */
export interface PlayerSensorComponent extends Component {
  /** Component discriminator type. */
  type: "PlayerSensor";
  /** Detection vision radius range. */
  visionRange: number;
  /** Entity ID of detected target player. */
  detectedPlayerEntity?: Entity;
}

/**
 * Interface representing the global run state for platformer progression.
 * @public
 */
export interface RunState {
  /** Current attempt counter. */
  attempt: number;
  /** Remaining lives count. */
  lives: number;
  /** ID of active checkpoint. */
  activeCheckpoint: string | null;
  /** Total elapsed time in seconds. */
  elapsedTime: number;
  /** Total death count. */
  deaths: number;
  /** IDs of collected permanent progression items. */
  collectedPermanentIds: string[];
  /** IDs of collected temporal items in current run. */
  collectedTemporalIds: string[];
}

export { Entity };
