import { Component, ComponentRegistry } from "./Component";
import { Entity } from "./Entity";
import { Shape } from "../physics/shapes/Shapes";
import { CollisionLayer, CollisionMask, Collision } from "../physics/collision/CollisionTypes";
import { World } from "./World";

/**
 * Component storing 2D spatial position, rotation, scale, and hierarchical world-space transforms.
 *
 * @example
 * ```ts
 * const transform: TransformComponent = {
 *   type: "Transform",
 *   x: 100,
 *   y: 150,
 *   rotation: 0,
 *   scaleX: 1,
 *   scaleY: 1,
 *   worldX: 100,
 *   worldY: 150,
 *   worldRotation: 0,
 *   worldScaleX: 1,
 *   worldScaleY: 1,
 *   dirty: false
 * };
 * world.addComponent(entity, transform);
 * ```
 *
 * @public
 */
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

/**
 * Component storing linear velocity vector and angular velocity.
 *
 * @example
 * ```ts
 * const velocity: VelocityComponent = {
 *   type: "Velocity",
 *   vx: 50,
 *   vy: -20,
 *   angularVelocity: 0.5
 * };
 * world.addComponent(entity, velocity);
 * ```
 *
 * @public
 */
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

/**
 * Component applying linear motion damping over time.
 *
 * @example
 * ```ts
 * const friction: FrictionComponent = {
 *   type: "Friction",
 *   value: 0.98
 * };
 * world.addComponent(entity, friction);
 * ```
 *
 * @public
 */
export interface FrictionComponent extends Component {
  /** Component discriminator type. */
  type: "Friction";
  /** Linear friction coefficient. */
  value: number;
}

/**
 * Component specifying playfield boundary constraints and out-of-bounds behavior.
 *
 * @example
 * ```ts
 * const boundary: BoundaryComponent = {
 *   type: "Boundary",
 *   width: 800,
 *   height: 600,
 *   mode: "wrap"
 * };
 * world.addComponent(entity, boundary);
 * ```
 *
 * @public
 */
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
  /** Minimum X boundary coordinate for wrap/destroy modes. */
  minX?: number;
  /** Maximum X boundary coordinate for wrap/destroy modes. */
  maxX?: number;
  /** Minimum Y boundary coordinate for wrap/destroy modes. */
  minY?: number;
  /** Maximum Y boundary coordinate for wrap/destroy modes. */
  maxY?: number;
}

/** @public */
export interface TTLComponent extends Component {
  /** Component discriminator type. */
  type: "TTL";
  /**
   * Remaining time to live in seconds.
   *
   * @deprecated Standardized component properties use `remaining`. Use {@link TTLComponent.remaining} instead.
   *
   * @example
   * ```ts
   * // Before (deprecated)
   * const time = ttl.timeLeft;
   *
   * // After
   * const time = ttl.remaining;
   * ```
   */
  timeLeft: number;
  /** Remaining time to live in seconds. */
  remaining: number;
  /** Optional event emitted when TTL expires. */
  onCompleteEvent?: string;
}

/**
 * Context provided when releasing an entity back to an object pool.
 *
 * @example
 * ```ts
 * const context: ReleaseContext = {
 *   world,
 *   entity: 42
 * };
 * pool.release(context);
 * ```
 *
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
 * Extended release context for component-set pools holding pre-allocated component containers.
 *
 * @example
 * ```ts
 * const context: ComponentSetReleaseContext<MyComponentSet> = {
 *   world,
 *   entity: 42,
 *   container: mySet
 * };
 * pool.release(context);
 * ```
 *
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
 * Component marking pooled entities that can be reclaimed by an object pool.
 *
 * @remarks
 * Managed by pooling systems to track recycled entity IDs and fire release callbacks.
 *
 * @example
 * ```ts
 * const reclaimable: ReclaimableComponent = {
 *   type: "Reclaimable",
 *   poolName: "bullets",
 *   poolId: "bullet-pool-1",
 *   onReclaim: ({ world, entity }) => {
 *     world.removeEntity(entity);
 *   }
 * };
 * world.addComponent(entity, reclaimable);
 * ```
 *
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
 *
 * @remarks
 * Implementations handle returning entities and associated components to reusable pools.
 *
 * @example
 * ```ts
 * class BulletPool implements IEntityPool {
 *   release(context: ReleaseContext): void {
 *     context.world.removeEntity(context.entity);
 *   }
 * }
 * ```
 *
 * @public
 */
