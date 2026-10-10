import {
  BaseGame,
  ConfigService,
  SystemPhase,
  Renderer,
  RendererUtils,
  World,
  System,
  preloadSharedAudioManifest,
  SHARED_AUDIO_MANIFEST,
  WebAudioPlayer
} from "@tiny-aster/core";
import { createThemeFromGameAccents } from "../../theme/gameAccents";
import { loadAndMutateConfig, runWithUnlockedRandomAndMutators } from "../shared/configHelper";

import { OutrunConfigSchema, OutrunConfig } from "./types/OutrunConfigSchema";
import {
  OutrunComponentRegistry,
  OutrunEventRegistry,
  OutrunInput,
  RaceStateComponent,
  RoadSegment,
  RoadData
} from "./types/OutrunTypes";

import { RacerInputSystem } from "./systems/RacerInputSystem";
import { RoadAdvanceSystem } from "./systems/RoadAdvanceSystem";
import { TrafficSystem } from "./systems/TrafficSystem";
import {
  drawOutrunRoad,
  drawOutrunCar,
  drawOutrunRacer,
  drawOutrunHud
} from "./rendering/OutrunCanvasVisuals";
import {
  drawSkiaOutrunRoad,
  drawSkiaOutrunCar,
  drawSkiaOutrunRacer,
  drawSkiaOutrunHud
} from "./rendering/OutrunSkiaVisuals";

import outrunConfigRaw from "./config/outrun.json";

/**
 * Pseudo-3D Out Run style racing game.
 * Simulation is fully deterministic and independent of Canvas/Skia.
 */
export class OutrunGame extends BaseGame<
  RaceStateComponent,
  OutrunInput,
  OutrunComponentRegistry,
  OutrunEventRegistry,
  Record<string, never>
