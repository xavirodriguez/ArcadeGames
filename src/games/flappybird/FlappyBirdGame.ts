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