export interface IEntityPool {
  /**
   * Releases an entity using the given release context.
   *
   * @param context - The release context containing world and entity target.
   */
  release(context: ReleaseContext): void;
}

/**
 * Component managing visual rendering parameters including visibility, color, opacity, Z-order, and hit flash effects.
 *
 * @example
 * ```ts
 * const render: RenderComponent = {
 *   type: "Render",
 *   visible: true,
 *   opacity: 1.0,
 *   order: 0,
 *   rotation: 0,
 *   angularVelocity: 0,
 *   hitFlashFrames: 0,
 *   color: "#ff0000",
 *   size: 16
 * };
 * world.addComponent(entity, render);
 * ```
 *
 * @public
 */
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

/**
 * Component tracking entity health points, maximum capacity, and temporary invulnerability duration.
 *
 * @example
 * ```ts
 * const health: HealthComponent = {
 *   type: "Health",
 *   current: 100,
 *   max: 100
 * };
 * world.addComponent(entity, health);
 * ```
 *
 * @public
 */
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

/**
 * Component storing snapshot input state mapping analog axes and button actions.
 *
 * @example
 * ```ts
 * const inputState: InputStateComponent = {
 *   type: "InputState",
 *   axes: { moveX: 1.0, moveY: 0.0 },
 *   buttons: { shoot: true, jump: false }
 * };
 * world.addComponent(entity, inputState);
 * ```
 *
 * @public
 */
export interface InputStateComponent extends Component {
  /** Component discriminator type. */
  type: "InputState";
  /** Map of active analog axes and their normalized positions. */
  axes: Record<string, number>;
  /** Map of active button action states. */
  buttons: Record<string, boolean>;
}

/**
 * Definition structure for a sprite frame animation sequence.
 *
 * @public
 */
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

/**
 * Component managing sprite sheet animation playback on an entity.
 *
 * @remarks
 * Driven by `AnimationSystem` to advance active animation frames and emit completion events.
 *
 * @example
 * ```ts
 * const animator: AnimatorComponent = {
 *   type: "Animator",
 *   isPlaying: true,
 *   animations: {
 *     run: { frames: [0, 1, 2, 3], frameRate: 12, loop: true }
 *   },
 *   current: "run",
 *   elapsed: 0,
 *   frame: 0
 * };
 * world.addComponent(entity, animator);
 * ```
 *
 * @public
 */
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

/**
 * Component holding state machine execution context, current state name, timers, and arbitrary state data.
 *
 * @example
 * ```ts
 * const fsm: StateMachineComponent = {
 *   type: "StateMachine",
 *   currentState: "idle",
 *   elapsedInState: 0,
 *   data: {},
 *   machineId: "player_fsm",
 *   elapsedMs: 0
 * };
 * world.addComponent(entity, fsm);
 * ```
 *
 * @public
 */
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

/**
 * Configuration parameters for spawning particle emitters.
 * @public
 */