> {
  public readonly gameId = "outrun";
  private config: OutrunConfig;
  private baseConfig: OutrunConfig;

  constructor(
    options: {
      seed?: number;
      gameOptions?: Record<string, unknown>;
      audio?: import("@tiny-aster/core").IAudioPlayer;
      headless?: boolean;
    } = {}
  ) {
    super({
      pauseKey: "Escape",
      theme: createThemeFromGameAccents("racing"),
      gameOptions: { ...options.gameOptions, seed: options.gameOptions?.seed ?? options.seed },
      audio: options.audio ?? new WebAudioPlayer(),
      headless: options.headless
    });
    this.baseConfig = ConfigService.load<OutrunConfig>(
      this.gameId,
      OutrunConfigSchema,
      outrunConfigRaw
    );
    this.config = this.baseConfig;
  }

  protected override async onRegisterSystems(): Promise<void> {
    this.config = loadAndMutateConfig(
      this.gameId,
      OutrunConfigSchema,
      outrunConfigRaw,
      this._config.gameOptions
    );
    this.world.setResource("GameConfig", this.config);

    let segments: RoadSegment[] = [];
    runWithUnlockedRandomAndMutators(this.world, this._config.gameOptions, () => {
      segments = this.generateRoad(this.config, this.world);
    });
    const trackLength = segments.reduce((sum, s) => sum + s.length, 0);
    const roadData: RoadData = { segments, trackLength };
    this.world.setResource("RoadData", roadData);

    this.unifiedInput.bind("accelerate", ["ArrowUp", "KeyW", "Space"]);
    this.unifiedInput.bind("brake", ["ArrowDown", "KeyS"]);
    this.unifiedInput.bind("left", ["ArrowLeft", "KeyA"]);
    this.unifiedInput.bind("right", ["ArrowRight", "KeyD"]);

    if (this.unifiedInput instanceof System) {
      this.world.addSystem(
        this.unifiedInput as System<OutrunComponentRegistry, OutrunEventRegistry>,
        { phase: SystemPhase.Input }
      );
    }

    this.world.addSystem(new RacerInputSystem(), { phase: SystemPhase.Input });
    this.world.addSystem(new RoadAdvanceSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new TrafficSystem(), { phase: SystemPhase.Simulation });
  }

  protected override async onInitializeEntities(): Promise<void> {
    runWithUnlockedRandomAndMutators(this.world, this._config.gameOptions, () => {
      const stateEntity = this.world.createEntity();
      this.world.addComponent(stateEntity, {
        type: "RaceState",
        playerZ: 0,
        playerX: 0,
        speed: 0,
        lapTime: 0,
        isGameOver: false,
        position: 1,
        currentSegment: 0
      } satisfies RaceStateComponent);

      const roadEntity = this.world.createEntity();
      this.world.addComponent(roadEntity, { type: "RoadRoot" });
      this.world.addComponent(roadEntity, {
        type: "Render",
        shape: "road",
        order: -10,
        visible: true,
        opacity: 1,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0
      });
            // TODO(refactor): código duplicado detectado (bloque) con outrun/OutrunGame.ts:169-184. Considerar extraer a función compartida. Ref: 6b94ad6a
this.world.addComponent(roadEntity, {
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
      });

      const carEntity = this.world.createEntity();
      this.world.addComponent(carEntity, {
        type: "Render",
        shape: "outrun_car",
        order: 10,
        visible: true,
        opacity: 1,
        rotation: 0,
        angularVelocity: 0,
        hitFlashFrames: 0,
        color: "#e63946"
      });
      this.world.addComponent(carEntity, {
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
      });

      const rng = this.world.gameplayRandom;
      const roadData = this.world.getResource<RoadData>("RoadData")!;
      const numTraffic = 8;
      for (let i = 0; i < numTraffic; i++) {
        const z = (i + 1) * (roadData.trackLength / (numTraffic + 2));
        const lateralX = (rng.next() - 0.5) * 1.4;
        const speed = this.config.maxSpeed * (0.35 + rng.next() * 0.4);
        const colorIndex = Math.floor(rng.next() * 5);

        const ent = this.world.createEntity();
        this.world.addComponent(ent, {
          type: "Racer",
          z,
          lateralX,
          speed,
          colorIndex,
          active: true
        });
        this.world.addComponent(ent, {
          type: "Render",
          shape: "outrun_racer",
          order: 5,
          visible: true,
          opacity: 1,
          rotation: 0,
          angularVelocity: 0,
          hitFlashFrames: 0
        });
        this.world.addComponent(ent, {
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
        });
      }
    });
  }

  private generateRoad(
    config: OutrunConfig,
    world: World<OutrunComponentRegistry, OutrunEventRegistry>
  ): RoadSegment[] {
    const segments: RoadSegment[] = [];
    const segLen = config.segmentLength;
    const rng = world.gameplayRandom;

    const add = (count: number, curve: number, hill: number) => {
      for (let i = 0; i < count; i++) {
        segments.push({
          index: segments.length,
          length: segLen,
          curve,
          hill
        });
      }
    };

    add(40, 0, 0);
    add(30, 2, 0);
    add(25, 0, 1.5);
    add(35, -3, -1);
    add(20, 0, 0);
    add(20, 4, 0);
    add(20, -4, 0);
    add(30, 0, 3);
    add(25, 2, -2);
    add(50, 0, 0);

    for (let k = 0; k < 4; k++) {
      const curve = (rng.next() - 0.5) * 6;
      const hill = (rng.next() - 0.5) * 4;
      const len = 15 + Math.floor(rng.next() * 25);
      add(len, curve, hill);
      add(10 + Math.floor(rng.next() * 15), 0, 0);
    }

    for (let i = 0; i < segments.length; i++) {
      segments[i].index = i;
    }

    return segments;
  }

  public override update(dt: number): void {
    this.world.update(dt);
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  public initializeRenderer(renderer: Renderer<OutrunComponentRegistry, any>): void {
    RendererUtils.registerAssets(renderer, {
      canvas: (r) => {
        r.registerShape("road", drawOutrunRoad);
        r.registerShape("outrun_car", drawOutrunCar);
        r.registerShape("outrun_racer", drawOutrunRacer);
        r.registerBackgroundEffect("outrun_hud", drawOutrunHud);
      },
      skia: (r) => {
        r.registerShape("road", drawSkiaOutrunRoad);
        r.registerShape("outrun_car", drawSkiaOutrunCar);
        r.registerShape("outrun_racer", drawSkiaOutrunRacer);
        r.registerBackgroundEffect("outrun_hud", drawSkiaOutrunHud);
      }
    });
  }

  public getGameState(): RaceStateComponent {
    const state = this.world.getSingleton("RaceState");
    return state
      ? { ...state }
      : {
          type: "RaceState",
          playerZ: 0,
          playerX: 0,
          speed: 0,
          lapTime: 0,
          isGameOver: false,
          position: 1,
          currentSegment: 0
        };
  }

  public override isGameOver(): boolean {
    const state = this.world.getSingleton("RaceState");
    return state?.isGameOver ?? false;
  }

  protected override async onPreloadAssets(): Promise<void> {
    await preloadSharedAudioManifest(this.audio);
  }
}

export const OutrunDefinition = {
  name: "outrun",
  createSimulation: (seed: number) => {
    return new OutrunGame({ seed, headless: true });
  },
  inputSchema: {
    actions: ["accelerate", "brake", "left", "right"],
    axes: ["steer", "throttle"]
  },
  assets: {
    sprites: [],
    sounds: SHARED_AUDIO_MANIFEST
  }
};
