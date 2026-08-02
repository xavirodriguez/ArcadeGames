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
export * from "./snapshots/SnapshotSerializerSoA";
export * from "./snapshots/SnapshotRestoreSoA";
export * from "./ecs/ComponentCloner";
export * from "./scenes/Scene";
export * from "./scenes/SceneManager";

// Events
export * from "./events/EventBus";

// Input
export * from "./input/InputSystem";
export * from "./input/UnifiedInputSystem";

// Debug
export * from "./ui/debug/DebugManager";
export * from "./debug/ReplayRecorder";

// Loop & Runtime
export * from "./loop/GameLoop";
export * from "./loop/FrameScheduler";
export * from "./runtime/BaseGame";
export * from "./runtime/IGame";

// Assets & Audio
export * from "./assets/AssetLoader";
export * from "./audio/IAudioPlayer";
export * from "./audio/IHapticDevice";

// Physics
export * from "./physics/systems/MovementSystem";
export * from "./physics/systems/FrictionSystem";
export * from "./physics/systems/BoundarySystem";
export * from "./physics/collision/CollisionSystems";
export * from "./physics/collision/CollisionTypes";
export * from "./physics/utils/PhysicsUtils";
export * from "./physics/utils/ShipPhysics";
export * from "./physics/shapes/Shapes";
export * from "./physics/query/PhysicsQuery";
export * from "./physics/dynamics/PhysicsIntegrateSystem";
export * from "./physics/dynamics/PhysicsSolveSystem";

// Rendering
export * from "./rendering/Renderer";
export * from "./rendering/RenderTypes";
export * from "./rendering/RenderSnapshot";
export * from "./rendering/RenderCommandBuffer";
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
export * from "./systems/ParallaxSystem";
export * from "./systems/StateMachineSystem";
export * from "./systems/TilemapRenderSystem";

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

// Config
export * from "./config/ConfigService";
export * from "./config/BaseConfigSchema";

// Utils
export * from "./utils/logger";
export * from "./utils/RandomService";
export * from "./utils/Juice";
export * from "./utils/ObjectPool";
export * from "./utils/ComponentSetPool";
export * from "./utils/PrefabPool";
export * from "./utils/ProjectilePool";

export type { DeepReadonly } from "./ecs/Component";