export interface ParticleEmitterConfig {
  /** Particle type descriptor or sprite/shape key. */
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

/**
 * Component managing particle emission state and parameters.
 * @public
 */
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

/**
 * Definition structure describing collision behavior, material properties, and special effects for tile types.
 *
 * @example
 * ```ts
 * const iceTile: TileDefinition = {
 *   solid: true,
 *   friction: 0.1,
 *   kind: "ice"
 * };
 * ```
 *
 * @public
 */
export interface TileDefinition {
  /** Whether the tile is solid for physical collisions. */
  solid: boolean;
  /** Whether the tile is a one-way platform. */
  oneWay?: boolean;
  /** Optional friction coefficient override. */
  friction?: number;
  /** Optional bounciness coefficient. */
  bounce?: number;
  /** Optional damage inflicted upon contact. */
  damage?: number;
  /** Tile functional classification. */
  kind?: "normal" | "ice" | "spike" | "bounce";
}

/**
 * Component storing 2D grid matrix tilemap data and tile definition mappings for collision and rendering.
 *
 * @example
 * ```ts
 * const tilemap: TilemapComponent = {
 *   type: "Tilemap",
 *   data: [[1, 1], [0, 1]],
 *   tileSize: 16
 * };
 * world.addComponent(entity, tilemap);
 * ```
 *
 * @public
 */
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

/**
 * Component defining platformer locomotion parameters such as acceleration, deceleration, and max speed.
 *
 * @example
 * ```ts
 * const config: PlatformerMovementConfigComponent = {
 *   type: "PlatformerMovementConfig",
 *   acceleration: 800,
 *   maxSpeed: 200,
 *   deceleration: 1000,
 *   airAcceleration: 400,
 *   airDeceleration: 200
 * };
 * world.addComponent(entity, config);
 * ```
 *
 * @public
 */
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

/**
 * Component storing normalized platformer input state (move direction and jump action flags).
 *
 * @example
 * ```ts
 * const input: PlatformerInputComponent = {
 *   type: "PlatformerInput",
 *   moveDir: 1,
 *   jumpPressed: true,
 *   jumpHeld: true,
 *   jumpReleased: false
 * };
 * world.addComponent(entity, input);
 * ```
 *
 * @public
 */
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

/**
 * Component specifying variable jump gravity parameters, apex thresholds, and jump impulses.
 *
 * @example
 * ```ts
 * const gravityConfig: PlatformerGravityConfigComponent = {
 *   type: "PlatformerGravityConfig",
 *   riseGravity: 980,
 *   fallGravity: 1200,
 *   jumpVelocity: -350,
 *   minJumpVelocity: -150
 * };
 * world.addComponent(entity, gravityConfig);
 * ```
 *
 * @public
 */
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

/**
 * Component managing jump buffers, coyote time timers, and multi-jump availability.
 *
 * @example
 * ```ts
 * const jumper: PlatformerJumperComponent = {
 *   type: "PlatformerJumper",
 *   coyoteTimer: 0.1,
 *   jumpBufferTimer: 0,
 *   coyoteTimeMax: 0.15,
 *   jumpBufferMax: 0.1
 * };
 * world.addComponent(entity, jumper);
 * ```
 *
 * @public
 */
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
  /** Maximum jumps allowed (for double jump). */
  maxJumps?: number;
  /** Remaining jumps available. */
  jumpsRemaining?: number;
}

/**
 * Component tracking entity grounded status, carrier platform IDs, and surface friction modifiers.
 *
 * @example
 * ```ts
 * const groundState: PlatformerGroundStateComponent = {
 *   type: "PlatformerGroundState",
 *   isGrounded: true
 * };
 * world.addComponent(entity, groundState);
 * ```
 *
 * @public
 */
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

/**
 * Component configuring 2D camera viewport position, follow target, zoom, deadzones, and smoothing.
 *
 * @example
 * ```ts
 * const camera: Camera2DComponent = {
 *   type: "Camera2D",
 *   zoom: 1.0,
 *   targetX: 400,
 *   targetY: 300,
 *   x: 400,
 *   y: 300,
 *   isMain: true
 * };
 * world.addComponent(entity, camera);
 * ```
 *
 * @public
 */
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

/**
 * Component managing sinusoidal motion trajectories for moving platforms.
 *
 * @example
 * ```ts
 * const platform: MovingPlatformComponent = {
 *   type: "MovingPlatform",
 *   pattern: "sine",
 *   startX: 100,
 *   startY: 200,
 *   amplitudeX: 50,
 *   amplitudeY: 0,
 *   frequency: 1.5,
 *   elapsed: 0
 * };
 * world.addComponent(entity, platform);
 * ```
 *
 * @public
 */
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

/**
 * Component tracking entities that have been damaged or struck during an attack cycle.
 *
 * @remarks
 * Prevents multiple damage hits from being applied to the same target entity in a single attack frame/wave.
 *
 * @example
 * ```ts
 * const hitbox: HitboxComponent = {
 *   type: "Hitbox",
 *   hitEntities: []
 * };
 * world.addComponent(entity, hitbox);
 * ```
 *
 * @public
 */
export interface HitboxComponent extends Component {
  /** Component discriminator type. */
  type: "Hitbox";
  /** List of entities already hit in current attack cycle. */
  hitEntities?: Entity[];
}

