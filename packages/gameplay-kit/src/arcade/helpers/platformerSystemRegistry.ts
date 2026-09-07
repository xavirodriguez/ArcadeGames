import {
  World,
  SystemPhase,
  PlatformerMovementSystem,
  PlatformerGravitySystem,
  PlatformerCoyoteSystem,
  MovingPlatformSystem,
  PlatformCarrySystem,
  EnemySensorSystem,
  StateMachineSystem,
  CheckpointSystem,
  DeathSystem,
  RespawnSystem,
  PhysicsIntegrateSystem,
  TileCollisionSystem,
  CollectibleSystem,
  HitDetectionSystem,
  Camera2DSystem,
  TilemapRenderSystem
} from "@tiny-aster/core";

export interface RegisterPlatformerSystemsOptions {
  /**
   * Whether to include MovingPlatformSystem and PlatformCarrySystem in SystemPhase.Simulation.
   */
  includeMovingPlatforms?: boolean;
}

/**
 * Registers the common core arcade gameplay systems for platformer / runner games (EchoRunner, Platformer).
 *
 * @param world - The ECS World instance to register systems into.
 * @param options - Optional configuration flags (e.g. enabling moving platforms).
 */
export function registerCommonPlatformerSystems(
  world: World<any>,
  options: RegisterPlatformerSystemsOptions = {}
): void {
  // Simulation phase - Movement & Physics
  world.addSystem(new PlatformerMovementSystem(), { phase: SystemPhase.Simulation });
  world.addSystem(new PlatformerGravitySystem(), { phase: SystemPhase.Simulation });
  world.addSystem(new PlatformerCoyoteSystem(), { phase: SystemPhase.Simulation });

  if (options.includeMovingPlatforms) {
    world.addSystem(new MovingPlatformSystem(), { phase: SystemPhase.Simulation });
    world.addSystem(new PlatformCarrySystem(), { phase: SystemPhase.Simulation });
  }

  // Simulation phase - Logic & Rules
  world.addSystem(new EnemySensorSystem(), { phase: SystemPhase.Simulation });
  world.addSystem(new StateMachineSystem(), { phase: SystemPhase.Simulation });
  world.addSystem(new CheckpointSystem(), { phase: SystemPhase.Simulation });
  world.addSystem(new DeathSystem(), { phase: SystemPhase.Simulation });
  world.addSystem(new RespawnSystem(), { phase: SystemPhase.Simulation });

  // Physics Integration (priority -10 ensures it runs at the end of Simulation phase)
  world.addSystem(new PhysicsIntegrateSystem(), { phase: SystemPhase.Simulation, priority: -10 });

  // Collision phase
  world.addSystem(new TileCollisionSystem(), { phase: SystemPhase.Collision });
  world.addSystem(new CollectibleSystem(), { phase: SystemPhase.Collision });
  world.addSystem(new HitDetectionSystem(), { phase: SystemPhase.Collision });

  // Presentation phase
  world.addSystem(new Camera2DSystem(), { phase: SystemPhase.Presentation });
  world.addSystem(new TilemapRenderSystem(), { phase: SystemPhase.Presentation });
}
