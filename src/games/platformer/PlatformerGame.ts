import {
  BaseGame,
  World,
  SystemPhase,
  BlueprintDefinition,
  Component,
  CoreComponentRegistry,
  WebAudioPlayer,
  GameLoop,
  EventBus,
  PhysicsIntegrateSystem,
  PlatformerMovementSystem,
  PlatformerGravitySystem,
  TileCollisionSystem,
  PlatformerCoyoteSystem,
  TransformComponent,
  VelocityComponent,
  Collider2DComponent,
  TagComponent,
  HealthComponent
} from "@tiny-aster/core";
import { PlatformerInputSystem } from "./systems/PlatformerInputSystem";

export interface PlatformerInput {
  moveLeft: boolean;
  moveRight: boolean;
  jump: boolean;
  [key: string]: unknown;
}

export interface PlatformerGameState extends Component {
  type: "PlatformerGameState";
  score: number;
  isGameOver: boolean;
}

export interface PlatformerBlueprintMap extends Record<string, BlueprintDefinition<CoreComponentRegistry, any, any>> {
  player: BlueprintDefinition<CoreComponentRegistry, any, { x: number; y: number }>;
  tilemap: BlueprintDefinition<CoreComponentRegistry, any, { data: number[][]; tileDefinitions: any }>;
}

export const PLATFORMER_CONFIG = {
  SCREEN_WIDTH: 800,
  SCREEN_HEIGHT: 600,
  TILE_SIZE: 40,
  PLAYER_SPEED: 200,
  PLAYER_ACCEL: 800,
  PLAYER_DECEL: 1200,
  PLAYER_AIR_ACCEL: 400,
  PLAYER_AIR_DECEL: 600,
  PLAYER_JUMP_VEL: 350,
  PLAYER_MIN_JUMP_VEL: 150,
  RISE_GRAVITY: 800,
  FALL_GRAVITY: 1200,
};

export class PlatformerGame extends BaseGame<PlatformerGameState, PlatformerInput, CoreComponentRegistry, any, PlatformerBlueprintMap> {
  public readonly gameId = "platformer";
  private gameOver = false;

  constructor(config: { seed?: number; gameOptions?: Record<string, unknown> } = {}) {
    super({
      pauseKey: "KeyP",
      restartKey: "KeyR",
      gameOptions: config.gameOptions,
      seed: config.seed,
      audio: new WebAudioPlayer()
    });
  }

  protected override async onRegisterSystems(): Promise<void> {
    this.world.setResource("ScreenConfig", { width: PLATFORMER_CONFIG.SCREEN_WIDTH, height: PLATFORMER_CONFIG.SCREEN_HEIGHT });

    // Blueprints
    this.blueprints.register("player", {
      spawn: (world, entity, args: { x: number; y: number }) => {
        world.addComponent(entity, {
          type: "Transform",
          x: args.x,
          y: args.y,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          worldX: args.x,
          worldY: args.y,
          worldRotation: 0,
          worldScaleX: 1,
          worldScaleY: 1,
          dirty: false
        } as TransformComponent);

        world.addComponent(entity, {
          type: "Velocity",
          vx: 0,
          vy: 0,
          angularVelocity: 0
        } as VelocityComponent);

        world.addComponent(entity, {
          type: "Collider2D",
          shape: { type: "aabb", halfWidth: 10, halfHeight: 15 },
          layer: 1,
          mask: 0xFFFF,
          offsetX: 0,
          offsetY: 0,
          isTrigger: false,
          enabled: true
        } as Collider2DComponent);

        world.addComponent(entity, {
          type: "Tag",
          tags: ["TileCollider"]
        } as TagComponent);

        world.addComponent(entity, {
          type: "PlatformerMovementConfig",
          acceleration: PLATFORMER_CONFIG.PLAYER_ACCEL,
          maxSpeed: PLATFORMER_CONFIG.PLAYER_SPEED,
          deceleration: PLATFORMER_CONFIG.PLAYER_DECEL,
          airAcceleration: PLATFORMER_CONFIG.PLAYER_AIR_ACCEL,
          airDeceleration: PLATFORMER_CONFIG.PLAYER_AIR_DECEL
        } as any);

        world.addComponent(entity, {
          type: "PlatformerInput",
          moveDir: 0,
          jumpPressed: false,
          jumpHeld: false,
          jumpReleased: false
        } as any);

        world.addComponent(entity, {
          type: "PlatformerGravityConfig",
          riseGravity: PLATFORMER_CONFIG.RISE_GRAVITY,
          fallGravity: PLATFORMER_CONFIG.FALL_GRAVITY,
          jumpVelocity: PLATFORMER_CONFIG.PLAYER_JUMP_VEL,
          minJumpVelocity: PLATFORMER_CONFIG.PLAYER_MIN_JUMP_VEL
        } as any);

        world.addComponent(entity, {
          type: "PlatformerJumper",
          coyoteTimer: 0,
          jumpBufferTimer: 0,
          coyoteTimeMax: 0.15,
          jumpBufferMax: 0.1
        } as any);

        world.addComponent(entity, {
          type: "PlatformerGroundState",
          isGrounded: false,
          iceMultiplier: 1.0
        } as any);

        world.addComponent(entity, {
          type: "Health",
          current: 3,
          max: 3
        } as HealthComponent);
      }
    });

    this.blueprints.register("tilemap", {
      spawn: (world, entity, args: { data: number[][]; tileDefinitions: any }) => {
        world.addComponent(entity, {
          type: "Tilemap",
          data: args.data,
          tileSize: PLATFORMER_CONFIG.TILE_SIZE,
          tileDefinitions: args.tileDefinitions
        } as any);

        world.addComponent(entity, {
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
        } as any);
      }
    });

    // Add Systems
    this.world.addSystem(new PlatformerInputSystem(), { phase: SystemPhase.Input });
    this.world.addSystem(new PlatformerMovementSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new PlatformerGravitySystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new PlatformerCoyoteSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new PhysicsIntegrateSystem(), { phase: SystemPhase.Simulation, priority: -10 });
    this.world.addSystem(new TileCollisionSystem(), { phase: SystemPhase.Collision });
  }