/**
 * Tag component marking entities capable of taking damage from hitboxes.
 *
 * @remarks
 * Queried alongside {@link HealthComponent} during damage detection.
 *
 * @example
 * ```ts
 * const hurtbox: HurtboxComponent = {
 *   type: "Hurtbox"
 * };
 * world.addComponent(entity, hurtbox);
 * ```
 *
 * @public
 */
export interface HurtboxComponent extends Component {
  /** Component discriminator type. */
  type: "Hurtbox";
}

/**
 * Component applying screen shake offset and decay to active camera viewports.
 *
 * @remarks
 * Used by camera rendering and screen shake systems to calculate camera displacement.
 *
 * @example
 * ```ts
 * const shake: ScreenShakeComponent = {
 *   type: "ScreenShake",
 *   intensity: 10,
 *   duration: 0.5,
 *   remaining: 0.5
 * };
 * world.addComponent(entity, shake);
 * ```
 *
 * @public
 */
export interface ScreenShakeComponent extends Component {
  /** Component discriminator type. */
  type: "ScreenShake";
  /** Shake displacement intensity in world units. */
  intensity: number;
  /** Total shake duration in seconds. */
  duration: number;
  /** Remaining shake duration in seconds. */
  remaining: number;
}

/**
 * Component specifying temporary rendering position offsets without affecting physics or spatial transforms.
 *
 * @remarks
 * Used for visual feedback like recoil, hit reactions, or juice effects.
 *
 * @example
 * ```ts
 * const offset: VisualOffsetComponent = {
 *   type: "VisualOffset",
 *   offsetX: 2.5,
 *   offsetY: -1.0
 * };
 * world.addComponent(entity, offset);
 * ```
 *
 * @public
 */
export interface VisualOffsetComponent extends Component {
  /** Component discriminator type. */
  type: "VisualOffset";
  /** Render offset X in pixels. */
  offsetX: number;
  /** Render offset Y in pixels. */
  offsetY: number;
}

/**
 * Component marking spatial grid partition coordinates for broadphase spatial queries.
 *
 * @example
 * ```ts
 * const node: SpatialNodeComponent = {
 *   type: "SpatialNode",
 *   gridX: 4,
 *   gridY: 3,
 *   active: true
 * };
 * world.addComponent(entity, node);
 * ```
 *
 * @public
 */
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

/**
 * Tag component marking entities that are dead and scheduled for cleanup.
 *
 * @example
 * ```ts
 * const dead: DeadComponent = {
 *   type: "Dead"
 * };
 * world.addComponent(entity, dead);
 * ```
 *
 * @public
 */
export interface DeadComponent extends Component {
  /** Component discriminator type. */
  type: "Dead";
}

/**
 * Component requesting a haptic vibration feedback pattern.
 *
 * @remarks
 * Processed by feedback or haptic systems to trigger platform vibration devices.
 *
 * @example
 * ```ts
 * const haptic: HapticRequestComponent = {
 *   type: "HapticRequest",
 *   pattern: "heavy",
 *   intensity: 0.8
 * };
 * world.addComponent(entity, haptic);
 * ```
 *
 * @public
 */
export interface HapticRequestComponent<TPattern extends string = string> extends Component {
  /** Component discriminator type. */
  type: "HapticRequest";
  /** Vibration pattern name or string identifier. */
  pattern: TPattern;
  /** Vibration intensity scaling factor between 0.0 and 1.0. */
  intensity?: number;
}

/**
 * Individual procedural juice animation clip descriptor.
 *
 * @remarks
 * Defines interpolation properties for procedural scale, bounce, flash, or custom component animations.
 *
 * @public
 */
export interface JuiceAnimation {
  /** Animation type descriptor (e.g. "scale", "flash", "offset"). */
  type: string;
  /** Optional target component type discriminator. */
  componentType?: string;
  /** Target component property key to interpolate. */
  property?: string;
  /** Total animation duration in seconds. */
  duration: number;
  /** Elapsed duration in seconds. */
  elapsed: number;
  /** Target end value for relative animations. */
  target?: number;
  /** Initial starting value. */
  startValue?: number;
  /** Ending target value. */
  endValue?: number;
  /** Delay before animation starts in seconds. */
  delay?: number;
  /** Easing function name. */
  easing?: string;
  /** Repeat count or negative value for looping. */
  repeat?: number;
}

