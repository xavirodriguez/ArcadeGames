import { BaseGame, SystemPhase, ConfigService, MovementSystem, CollisionSystem2D, ComboSystem, Camera2DSystem, World, TransformComponent, VelocityComponent, HealthComponent, ColliderComponent, CollisionEventsComponent, ShapeType, CircleShape, Renderer } from "@tiny-aster/core";
import { NebulaDashComponentRegistry, NebulaDashEventRegistry, NebulaDashInputState, NebulaDashStateComponent } from "./types/NebulaDashRegistry";
import { NebulaDashConfig, NebulaDashConfigSchema } from "./config/NebulaDashConfigSchema";
import { ClimberInputSystem } from "./systems/ClimberInputSystem";
import { VerticalScrollerSystem } from "./systems/VerticalScrollerSystem";
import { NebulaCollisionSystem } from "./systems/NebulaCollisionSystem";
import { CombatSystem } from "../shared/combat/systems/CombatSystem";
import { SpawnDirectorSystem } from "../shared/spawn/systems/SpawnDirectorSystem";
import { registerNebulaDashBlueprints, NebulaDashEntityFactory } from "./entities/NebulaDashEntities";
import { generateNebulaDashWaves } from "./config/NebulaDashWaves";
import { initializeNebulaDashRenderer } from "./rendering/NebulaDashRendererManager";
import { CollisionLayers } from "../shared/types/CollisionLayers";

export class NebulaDashGame extends BaseGame<
  NebulaDashStateComponent,
  NebulaDashInputState,
  NebulaDashComponentRegistry,
  NebulaDashEventRegistry
