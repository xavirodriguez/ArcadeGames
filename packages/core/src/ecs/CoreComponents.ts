import { Component, ComponentRegistry } from "./Component";
import { Entity } from "./Entity";
import { Shape } from "../physics/shapes/Shapes";
import { CollisionLayer, CollisionMask, Collision } from "../physics/collision/CollisionTypes";
import { World } from "./World";

/** @public */
export interface TransformComponent extends Component {
  type: "Transform";
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  worldX: number;
  worldY: number;
  worldRotation: number;
  worldScaleX: number;
  worldScaleY: number;
  dirty: boolean;
  parentEntity?: Entity;
}

/** @public */
export interface VelocityComponent extends Component {
  type: "Velocity";
  vx: number;
  vy: number;
  angularVelocity: number;
}

/** @public */
export interface FrictionComponent extends Component {
  type: "Friction";
  value: number;
}

/** @public */
export interface BoundaryComponent extends Component {
  type: "Boundary";
  width: number;
  height: number;
  mode: "wrap" | "bounce" | "destroy";
  /**
   * Whether to bounce on the X axis when mode is "bounce". Defaults to true.
   */
  bounceX?: boolean;
  /**
   * Whether to bounce on the Y axis when mode is "bounce". Defaults to true.
   */
  bounceY?: boolean;
}

/** @public */
export interface TTLComponent extends Component {
  type: "TTL";
  /**
   * @deprecated Use {@link TTLComponent.remaining} instead.
   */
  timeLeft: number;
  remaining: number;
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
  type: "Render";
  spriteId?: string;
  color?: string;
  visible: boolean;
  opacity: number;
  order: number;
  rotation: number;
  angularVelocity: number;
  hitFlashFrames: number;
  shape?: string;
  size?: number;
}

/** @public */
export interface HealthComponent extends Component {
  type: "Health";
  current: number;
  max: number;
  invulnerableRemaining?: number;
}

/** @public */
export interface InputStateComponent extends Component {
  type: "InputState";
  axes: Record<string, number>;
  buttons: Record<string, boolean>;
}

/** @public */
export interface AnimationDefinition {
  frames: number[];
  frameRate: number;
  loop?: boolean;
  onCompleteEvent?: string;
}

/** @public */
export interface AnimatorComponent extends Component {
  type: "Animator";
  isPlaying: boolean;
  animations: Record<string, AnimationDefinition>;
  current: string | null;
  elapsed: number;
  frame: number;
}

/** @public */
export interface StateMachineComponent extends Component {
  type: "StateMachine";
  currentState: string;
  elapsedInState: number;
  data: Record<string, unknown>;
  machineId: string;
  elapsedMs: number;
  previousState?: string;
}

/** @public */
export interface ParticleEmitterConfig {
    type: string;
    x: number;
    y: number;
    count: number;
    burst?: boolean;
    rate: number;
    angle?: [number, number];
    speed?: [number, number];
    lifetime?: [number, number];
    size?: [number, number];
    color?: string | string[];
    position?: [number, number, number, number] | {x: number, y: number};
    loop?: boolean;
}

/** @public */
export interface ParticleEmitterComponent extends Component {
  type: "ParticleEmitter";
  config: ParticleEmitterConfig;
  active: boolean | number;
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
