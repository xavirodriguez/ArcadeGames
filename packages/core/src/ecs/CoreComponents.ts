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

/** @public */
export interface ReleaseContext<
  TWorld extends World = World,
> {
  world: TWorld;
  entity: Entity;
}

/** @public */
export interface ComponentSetReleaseContext<
  T extends Record<string, Component>,
  TWorld extends World = World,
> extends ReleaseContext<TWorld> {
  container?: T;
}

/** @public */
export interface ReclaimableComponent<TWorld extends World = World> extends Component {
  type: "Reclaimable";
  poolName: string;
  poolId: string;
  onReclaim?: (context: ReleaseContext<TWorld>) => void;
}

/** @public */
export interface IEntityPool {
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
  solid: boolean;
  oneWay: boolean;
  friction?: number;
  bounce?: number;
  damage?: number;
  kind?: "normal" | "ice" | "spike" | "bounce";
}

/** @public */
export interface TilemapComponent extends Component {
  type: "Tilemap";
  data: number[][];
  tileSize: number;
  visibleRange?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  tileDefinitions?: Record<number, TileDefinition>;
}

/** @public */
export interface PlatformerMovementConfigComponent extends Component {
  type: "PlatformerMovementConfig";
  acceleration: number;
  maxSpeed: number;
  deceleration: number;
  airAcceleration: number;
  airDeceleration: number;
}

/** @public */
export interface PlatformerInputComponent extends Component {
  type: "PlatformerInput";
  moveDir: number; // -1, 0, 1
  jumpPressed: boolean;
  jumpHeld: boolean;
  jumpReleased: boolean;
}

/** @public */
export interface PlatformerGravityConfigComponent extends Component {
  type: "PlatformerGravityConfig";
  riseGravity: number;
  fallGravity: number;
  jumpVelocity: number;
  minJumpVelocity: number; // For variable jump height (short hop)
  apexThreshold?: number;
  apexGravityMultiplier?: number;
}

/** @public */
export interface PlatformerJumperComponent extends Component {
  type: "PlatformerJumper";
  coyoteTimer: number;
  jumpBufferTimer: number;
  coyoteTimeMax: number;
  jumpBufferMax: number;
}

/** @public */
export interface PlatformerGroundStateComponent extends Component {
  type: "PlatformerGroundState";
  isGrounded: boolean;
  iceMultiplier?: number;
  carrierEntity?: Entity;
}

/** @public */
export interface Camera2DComponent extends Component {
  type: "Camera2D";
  zoom: number;
  targetX: number;
  targetY: number;
  isMain?: boolean;
  x: number;
  y: number;
  followEntity?: Entity;
  lookAheadX?: number;
  smoothingX?: number;
  smoothingY?: number;
  verticalDeadzone?: number;
}

/** @public */
export interface MovingPlatformComponent extends Component {
  type: "MovingPlatform";
  pattern: "sine";
  startX: number;
  startY: number;
  amplitudeX: number;
  amplitudeY: number;
  frequency: number;
  elapsed: number;
}

/** @public */
export interface HitboxComponent extends Component {
  type: "Hitbox";
  hitEntities?: Entity[];
}

/** @public */
export interface HurtboxComponent extends Component {
  type: "Hurtbox";
}

/** @public */
export interface ScreenShakeComponent extends Component {
  type: "ScreenShake";
  intensity: number;
  duration: number;
  remaining: number;
}

/** @public */
export interface VisualOffsetComponent extends Component {
  type: "VisualOffset";
  offsetX: number;
  offsetY: number;
}

/** @public */
export interface SpatialNodeComponent extends Component {
  type: "SpatialNode";
  gridX: number;
  gridY: number;
  active?: boolean;
}

/** @public */
export interface DeadComponent extends Component {
  type: "Dead";
}

/** @public */
export interface HapticRequestComponent<TPattern extends string = string> extends Component {
  type: "HapticRequest";
  pattern: TPattern;
  intensity?: number;
}

/** @public */
export interface JuiceAnimation {
  type: string;
  property?: string;
  duration: number;
  elapsed: number;
  target?: number;
  startValue?: number;
  endValue?: number;
  delay?: number;
  easing?: string;
  repeat?: number;
}

/** @public */
export interface JuiceComponent extends Component {
    type: "Juice";
    active: boolean;
    animations: JuiceAnimation[];
}

/** @public */
export interface CollisionEventsComponent extends Component {
    type: "CollisionEvents";
    collisions: Collision[];
    activeTriggers: Entity[];
    triggersEntered: Entity[];
    triggersExited: Entity[];
}

/** @public */
export interface ColliderComponent extends Component {
  type: "Collider";
  shape: Shape;
  layer: CollisionLayer;
  mask: CollisionMask;
  enabled: boolean;
  isTrigger: boolean;
  offsetX?: number;
  offsetY?: number;
}

