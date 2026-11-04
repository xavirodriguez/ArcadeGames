import { BaseGame, WorldSnapshot, GameLoop, World, System, SystemPhase, InputSystem, MovementSystem, CollisionSystem2D, JuiceSystem, Renderer, RenderContext, EventRegistry, EventBus, UnifiedInputSystem, MutatorSystem, NetworkManager, LocalPredictionSystem, RemoteInterpolationSystem, HierarchySystem, TTLSystem, WebAudioPlayer, ConfigService, NullBaseGame, loadAudioAssets, InterpolationSnapshotEntry, EntitySyncDescriptor, applyServerState, preloadSharedAudioManifest, SHARED_AUDIO_MANIFEST, IAudioPlayer, Mutator, ComboComponent, MultiplayerRegistry, hasInputAction, CanonicalActionName } from "@tiny-aster/core";
import { FlappyBirdInput, FLAPPY_CONFIG, INITIAL_FLAPPY_STATE, createFlappyState, FlappyBirdState, BirdComponent, PipeComponent, FlappyBirdComponentRegistry, FlappyBirdEventRegistry } from "./types/FlappyBirdTypes";
import { FlappyBirdConfigSchema, FlappyBirdConfig as FlappyBirdConfigType, DEFAULT_FLAPPY_BIRD_CONFIG } from "./types/FlappyBirdConfigSchema";
import { ComboSystem } from "@tiny-aster/core";
import { MissionSystem } from "../shared/missions/MissionSystem";
import { FLAPPY_BIRD_MINI_MISSIONS } from "./FlappyBirdMissions";
import { applyMissionReward } from "../shared/missions/MissionHelpers";
import { FlappyBirdGameStateSystem } from "./systems/FlappyBirdGameStateSystem";
import { FlappyBirdInputSystem } from "./systems/FlappyBirdInputSystem";
import { FlappyBirdCollisionSystem } from "./systems/FlappyBirdCollisionSystem";
import { FlappyBirdGlideSystem } from "./systems/FlappyBirdGlideSystem";
import { FlappyBirdPipeMovementSystem } from "./systems/FlappyBirdPipeMovementSystem";
import { FlappyBirdRenderSystem } from "./systems/FlappyBirdRenderSystem";
import { IFlappyBirdGame } from "./types/GameInterfaces";
import { InputBufferSystem } from "./systems/FlappyBirdInputSystem";
import {
  createBird,
  createGameState,
  createGround
} from "./EntityFactory";
import { registerMutatorHook } from "../../utils/MutatorRegistry";
import { applyMutators } from "../shared/configHelper";
import { AchievementSystem } from "@tiny-aster/gameplay-kit";

/**
 * Controlador principal del juego Flappy Bird.
 *
 * @remarks
 * Implementa mecánicas de scroll infinito y generación procedural de obstáculos (tuberías).
 * Utiliza un sistema de gravedad simple y una única acción de entrada ("jump").
 */
import { ColliderComponent, CollisionEventsComponent, ShapeType, CircleShape, BoxShape, BoundaryComponent, TransformComponent, VelocityComponent, RenderComponent, HealthComponent, BlueprintDefinition, createEmitter, Theme, resolveThemeColor, EntityBuilder, THEME_RESOURCE_KEY } from "@tiny-aster/core";
import { CollisionLayers } from "@tiny-aster/gameplay-kit";
import { spawnVisualParticle as spawnCanvasParticle } from "./rendering/FlappyBirdCanvasVisuals";
import { spawnVisualParticle as spawnSkiaParticle } from "./rendering/FlappyBirdSkiaVisuals";
import { createThemeFromGameAccents } from "../../theme/gameAccents";
import { registerPixelFxProceduralVFX } from "../shared/rendering/PixelFxProceduralVFX";

export interface FlappyBirdBlueprintMap extends Record<string, BlueprintDefinition<FlappyBirdComponentRegistry, EventRegistry, unknown>> {
  bird: BlueprintDefinition<FlappyBirdComponentRegistry, EventRegistry, { x: number, y: number }>;
  pipe: BlueprintDefinition<FlappyBirdComponentRegistry, EventRegistry, {
    x: number;
    gapY: number;
    visualVariant?: "standard" | "damaged" | "rusted";
    movementType?: "static" | "oscillating" | "laser_gate";
    oscillationSpeed?: number;
    oscillationAmplitude?: number;
    isNarrowGap?: boolean;
  }>;
  ground: BlueprintDefinition<FlappyBirdComponentRegistry, EventRegistry, {}>;
  state: BlueprintDefinition<FlappyBirdComponentRegistry, EventRegistry, {}>;
}

export class FlappyBirdGame
  extends BaseGame<FlappyBirdState, FlappyBirdInput, FlappyBirdComponentRegistry, FlappyBirdEventRegistry, FlappyBirdBlueprintMap>
  implements IFlappyBirdGame {

  private gameStateSystem!: FlappyBirdGameStateSystem;
  private missionSystem!: MissionSystem;
  private networkManager!: NetworkManager<FlappyBirdComponentRegistry>;
  public readonly gameId = "flappybird";
  private baseConfig: FlappyBirdConfigType;
  private config: FlappyBirdConfigType;
  public isMultiplayer = false;
  private activeRendererType: "canvas" | "skia" = "canvas";

  constructor(config: { isMultiplayer?: boolean, seed?: number, gameOptions?: Record<string, unknown>, audio?: IAudioPlayer, theme?: Theme } = {}) {
    const seed = config.gameOptions?.seed as number || config.seed;
    super({
      pauseKey: DEFAULT_FLAPPY_BIRD_CONFIG.KEYS.PAUSE,
      restartKey: DEFAULT_FLAPPY_BIRD_CONFIG.KEYS.RESTART,
      isMultiplayer: config.isMultiplayer,
      theme: config.theme ?? createThemeFromGameAccents("flappy-bird"),
      gameOptions: { ...config.gameOptions, seed },
      audio: config.audio || new WebAudioPlayer()
    });
    this.baseConfig = ConfigService.load<FlappyBirdConfigType>(
      this.gameId,
