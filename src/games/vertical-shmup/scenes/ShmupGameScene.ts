import { Scene, World, SystemPhase, MovementSystem, BoundarySystem, TTLSystem, CollisionSystem2D, Camera2DSystem, RenderUpdateSystem, JuiceSystem, SpatialPartitioningSystem } from "@tiny-aster/core";
import { CombatSystem } from "@tiny-aster/gameplay-kit";
import { ShmupComponentRegistry } from "../types/ShmupTypes";
import { ShmupConfig } from "../types/ShmupConfigSchema";
import { PlayerBulletPool, EnemyBulletPool } from "../EntityPool";
import { ShmupInputSystem } from "../systems/ShmupInputSystem";
import { ScrollSystem } from "../systems/ScrollSystem";
import { EnemyPathSystem } from "../systems/EnemyPathSystem";
import { ShmupCollisionSystem } from "../systems/ShmupCollisionSystem";
import { ShmupBulletPatternSystem } from "../systems/BulletPatternSystem";
import { createPlayer, createEnemy } from "../EntityFactory";
import { createMainCamera2D } from "../../shared/componentBuilders";
import { runWithUnlockedRandomAndMutators } from "../../shared/configHelper";

export class ShmupGameScene extends Scene<ShmupComponentRegistry> {
  constructor(
    private readonly config: ShmupConfig,
    private readonly playerPool: PlayerBulletPool,
    private readonly enemyPool: EnemyBulletPool,
    world: World<ShmupComponentRegistry>,
    private readonly gameOptions?: Record<string, unknown>
  ) { super(world); }

  public onEnter(): void {
    this.world.setResource("GameConfig", this.config);
    this.world.setResource("PlayerBulletPool", this.playerPool);
    this.world.setResource("EnemyBulletPool", this.enemyPool);

    const state = this.world.createEntity();
    this.world.addComponent(state, { type: "ShmupGameState", score: 0, wave: 1, lives: 3, scrollDistance: 0, isGameOver: false, spawnTimer: 0 });
    const player = createPlayer(this.world, this.config.WORLD_WIDTH / 2, this.config.WORLD_HEIGHT - 100);
    this.world.setResource("ScreenConfig", { width: this.config.WORLD_WIDTH, height: this.config.WORLD_HEIGHT });

    // Fixed camera locked at (0,0) for stable fixed-screen vertical shmup view
    const cam = createMainCamera2D(this.world, player, { smoothingX: 0, smoothingY: 0 });
    this.world.mutateComponent(cam, "Camera2D", c => {
      c.x = 0;
      c.y = 0;
      c.targetX = 0;
      c.targetY = 0;
      c.followEntity = undefined;
    });

    this.registerSystems();

    runWithUnlockedRandomAndMutators(this.world, this.gameOptions, () => {
      const rng = this.world.gameplayRandom;
      for (let i = 0; i < 6; i += 1) {
        createEnemy(this.world, 55 + rng.next() * (this.config.WORLD_WIDTH - 110), 80 + i * 45, i % 3 === 0 ? "sine" : "straight");
      }
    });
  }

  private registerSystems(): void {
    this.world.addSystem(new ShmupInputSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new MovementSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new EnemyPathSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new ScrollSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new BoundarySystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new TTLSystem(), { phase: SystemPhase.Simulation });
        // TODO(refactor): código duplicado detectado (bloque) con tower-defense/TowerDefenseGame.ts:281-286. Considerar extraer a función compartida. Ref: 87a4f2aa
this.world.addSystem(new SpatialPartitioningSystem(), { phase: SystemPhase.Collision });
    this.world.addSystem(new CollisionSystem2D(), { phase: SystemPhase.Collision });
    this.world.addSystem(new CombatSystem(), { phase: SystemPhase.Collision });
    this.world.addSystem(new ShmupBulletPatternSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new ShmupCollisionSystem(), { phase: SystemPhase.GameRules });
    this.world.addSystem(new Camera2DSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new JuiceSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new RenderUpdateSystem(), { phase: SystemPhase.Presentation });
  }
}