  protected override async onInitializeEntities(): Promise<void> {
    // Standard test tile definitions:
    // 0: empty
    // 1: solid normal ground
    // 2: solid ice ground
    // 3: functional bounce tile (non-solid or solid, let's make it solid)
    // 4: functional spike tile (non-solid or solid, let's make it solid)
    // 5: solid one-way platform
    const tileDefinitions = {
      1: { solid: true, kind: "normal" as const },
      2: { solid: true, kind: "ice" as const },
      3: { solid: true, kind: "bounce" as const, bounce: 1.2 },
      4: { solid: true, kind: "spike" as const },
      5: { solid: true, oneWay: true, kind: "normal" as const }
    };

    // Simple test tilemap data
    // 15 rows x 20 cols
    const data: number[][] = [];
    for (let r = 0; r < 15; r++) {
      const row: number[] = [];
      for (let c = 0; c < 20; c++) {
        if (r === 14) {
          // Bottom floor is solid normal ground
          row.push(1);
        } else if (r === 10 && c >= 5 && c <= 8) {
          // Some ice platforms
          row.push(2);
        } else if (r === 10 && c === 9) {
          // Spike tile
          row.push(4);
        } else if (r === 11 && c === 12) {
          // Bounce tile
          row.push(3);
        } else if (r === 8 && c >= 14 && c <= 17) {
          // One-way platform
          row.push(5);
        } else {
          row.push(0);
        }
      }
      data.push(row);
    }

    // Spawn tilemap
    const tilemapEntity = this.world.createEntity();
    this.blueprints.spawn(this.world, "tilemap", tilemapEntity, { data, tileDefinitions });

    // Spawn player
    const playerEntity = this.world.createEntity();
    this.blueprints.spawn(this.world, "player", playerEntity, { x: 100, y: 100 });
  }

  public override update(dt: number): void {
    this.world.update(dt);
  }

  public override setInputState(input: Partial<PlatformerInput>): void {
    const world = this.getWorld();
    const playerEntity = world.query("PlatformerInput" as any)[0];
    if (playerEntity !== undefined) {
      world.mutateComponent(playerEntity, "PlatformerInput" as any, (inputComp: any) => {
        if (input.moveLeft !== undefined || input.rotateLeft !== undefined) {
          const moveLeft = !!(input.moveLeft || input.rotateLeft);
          const moveRight = !!(input.moveRight || input.rotateRight);
          inputComp.moveDir = moveLeft ? -1 : (moveRight ? 1 : 0);
        }
        if (input.jump !== undefined || input.shoot !== undefined || input.flap !== undefined) {
          const jumpPressed = !!(input.jump || input.shoot || input.flap);
          inputComp.jumpHeld = jumpPressed;
        }
      });
    }
  }

  public getGameState(): PlatformerGameState {
    return {
      type: "PlatformerGameState",
      score: 0,
      isGameOver: this.gameOver
    };
  }

  public isGameOver(): boolean {
    return this.gameOver;
  }
}