> {
  public readonly gameId = "nebuladash";
  public config: NebulaDashConfig;

  constructor(options: { seed?: number; gameOptions?: Record<string, unknown> } = {}) {
    const rawConfig = require("./config/nebuladash.json");
    const config = ConfigService.load<NebulaDashConfig>("nebuladash", NebulaDashConfigSchema, rawConfig);
    super({
      pauseKey: config.KEYS.PAUSE,
      restartKey: config.KEYS.RESTART,
      gameOptions: { ...options.gameOptions, seed: options.seed }
    });
    this.config = config;
  }

  protected override async onRegisterSystems(): Promise<void> {
    const baseConfig = ConfigService.load<NebulaDashConfig>("nebuladash", NebulaDashConfigSchema, require("./config/nebuladash.json"));
    this.world.setResource("GameConfig", baseConfig);

    const mutators = (this._config.gameOptions?.mutators as any[]) || [];
    for (const m of mutators) {
      if (typeof m.apply === "function") {
        m.apply(this.world);
      }
    }

    this.config = (this.world.getResource<NebulaDashConfig>("GameConfig") || baseConfig);

    registerNebulaDashBlueprints(this.world);
    const waves = generateNebulaDashWaves(this.world);
    this.world.setResource("WaveDefinitions", waves);

    this.world.addSystem(new ClimberInputSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new MovementSystem() as any, { phase: SystemPhase.Simulation });
    this.world.addSystem(new VerticalScrollerSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new ComboSystem() as any, { phase: SystemPhase.Simulation });
    this.world.addSystem(new SpawnDirectorSystem() as any, { phase: SystemPhase.Simulation });
    this.world.addSystem(new CollisionSystem2D() as any, { phase: SystemPhase.Collision });
    this.world.addSystem(new CombatSystem() as any, { phase: SystemPhase.Collision });
    this.world.addSystem(new NebulaCollisionSystem(), { phase: SystemPhase.GameRules });
    this.world.addSystem(new Camera2DSystem() as any, { phase: SystemPhase.Presentation });
  }

  protected override async onInitializeEntities(): Promise<void> {
    const camera = this.world.createEntity();
    this.world.addComponent(camera, {
      type: "Camera2D",
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      zoom: 1,
      smoothingX: 5,
      smoothingY: 8,
      isMain: true,
      verticalDeadzone: 50
    });

    NebulaDashEntityFactory.createSpawnDirector(this.world);

    const stateEntity = this.world.createEntity();
    this.world.addComponent(stateEntity, {
      type: "NebulaDashState",
      score: 0,
      altitude: 0,
      highScore: 0,
      isGameOver: false
    } as NebulaDashStateComponent);

    const player = this.world.createEntity();
    this.world.addComponent(player, {
      type: "Transform",
      x: this.config.SCREEN_CENTER_X,
      y: this.config.SCREEN_HEIGHT - 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: this.config.SCREEN_CENTER_X,
      worldY: this.config.SCREEN_HEIGHT - 100,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    } as TransformComponent);

    this.world.addComponent(player, {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0
    } as VelocityComponent);

    this.world.addComponent(player, {
      type: "Climber",
      jumpImpulse: this.config.JUMP_IMPULSE,
      lateralSpeed: this.config.LATERAL_SPEED,
      maxAscentSpeed: 600
    });

    this.world.addComponent(player, {
      type: "Player",
      moveLeft: false,
      moveRight: false,
      jump: false
    });

    this.world.addComponent(player, {
      type: "Input",
      moveLeft: false,
      moveRight: false,
      jump: false
    });

    this.world.addComponent(player, {
      type: "Health",
      current: 1,
      max: 1,
      invulnerableRemaining: 0
    } as HealthComponent);

    this.world.addComponent(player, {
      type: "Collider",
      shape: { type: ShapeType.Circle, radius: 12 } as CircleShape,
      layer: CollisionLayers.PLAYER,
      mask: CollisionLayers.ENEMY | CollisionLayers.DEBRIS,
      enabled: true,
      isTrigger: false
    } as ColliderComponent);

    this.world.addComponent(player, {
      type: "CollisionEvents",
      collisions: [],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: []
    } as CollisionEventsComponent);

    this.world.addComponent(player, {
      type: "Combo",
      combo: 0,
      multiplier: 1,
      timerRemaining: 0,
      timerDuration: 2.0
    });

    const mutators = (this._config.gameOptions?.mutators as any[]) || [];
    for (const m of mutators) {
      if (typeof m.apply === "function") {
        m.apply(this.world);
      }
    }
  }

  public setInputState(input: any): void {
    const playerEntities = this.world.query("Player");
    const player = playerEntities[0];
    if (player !== undefined) {
      if (!this.world.hasComponent(player, "Input")) {
        this.world.addComponent(player, {
          type: "Input",
          moveLeft: false,
          moveRight: false,
          jump: false
        });
      }

      this.world.mutateComponent(player, "Input", (inputComp) => {
        if (input && typeof input === "object" && input.axes) {
          const moveX = input.axes.moveX ?? 0;
          const actions = input.actions;
          const hasAction = (name: string) =>
            actions instanceof Set ? actions.has(name) : !!actions?.includes?.(name);

          inputComp.moveLeft = moveX < 0;
          inputComp.moveRight = moveX > 0;
          inputComp.jump = hasAction("confirm") || hasAction("fire") || hasAction("jump");
        } else if (input && typeof input === "object") {
          if (input.moveLeft !== undefined) inputComp.moveLeft = !!input.moveLeft;
          if (input.moveRight !== undefined) inputComp.moveRight = !!input.moveRight;
          if (input.jump !== undefined) inputComp.jump = !!input.jump;
        }
      });
    }
  }

  public getGameState(): NebulaDashStateComponent {
    const state = this.world.getSingleton("NebulaDashState");
    let combo = 0;
    let multiplier = 1;
    let comboTimerRemaining = 0;

    const comboEntities = this.world.query("Combo");
    if (comboEntities.length > 0) {
      const comboComp = this.world.getComponent(comboEntities[0], "Combo");
      if (comboComp) {
        combo = comboComp.combo;
        multiplier = comboComp.multiplier;
        comboTimerRemaining = Math.max(0, comboComp.timerRemaining);
      }
    }

    return state
      ? { ...state, combo, multiplier, comboTimerRemaining }
      : {
          type: "NebulaDashState",
          score: 0,
          altitude: 0,
          highScore: 0,
          isGameOver: false,
          combo,
          multiplier,
          comboTimerRemaining
        };
  }

  public override update(dt: number): void {
    this.world.update(dt);
  }

  public initializeRenderer(renderer: Renderer<any, any>): void {
    initializeNebulaDashRenderer(renderer);
  }

  public isGameOver(): boolean {
    return this.getGameState().isGameOver;
  }
}
