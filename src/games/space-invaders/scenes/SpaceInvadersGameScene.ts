import {
  Scene,
  World,
  EventBus,
  BaseGame,
  MovementSystem,
  HierarchySystem,
  TTLSystem,
  JuiceSystem,
  RenderUpdateSystem,
  BoundarySystem,
  CollisionSystem2D,
  MutatorSystem,
  SystemPhase,
  TransformComponent,
  VelocityComponent,
  RenderComponent,
  Collider2DComponent
} from "@tiny-aster/core";
import { LootSystem, PowerUpSystem, ComboSystem, PowerUpComponent } from "../../shared/arcade";
import { CollisionLayers } from "../../shared/types/CollisionLayers";
import { SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";
import { BENEFICIAL_MUTATORS } from "../../../utils/MutatorRegistry";
import { SpaceInvadersInputSystem } from "../systems/SpaceInvadersInputSystem";
import { SpaceInvadersFormationSystem } from "../systems/SpaceInvadersFormationSystem";
import { SpaceInvadersCollisionSystem } from "../systems/SpaceInvadersCollisionSystem";
import { SpaceInvadersGameStateSystem } from "../systems/SpaceInvadersGameStateSystem";
import { SpaceInvadersRenderSystem } from "../systems/SpaceInvadersRenderSystem";
import { InvulnerabilitySystem } from "../systems/InvulnerabilitySystem";
import { KamikazeSystem } from "../systems/KamikazeSystem";
import { BossSystem } from "../systems/BossSystem";
import { PlayerBulletPool, EnemyBulletPool, ParticlePool } from "../EntityPool";
import {
  createPlayer,
  createGameState,
  createFormationController,
  spawnInvaderWave,
  spawnShields
} from "../EntityFactory";
import { SpaceInvadersConfig } from "../types/SpaceInvadersConfigSchema";
import { GAME_CONFIG } from "../types/SpaceInvadersTypes";
import { ISpaceInvadersGame } from "../types/GameInterfaces";
import { BENEFICIAL_MUTATORS } from "../../../utils/MutatorRegistry";

/**
 * Main gameplay scene for Space Invaders.
 */
export class SpaceInvadersGameScene extends Scene {
  private game: ISpaceInvadersGame;
  private playerBulletPool: PlayerBulletPool;
  private enemyBulletPool: EnemyBulletPool;
  private particlePool: ParticlePool;
  private config: SpaceInvadersConfig;
  private unsubscribeLootSpawn?: () => void;

  constructor(
    game: ISpaceInvadersGame,
    playerBulletPool: PlayerBulletPool,
    enemyBulletPool: EnemyBulletPool,
    particlePool: ParticlePool,
    config?: SpaceInvadersConfig
  ) {
    // Note: in this engine, Scene creates its own World if not provided
    // but the constructor requires a World.
    const world = new World<SpaceInvadersComponentRegistry>();
    super(world);
    this.game = game;
    this.playerBulletPool = playerBulletPool;
    this.enemyBulletPool = enemyBulletPool;
    this.particlePool = particlePool;
    this.config = config || world.getResource<SpaceInvadersConfig>("GameConfig")!;
  }

  public onEnter(): void {
    // Inject resources into the scene world
    this.world.setResource("GameConfig", this.config);
    this.world.setResource("ScreenConfig", { width: GAME_CONFIG.SCREEN_WIDTH, height: GAME_CONFIG.SCREEN_HEIGHT });

    // Register high-fidelity satisfying Power-up effects registry
    this.world.setResource("PowerUpEffects", {
      speed_boost: {
        apply(w: World<any>, player: number) {
          const config = w.getResource<any>("GameConfig");
          if (config) {
            config.PLAYER_SPEED = Math.round(config.PLAYER_SPEED * 1.30);
          }
        }
      },
      shield: {
        apply(w: World<any>, player: number) {
          if (w.hasComponent(player, "Health")) {
            w.mutateComponent(player, "Health", (h: any) => {
              h.invulnerableRemaining = 3.0; // 3 seconds of invulnerability
            });
          }
        }
      },
      extra_life: {
        apply(w: World<any>, player: number) {
          if (w.hasComponent(player, "Health")) {
            w.mutateComponent(player, "Health", (h: any) => {
              h.current = Math.min(h.max, h.current + 1);
            });
          }
          if (w.hasSingleton("GameState")) {
            w.mutateSingleton("GameState", (gs: any) => {
              gs.lives = Math.min(gs.lives + 1, 5); // clamp to max lives
            });
          }
        }
      },
      score_multiplier: {
        apply(w: World<any>, player: number) {
          const config = w.getResource<any>("GameConfig");
          const comboTimeout = config?.COMBO_TIMEOUT ?? 2000;
          if (w.hasSingleton("GameState")) {
            w.mutateSingleton("GameState", (gs: any) => {
              gs.combo = Math.min(25, gs.combo + 5);
              gs.multiplier = Math.min(config?.MAX_MULTIPLIER ?? 10, 1 + Math.floor(gs.combo / 5));
              gs.comboTimerRemaining = comboTimeout / 1000;
            });
          }
          const comboEntities = w.query("Combo");
          if (comboEntities.length > 0) {
            w.mutateComponent(comboEntities[0], "Combo", (c: any) => {
              c.combo = Math.min(25, c.combo + 5);
              c.multiplier = Math.min(config?.MAX_MULTIPLIER ?? 10, 1 + Math.floor(c.combo / 5));
              c.timerRemaining = comboTimeout / 1000;
            });
          }
        }
      }
    });

    const eventBus = (this.game as unknown as { eventBus: EventBus }).eventBus;
    if (eventBus) {
      this.world.setResource("EventBus", eventBus);

      // Listen for falling power-up spawns on invader destruction
      this.unsubscribeLootSpawn = eventBus.on("loot:spawn" as any, (event: any) => {
        const x = event.x;
        const y = event.y;
        const lootType = event.lootType;

        const powerUpEntity = this.world.createEntity();

        this.world.addComponent(powerUpEntity, {
          type: "Transform",
          x,
          y,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          worldX: x,
          worldY: y,
          worldRotation: 0,
          worldScaleX: 1,
          worldScaleY: 1,
          dirty: false
        } as TransformComponent);

        this.world.addComponent(powerUpEntity, {
          type: "Velocity",
          vx: 0,
          vy: 100, // falls down vertically toward player
          angularVelocity: 0
        } as VelocityComponent);

        // Color-code different power-ups
        let color = "#FFFF00"; // speed_boost = bright yellow
        if (lootType === "shield") {
          color = "#00FFFF"; // shield = cyan
        } else if (lootType === "extra_life") {
          color = "#FF00FF"; // extra_life = magenta/pink
        } else if (lootType === "score_multiplier") {
          color = "#FFA500"; // score_multiplier = orange
        }

        this.world.addComponent(powerUpEntity, {
          type: "Render",
          shape: "shield_block", // standard 8-bit block shape
          size: 15,
          color,
          rotation: 0,
          visible: true,
          opacity: 1,
          order: 1,
          hitFlashFrames: 0,
          angularVelocity: 0
        } as RenderComponent);

        this.world.addComponent(powerUpEntity, {
          type: "Collider2D",
          shape: { type: "aabb", halfWidth: 7.5, halfHeight: 7.5 },
          layer: CollisionLayers.DEBRIS, // falls as debris
          mask: CollisionLayers.PLAYER, // interacts only with the player
          offsetX: 0,
          offsetY: 0,
          isTrigger: true, // triggers collision without physics blocking
          enabled: true
        } as Collider2DComponent);

        this.world.addComponent(powerUpEntity, {
          type: "PowerUp",
          powerUpType: lootType
        } as PowerUpComponent);

        this.world.addComponent(powerUpEntity, {
          type: "Boundary",
          width: GAME_CONFIG.SCREEN_WIDTH,
          height: GAME_CONFIG.SCREEN_HEIGHT,
          mode: "destroy" // cleanly reaped when falling past bottom edge
        } as any);
      });
    }

    const blueprints = (this.game as unknown as { blueprints: any }).blueprints;
    if (blueprints) {
      this.world.setResource("BlueprintRegistry", blueprints);
    }
    const inputSystem = (this.game as unknown as { unifiedInput: any }).unifiedInput;
    if (inputSystem) {
      this.world.setResource("InputSystem", inputSystem);
    }

    // 1. Systems registration
    const inputSys = new SpaceInvadersInputSystem(this.playerBulletPool);
    if (this.game.isMultiplayer) inputSys.setMultiplayerMode(true);

    this.world.addSystem((this.game as any).unifiedInput, { phase: SystemPhase.Input });
    this.world.addSystem(inputSys, { phase: SystemPhase.Input });
    this.world.addSystem(new MovementSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new BoundarySystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new SpaceInvadersFormationSystem(this.enemyBulletPool), { phase: SystemPhase.Simulation });
    this.world.addSystem(new InvulnerabilitySystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new HierarchySystem(), { phase: SystemPhase.Transform });
    this.world.addSystem(new CollisionSystem2D(), { phase: SystemPhase.Collision });
    this.world.addSystem(new SpaceInvadersCollisionSystem(this.particlePool), { phase: SystemPhase.GameRules });
    this.world.addSystem(new KamikazeSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new BossSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new ComboSystem() as any, { phase: SystemPhase.Simulation });
    this.world.addSystem(new LootSystem() as any, { phase: SystemPhase.GameRules });
    this.world.addSystem(new PowerUpSystem() as any, { phase: SystemPhase.Simulation });
    this.world.addSystem(new TTLSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new SpaceInvadersGameStateSystem(this.game), { phase: SystemPhase.GameRules });

    const mutators = (this.game as any)._config.gameOptions?.mutators || (this.game as any)._config.gameOptions?.activeMutators || [];
    this.world.addSystem(new MutatorSystem(mutators), { phase: SystemPhase.Simulation });

    // Visual / Presentation Systems
    this.world.addSystem(new JuiceSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new RenderUpdateSystem(), { phase: SystemPhase.Presentation }); // No trails
    this.world.addSystem(new SpaceInvadersRenderSystem(), { phase: SystemPhase.Presentation });

    // 2. Initial entities
    if (this.game.isMultiplayer) return; // Wait for server state
    createGameState(this.world);

    // Apply beneficial mutators right after creating the GameState entity
    const beneficialMutators: string[] = (this.game as any)._config?.gameOptions?.beneficialMutators || [];
    for (const mId of beneficialMutators) {
      const mutator = BENEFICIAL_MUTATORS[mId];
      if (mutator) {
        mutator.apply(this.world);
      }
    }

    createPlayer(this.world, GAME_CONFIG.SCREEN_CENTER_X, GAME_CONFIG.SCREEN_HEIGHT - 50);
    createFormationController(this.world);
    spawnInvaderWave(this.world, 1);
    spawnShields(this.world);

    // Apply active beneficial mutators
    const activeBeneficials = ((this.game as any)._config?.gameOptions?.activeBeneficialMutators as string[]) || [];
    for (const mutatorId of activeBeneficials) {
      const mutator = BENEFICIAL_MUTATORS[mutatorId];
      if (mutator) {
        mutator.apply(this.world);
      }
    }
  }

  public override onExit(): void {
    if (this.unsubscribeLootSpawn) {
      this.unsubscribeLootSpawn();
      this.unsubscribeLootSpawn = undefined;
    }
  }
}
