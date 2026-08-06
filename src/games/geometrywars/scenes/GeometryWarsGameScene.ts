import {
  Scene,
  World,
  MovementSystem,
  HierarchySystem,
  CollisionSystem2D,
  TTLSystem,
  RenderUpdateSystem,
  SystemPhase,
  SteeringSystem
} from "@tiny-aster/core";
import { GeometryWarsComponentRegistry, GeometryWarsEventRegistry } from "../types/GeometryWarsRegistry";
import { GeometryWarsConfig } from "../config/GeometryWarsConfig";
import { CombatSystem } from "../../shared/combat/systems/CombatSystem";
import { SpawnDirectorSystem } from "../../shared/spawn/systems/SpawnDirectorSystem";
import { generateGeometryWarsWaves } from "../config/GeometryWarsWaves";
import { registerGeometryWarsBlueprints, GeometryWarsEntityFactory } from "../entities/GeometryWarsEntities";
import { GeometryWarsInputSystem } from "../systems/GeometryWarsInputSystem";

/**
 * Main gameplay scene for Geometry Wars.
 * @public
 */
export class GeometryWarsGameScene extends Scene {
  private config: GeometryWarsConfig;

  constructor(config: GeometryWarsConfig) {
    const world = new World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry>();
    super(world);
    this.config = config;
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

    // 2. Register blueprints
    registerGeometryWarsBlueprints(this.gworld);

    // 3. Register systems
    this.gworld.addSystem(new GeometryWarsInputSystem(), { phase: SystemPhase.Simulation });
    this.gworld.addSystem(new SteeringSystem(), { phase: SystemPhase.Simulation });
    this.gworld.addSystem(new SpawnDirectorSystem(), { phase: SystemPhase.Simulation });
    this.gworld.addSystem(new MovementSystem(), { phase: SystemPhase.Simulation });
    this.gworld.addSystem(new HierarchySystem(), { phase: SystemPhase.Transform });
    this.gworld.addSystem(new CollisionSystem2D(), { phase: SystemPhase.Collision });
    this.gworld.addSystem(new CombatSystem(), { phase: SystemPhase.Collision });
    this.gworld.addSystem(new TTLSystem(), { phase: SystemPhase.Simulation });
    this.gworld.addSystem(new RenderUpdateSystem(), { phase: SystemPhase.Presentation });

    // 4. Initialize entities
    GeometryWarsEntityFactory.createGameState(this.gworld);
    GeometryWarsEntityFactory.createPlayer(this.gworld, this.config.WIDTH / 2, this.config.HEIGHT / 2);

    // Initialize Wave definitions and SpawnDirector
    const waves = generateGeometryWarsWaves(this.config.WIDTH, this.config.HEIGHT);
    this.gworld.setResource("WaveDefinitions", waves);

    const directorEntity = this.gworld.createEntity();
    this.gworld.addComponent(directorEntity, {
      type: "SpawnDirector",
      waveIndex: 0,
      cooldownRemaining: 0,
      pendingSpawns: [],
      waveElapsedTime: 0,
      enemiesRemaining: 0,
      status: "idle"
    } as any);
  }

  public override onExit(): void {
    // Scene cleanups
  }
}
