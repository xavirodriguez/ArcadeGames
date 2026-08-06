import {
  Scene,
  World,
  MovementSystem,
  HierarchySystem,
  CollisionSystem2D,
  TTLSystem,
  RenderUpdateSystem,
  SystemPhase
} from "@tiny-aster/core";
import { GeometryWarsComponentRegistry, GeometryWarsEventRegistry } from "../types/GeometryWarsRegistry";
import { GeometryWarsConfig } from "../config/GeometryWarsConfig";
import { CombatSystem } from "../../shared/combat/systems/CombatSystem";
import { registerGeometryWarsBlueprints, GeometryWarsEntityFactory } from "../entities/GeometryWarsEntities";
import { GeometryWarsInputSystem } from "../systems/GeometryWarsInputSystem";
import { WeaponSystem } from "../systems/WeaponSystem";
import { GWBulletPool } from "../EntityPool";

/**
 * Main gameplay scene for Geometry Wars.
 * @public
 */
export class GeometryWarsGameScene extends Scene {
  private config: GeometryWarsConfig;
  private bulletPool: GWBulletPool;

  constructor(config: GeometryWarsConfig) {
    const world = new World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry>();
    super(world);
    this.config = config;
    this.bulletPool = new GWBulletPool();
  }

  /**
   * Helper to access the world with correct TS generic typings.
   */
  private get gworld(): World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry, any> {
    return this.world as any;
  }

  public onEnter(): void {
    // 1. Inject resources
    this.gworld.setResource("GameConfig", this.config);
    this.gworld.setResource("ScreenConfig", { width: this.config.WIDTH, height: this.config.HEIGHT });
    this.gworld.setResource("GWBulletPool", this.bulletPool);

    // 2. Register blueprints
    registerGeometryWarsBlueprints(this.gworld);

    // 3. Register systems
    this.gworld.addSystem(new GeometryWarsInputSystem(), { phase: SystemPhase.Simulation });
    this.gworld.addSystem(new WeaponSystem(), { phase: SystemPhase.Simulation });
    this.gworld.addSystem(new MovementSystem(), { phase: SystemPhase.Simulation });
    this.gworld.addSystem(new HierarchySystem(), { phase: SystemPhase.Transform });
    this.gworld.addSystem(new CollisionSystem2D(), { phase: SystemPhase.Collision });
    this.gworld.addSystem(new CombatSystem(), { phase: SystemPhase.Collision });
    this.gworld.addSystem(new TTLSystem(), { phase: SystemPhase.Simulation });
    this.gworld.addSystem(new RenderUpdateSystem(), { phase: SystemPhase.Presentation });

    // 4. Initialize entities
    GeometryWarsEntityFactory.createGameState(this.gworld);
    GeometryWarsEntityFactory.createPlayer(this.gworld, this.config.WIDTH / 2, this.config.HEIGHT / 2);
  }

  public override onExit(): void {
    this.gworld.deleteResource("GWBulletPool");
  }
}