/**
 * Component holding procedural juice visual animations on an entity.
 *
 * @remarks
 * Processed by `JuiceSystem` to interpolate target component properties over time.
 *
 * @example
 * ```ts
 * const juice: JuiceComponent = {
 *   type: "Juice",
 *   active: true,
 *   animations: [
 *     { type: "scale", duration: 0.2, elapsed: 0, target: 1.2 }
 *   ]
 * };
 * world.addComponent(entity, juice);
 * ```
 *
 * @public
 */
export interface JuiceComponent extends Component {
  /** Component discriminator type. */
  type: "Juice";
  /** Whether juice animations are currently processing. */
  active: boolean;
  /** List of active juice animation clips. */
  animations: JuiceAnimation[];
}

/**
 * Component containing per-frame collision and trigger detection results for an entity.
 *
 * @remarks
 * Updated every frame by collision systems. Holds active physical collisions and trigger enter/exit events.
 *
 * @example
 * ```ts
 * const events: CollisionEventsComponent = {
 *   type: "CollisionEvents",
 *   collisions: [],
 *   activeTriggers: [],
 *   triggersEntered: [],
 *   triggersExited: []
 * };
 * world.addComponent(entity, events);
 * ```
 *
 * @public
 */
export interface CollisionEventsComponent extends Component {
  /** Component discriminator type. */
  type: "CollisionEvents";
  /** List of active physical collision encounters this frame. */
  collisions: Collision[];
  /** Active trigger overlap entities. */
  activeTriggers: Entity[];
  /** Entities that entered triggers this frame. */
  triggersEntered: Entity[];
  /** Entities that exited triggers this frame. */
  triggersExited: Entity[];
}

/**
 * Component specifying full physical collision geometry, layer masks, and trigger settings.
 *
 * @remarks
 * Used by 2D physics and broadphase systems for collision queries and physical response.
 *
 * @example
 * ```ts
 * const collider: ColliderComponent = {
 *   type: "Collider",
 *   shape: { kind: "circle", radius: 12 },
 *   layer: 1,
 *   mask: 2,
 *   enabled: true,
 *   isTrigger: false
 * };
 * world.addComponent(entity, collider);
 * ```
 *
 * @public
 */
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
  /** Whether collider acts as a trigger sensor without solid resolution. */
  isTrigger: boolean;
  /** Center offset X relative to transform position. */
  offsetX?: number;
  /** Center offset Y relative to transform position. */
  offsetY?: number;
}

/**
 * Component specifying 2D sprite image rendering source, texture atlas coordinates, anchors, and flips.
 *
 * @example
 * ```ts
 * const sprite: SpriteComponent = {
 *   type: "Sprite",
 *   assetKey: "ship_idle",
 *   anchor: { x: 0.5, y: 0.5 },
 *   flipX: false,
 *   flipY: false
 * };
 * world.addComponent(entity, sprite);
 * ```
 *
 * @public
 */
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

/**
 * Component maintaining motion trajectory history points for visual trails.
 *
 * @remarks
 * Used by particle and rendering systems to render motion trails behind entities.
 *
 * @example
 * ```ts
 * const trail: TrailComponent = {
 *   type: "Trail",
 *   points: [{ x: 10, y: 20 }],
 *   maxLength: 10,
 *   currentIndex: 0,
 *   count: 1
 * };
 * world.addComponent(entity, trail);
 * ```
 *
 * @public
 */
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

/**
 * Interface contract for hierarchical component structures linking parent and child entities.
 *
 * @example
 * ```ts
 * const hierarchy: IHierarchicalComponent = {
 *   type: "Transform",
 *   children: []
 * };
 * ```
 *
 * @public
 */
export interface IHierarchicalComponent extends Component {
  /** Parent entity ID. */
  parentEntity?: Entity;
  /** List of child entity IDs. */
  children: Entity[];
}

/**
 * Simplified 2D collider component for circle and AABB bounding checks.
 *
 * @remarks
 * Lightweight alternative to {@link ColliderComponent} for simplified bounding queries.
 *
 * @example
 * ```ts
 * const collider2D: Collider2DComponent = {
 *   type: "Collider2D",
 *   shape: { type: "circle", radius: 10 },
 *   layer: 1,
 *   mask: 1,
 *   offsetX: 0,
 *   offsetY: 0,
 *   isTrigger: false,
 *   enabled: true
 * };
 * world.addComponent(entity, collider2D);
 * ```
 *
 * @public
 */
