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

export class ShmupGameScene extends Scene<ShmupComponentRegistry> {
  constructor(
    private readonly config: ShmupConfig,
    private readonly playerPool: PlayerBulletPool,
    private readonly enemyPool: EnemyBulletPool,
    world: World<ShmupComponentRegistry>
  ) { super(world); }

  public onEnter(): void {
    this.world.setResource("GameConfig", this.config);
    this.world.setResource("PlayerBulletPool", this.playerPool);
    this.world.setResource("EnemyBulletPool", this.enemyPool);

    const state = this.world.createEntity();
    this.world.addComponent(state, { type: "ShmupGameState", score: 0, wave: 1, scrollDistance: 0, isGameOver: false, spawnTimer: 0 });
    const player = createPlayer(this.world, this.config.WORLD_WIDTH / 2, this.config.WORLD_HEIGHT - 100);
    this.world.setResource("ScreenConfig", { width: this.config.WORLD_WIDTH, height: this.config.WORLD_HEIGHT });
    createMainCamera2D(this.world, player, { smoothingX: 5, smoothingY: 5 });
    this.registerSystems();

    const rng = this.world.gameplayRandom;
    for (let i = 0; i < 6; i += 1) {
      createEnemy(this.world, 55 + rng.next() * (this.config.WORLD_WIDTH - 110), 80 + i * 45, i % 3 === 0 ? "sine" : "straight");
    }
  }

  private registerSystems(): void {
    this.world.addSystem(new ShmupInputSystem() as never, { phase: SystemPhase.Simulation });
    this.world.addSystem(new MovementSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new EnemyPathSystem() as never, { phase: SystemPhase.Simulation });
    this.world.addSystem(new ScrollSystem() as never, { phase: SystemPhase.Simulation });
    this.world.addSystem(new BoundarySystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new TTLSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new SpatialPartitioningSystem(), { phase: SystemPhase.Collision });
    this.world.addSystem(new CollisionSystem2D(), { phase: SystemPhase.Collision });
    this.world.addSystem(new CombatSystem(), { phase: SystemPhase.Collision });
    this.world.addSystem(new ShmupBulletPatternSystem() as never, { phase: SystemPhase.Simulation });
    this.world.addSystem(new ShmupCollisionSystem() as never, { phase: SystemPhase.GameRules });
    this.world.addSystem(new Camera2DSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new JuiceSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new RenderUpdateSystem(), { phase: SystemPhase.Presentation });
  }
}