/** @public */
export interface SpriteComponent extends Component {
  type: "Sprite";
  textureId?: string;
  assetKey?: string;
  srcRect?: { x: number; y: number; w: number; h: number };
  anchor?: { x: number; y: number };
  flipX?: boolean;
  flipY?: boolean;
  tint?: string;
}

/** @public */
export interface TrailComponent extends Component {
    type: "Trail";
    points: {x: number, y: number}[];
    maxLength: number;
    currentIndex: number;
    count: number;
}

/** @public */
export interface IHierarchicalComponent extends Component {
    parentEntity?: Entity;
    children: Entity[];
}

/** @public */
export interface Collider2DComponent extends Component {
  type: "Collider2D";
  shape: { type: "circle"; radius: number } | { type: "aabb"; halfWidth: number; halfHeight: number };
  layer: number;
  mask: number;
  offsetX: number;
  offsetY: number;
  isTrigger: boolean;
  enabled: boolean;
}

/** @public */
export interface CoreComponentRegistry extends ComponentRegistry {
  Transform: TransformComponent;
  Velocity: VelocityComponent;
  Friction: FrictionComponent;
  Boundary: BoundaryComponent;
  TTL: TTLComponent;
  Reclaimable: ReclaimableComponent;
  Render: RenderComponent;
  Health: HealthComponent;
  InputState: InputStateComponent;
  Animator: AnimatorComponent;
  StateMachine: StateMachineComponent;
  ParticleEmitter: ParticleEmitterComponent;
  Tilemap: TilemapComponent;
  Camera2D: Camera2DComponent;
  ScreenShake: ScreenShakeComponent;
  VisualOffset: VisualOffsetComponent;
  SpatialNode: SpatialNodeComponent;
  HapticRequest: HapticRequestComponent<string>;
  Juice: JuiceComponent;
  CollisionEvents: CollisionEventsComponent;
  Collider: ColliderComponent;
  Dead: DeadComponent;
  Collider2D: Collider2DComponent;
  Trail: TrailComponent;
  Sprite: SpriteComponent;
  Tag: import("./TagComponent").TagComponent;
  Faction: import("../ai/FactionComponent").FactionComponent;
  Steering: import("../ai/SteeringComponent").SteeringComponent;
  PlatformerMovementConfig: PlatformerMovementConfigComponent;
  PlatformerInput: PlatformerInputComponent;
  PlatformerGravityConfig: PlatformerGravityConfigComponent;
  PlatformerJumper: PlatformerJumperComponent;
  PlatformerGroundState: PlatformerGroundStateComponent;
  MovingPlatform: MovingPlatformComponent;
  Hitbox: HitboxComponent;
  Hurtbox: HurtboxComponent;
  RespawnPoint: RespawnPointComponent;
  Respawnable: RespawnableComponent;
  Collectible: CollectibleComponent;
  Enemy: EnemyComponent;
  Patrol: PatrolComponent;
  GroundDetector: GroundDetectorComponent;
  PlayerSensor: PlayerSensorComponent;
}

/**
 * Component representing a respawn point.
 * @public
 */
export interface RespawnPointComponent extends Component {
  type: "RespawnPoint";
  x: number;
  y: number;
  checkpointId: string;
}

/**
 * Component used to mark entities that can be destroyed and respawned.
 * It stores original spawning blueprint name and arguments.
 * @public
 */
export interface RespawnableComponent extends Component {
  type: "Respawnable";
  blueprintKey: string;
  initialArgs: any;
}

/**
 * Component representing a generic collectible.
 * @public
 */
export interface CollectibleComponent extends Component {
  type: "Collectible";
  kind: string;
  value: number;
  persistent: boolean;
  collectOnce: boolean;
  id: string;
}

/**
 * Component representing an enemy.
 * @public
 */
export interface EnemyComponent extends Component {
  type: "Enemy";
  kind: "patrol" | "jumper" | "charger";
}

/**
 * Component for enemies that patrol between horizontal coordinates.
 * @public
 */
export interface PatrolComponent extends Component {
  type: "Patrol";
  startX: number;
  endX: number;
  direction: number; // -1 or 1
  patrolSpeed: number;
}

/**
 * Component for horizontal ground and wall detection.
 * @public
 */
export interface GroundDetectorComponent extends Component {
  type: "GroundDetector";
  hasGroundAhead: boolean;
  hasWallAhead: boolean;
  sensorOffsetX: number;
  sensorOffsetY: number;
}

/**
 * Component for players or targeting sensors.
 * @public
 */
export interface PlayerSensorComponent extends Component {
  type: "PlayerSensor";
  visionRange: number;
  detectedPlayerEntity?: Entity;
}

/**
 * Interface representing the global run state for platformer progression.
 * @public
 */
export interface RunState {
  attempt: number;
  lives: number;
  activeCheckpoint: string | null;
  elapsedTime: number;
  deaths: number;
  collectedPermanentIds: string[];
  collectedTemporalIds: string[];
}

export { Entity };