export interface Collider2DComponent extends Component {
  /** Component discriminator type. */
  type: "Collider2D";
  /** Simple 2D geometric shape description. */
  shape: { type: "circle"; radius: number } | { type: "aabb"; halfWidth: number; halfHeight: number };
  /** Collision layer bit. */
  layer: number;
  /** Collision mask bitfield. */
  mask: number;
  /** Center offset X relative to entity center. */
  offsetX: number;
  /** Center offset Y relative to entity center. */
  offsetY: number;
  /** Whether collider acts as a trigger sensor. */
  isTrigger: boolean;
  /** Whether collider is enabled for physical queries. */
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
  /** Kinetic accumulator component. */
  KineticAccumulator: import("../components/KineticAccumulatorComponent").KineticAccumulatorComponent;
  /** Combo component. */
  Combo: import("../components/ComboComponent").ComboComponent;
  /** Invulnerable component. */
  Invulnerable: import("../components/InvulnerableComponent").InvulnerableComponent;
}

/**
 * Component representing a respawn point.
 *
 * @example
 * ```ts
 * const respawnPoint: RespawnPointComponent = {
 *   type: "RespawnPoint",
 *   x: 100,
 *   y: 200,
 *   checkpointId: "cp_1"
 * };
 * world.addComponent(entity, respawnPoint);
 * ```
 *
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
 *
 * @example
 * ```ts
 * const respawnable: RespawnableComponent = {
 *   type: "Respawnable",
 *   blueprintKey: "enemy_charger",
 *   initialArgs: { x: 50, y: 50 }
 * };
 * world.addComponent(entity, respawnable);
 * ```
 *
 * @public
 */
export interface RespawnableComponent extends Component {
  /** Component discriminator type. */
  type: "Respawnable";
  /** Blueprint key used for respawning. */
  blueprintKey: string;
  /** Initial blueprint arguments. */
  initialArgs: Record<string, unknown>;
}

/**
 * Component representing a generic collectible.
 *
 * @example
 * ```ts
 * const collectible: CollectibleComponent = {
 *   type: "Collectible",
 *   kind: "coin",
 *   value: 10,
 *   persistent: false,
 *   collectOnce: true,
 *   id: "coin_1"
 * };
 * world.addComponent(entity, collectible);
 * ```
 *
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
 * Component representing an enemy archetype classification.
 *
 * @example
 * ```ts
 * const enemy: EnemyComponent = {
 *   type: "Enemy",
 *   kind: "patrol"
 * };
 * world.addComponent(entity, enemy);
 * ```
 *
 * @public
 */
export interface EnemyComponent extends Component {
  /** Component discriminator type. */
  type: "Enemy";
  /** Enemy archetype behavior mode. */
  kind: "patrol" | "jumper" | "charger";
}

/**
 * Component for enemies that patrol horizontally between two X coordinates.
 *
 * @example
 * ```ts
 * const patrol: PatrolComponent = {
 *   type: "Patrol",
 *   startX: 100,
 *   endX: 300,
 *   direction: 1,
 *   patrolSpeed: 50
 * };
 * world.addComponent(entity, patrol);
 * ```
 *
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
 * Component for horizontal ground and wall raycast/sensor detection.
 *
 * @example
 * ```ts
 * const groundDetector: GroundDetectorComponent = {
 *   type: "GroundDetector",
 *   hasGroundAhead: true,
 *   hasWallAhead: false,
 *   sensorOffsetX: 10,
 *   sensorOffsetY: 20
 * };
 * world.addComponent(entity, groundDetector);
 * ```
 *
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
 * Component for player detection sensors.
 *
 * @example
 * ```ts
 * const sensor: PlayerSensorComponent = {
 *   type: "PlayerSensor",
 *   visionRange: 150
 * };
 * world.addComponent(entity, sensor);
 * ```
 *
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
 *
 * @example
 * ```ts
 * const runState: RunState = {
 *   attempt: 1,
 *   lives: 3,
 *   activeCheckpoint: "cp_1",
 *   elapsedTime: 45.2,
 *   deaths: 0,
 *   collectedPermanentIds: [],
 *   collectedTemporalIds: ["coin_1"]
 * };
 * ```
 *
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
