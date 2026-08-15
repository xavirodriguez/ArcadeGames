/**
 * @packageDocumentation
 * TinyAster Core: A lightweight, extensible ECS engine designed for
 * arcade-style games.
 *
 * @remarks
 * This package provides the foundational building blocks for entities,
 * components, systems, and world management. It is intended to support
 * reproducible simulations under controlled conditions (e.g., fixed timestep,
 * seeded RNG, and avoidance of asynchronous side effects in core logic).
 */

// ECS Core
export * from "./ecs/Entity";
export * from "./ecs/Component";
export * from "./ecs/World";
export * from "./ecs/Query";
export * from "./ecs/System";
export * from "./ecs/Schedule";
export * from "./ecs/WorldCommandBuffer";
export * from "./ecs/BlueprintRegistry";
export * from "./ecs/CoreComponents";
export * from "./ecs/TagComponent";
export * from "./snapshots/WorldSnapshot";
export * from "./snapshots/SnapshotSerializer";
export * from "./snapshots/SnapshotRestore";
export * from "./snapshots/SnapshotSerializerSoA";
export * from "./snapshots/SnapshotRestoreSoA";
export * from "./snapshots/SnapshotBuffer";
export * from "./ecs/ComponentCloner";
export * from "./scenes/Scene";
export * from "./scenes/CutsceneScene";
export * from "./scenes/SceneManager";
export * from "./scenes/TransitionTypes";
export * from "./scenes/transitions/FadeTransition";
export * from "./scenes/transitions/IrisTransition";
export * from "./scenes/transitions/DitherTransition";
export * from "./scenes/transitions/PixelateTransition";
export * from "./scenes/transitions/ScanlineWipeTransition";
export * from "./scenes/transitions/CrossfadeTransition";
export * from "./scenes/transitions/CurtainTransition";
export * from "./scenes/transitions/RetroGridTransition";
export * from "./scenes/transitions/DiagonalSweepTransition";
export * from "./scenes/transitions/RadialWipeTransition";
export * from "./scenes/transitions/CRTGlitchTransition";
export * from "./scenes/transitions/DangerPulseTransition";
export * from "./scenes/transitions/TransitionRegistry";

// Events
export * from "./events/EventBus";

// Input
export * from "./input/InputSystem";
export * from "./input/UnifiedInputSystem";

// Loop & Runtime
export * from "./loop/GameLoop";
export * from "./loop/FrameScheduler";
export * from "./runtime/BaseGame";
export * from "./runtime/IGame";
export * from "./runtime/Simulation";
export * from "./runtime/GameDefinition";
export * from "./runtime/GameSession";
export * from "./runtime/ArcadeKernel";

// Input
export * from "./input/InputSystem";
export * from "./input/UnifiedInputSystem";
export * from "./input/InputFrame";

// Assets & Audio
export * from "./assets/AssetLoader";
export * from "./assets/WebAssetProvider";
export * from "./audio/IAudioPlayer";
export * from "./audio/WebAudioPlayer";
export * from "./audio/IHapticDevice";

// AI
export * from "./ai/FactionComponent";
export * from "./ai/SteeringComponent";
export * from "./ai/SteeringSystem";

// Physics
export * from "./physics/PhysicsTypes";
export * from "./physics/systems/MovementSystem";
export * from "./physics/systems/FrictionSystem";
export * from "./physics/systems/BoundarySystem";
export * from "./physics/systems/PlatformerMovementSystem";
export * from "./physics/systems/PlatformerGravitySystem";
export * from "./physics/systems/TileCollisionSystem";
export * from "./physics/systems/MovingPlatformSystem";
export * from "./physics/systems/PlatformCarrySystem";
export * from "./physics/collision/BroadPhase";
export * from "./physics/collision/CollisionSystems";
export * from "./physics/collision/BroadPhase";
export * from "./physics/collision/CollisionTypes";
export * from "./physics/utils/PhysicsUtils";
export * from "./physics/utils/ShipPhysics";
export * from "./physics/shapes/Shapes";
export * from "./physics/query/PhysicsQuery";
export * from "./physics/dynamics/PhysicsIntegrateSystem";
export * from "./physics/dynamics/PhysicsSolveSystem";

// Rendering
export * from "./rendering/Renderer";
export * from "./rendering/RendererUtils";
export * from "./rendering/RenderTypes";
export * from "./rendering/RenderSnapshot";
export * from "./rendering/RenderCommandBuffer";
export * from "./rendering/RenderPipeline";
export * from "./rendering/Camera2D";

// Systems
export * from "./systems/BaseGameStateSystem";
export * from "./systems/SpatialCullingSystem";
export * from "./systems/JuiceSystem";
export * from "./systems/TTLSystem";
export * from "./systems/InvulnerabilitySystem";
export * from "./systems/SpatialPartitioningSystem";
export * from "./systems/RenderUpdateSystem";
export * from "./systems/TrailSystem";
export * from "./systems/ParticleSystem";
export * from "./systems/AnimationSystem";
export * from "./systems/FeedbackSystem";
export * from "./systems/HierarchySystem";
export * from "./systems/AbstractHierarchySystem";
export * from "./systems/MutatorSystem";
export * from "./systems/ScreenShakeSystem";
export * from "./systems/StateMachineSystem";
export * from "./systems/TilemapRenderSystem";
export * from "./systems/PlatformerCoyoteSystem";
export * from "./systems/HitDetectionSystem";

// Network
export * from "./network/NetworkTransport";
export * from "./network/NullTransport";
export * from "./network/NetworkManager";
export * from "./network/LocalPredictionSystem";
export * from "./network/RemoteInterpolationSystem";
export * from "./network/types";
export * from "./network/MultiplayerSystems";
export * from "./network/NetTypes";
export * from "./network/NetworkController";
export * from "./network/ReplaySystem";

// Config
export * from "./config/ConfigService";
export * from "./config/BaseConfigSchema";

// Utils
export * from "./utils/RandomService";
export * from "./utils/Juice";
export * from "./utils/ObjectPool";
export * from "./utils/ComponentSetPool";
export * from "./utils/PrefabPool";
export * from "./utils/ProjectilePool";

// Deterministic Pure Replay System
export { Replay } from "./replay/DeterministicReplay";
export { DeterministicReplayRecorder } from "./replay/DeterministicReplay";
export { DeterministicReplayPlayer } from "./replay/DeterministicReplay";
export { DivergenceDetector } from "./replay/DivergenceDetector";
export { RollbackSimulation } from "./network/RollbackSimulation";
export { MultiplayerReconciler } from "./network/MultiplayerReconciler";
export { InputValidator } from "./network/InputValidator";

// Story Domain Engine
export * from "./story/StoryTypes";
export * from "./story/StoryRuntime";

// Level 3 Systems
export * from "./systems/CollectibleSystem";
export * from "./systems/CheckpointSystem";
export * from "./systems/DeathSystem";
export * from "./systems/RespawnSystem";
export * from "./systems/EnemySensorSystem";
export * from "./systems/EnemyBehaviorRegistry";
export * from "./systems/SegmentGenerator";

export type { DeepReadonly } from "./ecs/Component";
