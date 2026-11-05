import type { ComponentRegistry } from "./Component";
import type { EventRegistry } from "../events/EventBus";
import { SystemPhase } from "./System";
import type { System, SystemConfig } from "./System";
import type { World, BlueprintRegistryMap } from "./World";
import { GameErrorReporter, normalizeError, ENGINE_VERSION, GameErrorPhase } from "../diagnostics";

/**
 * Diagnostic context options provided to Schedule for error reporting.
 * @public
 */
export interface ScheduleErrorContext {
  gameId?: string;
  sessionId?: string;
  gitCommit?: string;
  deploymentId?: string;
  environment?: string;
}

/**
 * Orchestrates and executes registered ECS systems sequentially grouped by phases and sorted by priority.
 *
 * @public
 */
export class Schedule<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents, TEvents> = BlueprintRegistryMap<TComponents, TEvents>
> {
  private systems: { system: System<TComponents, TEvents>; phase: string; priority: number; group?: string }[] = [];
  private phases: string[];
  private phasedSystems = new Map<string, { system: System<TComponents, TEvents>; phase: string; priority: number; group?: string }[]>();
  private errorReporter?: GameErrorReporter;
  private errorContext: ScheduleErrorContext = {};

  public setErrorReporter(reporter: GameErrorReporter, context: ScheduleErrorContext = {}): void {
    this.errorReporter = reporter;
    this.errorContext = context;
  }

  constructor(phases?: string[]) {
    this.phases = phases ?? [
      SystemPhase.Input,
      SystemPhase.Simulation,
      SystemPhase.Transform,
      SystemPhase.Collision,
      SystemPhase.GameRules,
      SystemPhase.Presentation
    ];
    this.rebuildPhasedSystems();
  }

  private rebuildPhasedSystems(): void {
    this.phasedSystems.clear();
    for (const phase of this.phases) {
      const list = this.systems
        .filter(s => s.phase === phase)
        .sort((a, b) => b.priority - a.priority);
      this.phasedSystems.set(phase, list);
    }
  }

  public addSystem(
    system: System<TComponents, TEvents>,
    config: SystemConfig = {},
    world: World<TComponents, TEvents, TBlueprints>
  ): void {
    this.systems.push({
      system,
      phase: (config.phase as string) ?? SystemPhase.Simulation,
      priority: config.priority ?? 0,
      group: config.group
    });

    try {
      if (system && typeof system.onRegister === "function") {
        system.onRegister(world);
      } else {
        throw new TypeError("system.onRegister is not a function");
      }
    } catch (error: unknown) {
      const err = normalizeError(error);
      if (this.errorReporter) {
        this.errorReporter.report({
          timestamp: Date.now(),
          error: err,
          context: this.buildErrorContext("registration", system?.constructor?.name ?? "unknown")
        });
      }
      throw err;
    }

    this.rebuildPhasedSystems();
  }

  private buildErrorContext(phase: GameErrorPhase, systemName: string) {
    return {
      gameId: this.errorContext.gameId ?? "unknown",
      engineVersion: ENGINE_VERSION,
      sessionId: this.errorContext.sessionId ?? "unknown",
      phase,
      system: systemName,
      gitCommit: this.errorContext.gitCommit,
      deploymentId: this.errorContext.deploymentId,
      environment: this.errorContext.environment
    };
  }

  public getSystems(): System<TComponents, TEvents>[] {
    return this.systems.map(s => s.system);
  }

  public clearSystems(): void {
    let firstError: Error | null = null;

    for (const s of this.systems) {
      try {
        if (s?.system && typeof s.system.dispose === "function") {
          s.system.dispose();
        } else {
          throw new TypeError("s.system.dispose is not a function");
        }
      } catch (error: unknown) {
        const err = normalizeError(error);
        if (!firstError) {
          firstError = err;
        }
        if (this.errorReporter) {
          this.errorReporter.report({
            timestamp: Date.now(),
            error: err,
            context: this.buildErrorContext("shutdown", s?.system?.constructor?.name ?? "unknown")
          });
        }
      }
    }

    this.systems = [];
    this.rebuildPhasedSystems();

    if (firstError) {
      throw firstError;
    }
  }

  public update(
    world: World<TComponents, TEvents, TBlueprints>,
    deltaTime: number
  ): void {
    world.isUpdating = true;
    if (world.gameplayRandom) {
      world.gameplayRandom.unlock();
    }
    try {
      const timeScaleRes = world.getResource<import("../runtime/TimeScale").TimeScale>("TimeScale") || world.getResource<{ scale?: number; remainingDuration?: number }>("TimeScale");
      let effectiveTimeScale = 1.0;

      if (timeScaleRes) {
        if (typeof timeScaleRes.scale === "number") {
          effectiveTimeScale = timeScaleRes.scale;
        }
        if (typeof timeScaleRes.remainingDuration === "number") {
          timeScaleRes.remainingDuration = Math.max(0, timeScaleRes.remainingDuration - deltaTime);
          if (timeScaleRes.remainingDuration <= 0) {
            timeScaleRes.scale = 1.0;
            timeScaleRes.remainingDuration = undefined;
          }
        }
      }

      // Freeze eligibility is latched at the beginning of the tick. A finite
      // freeze that reaches zero during this update still owns the whole tick;
      // it is removed only after all phases have observed the frozen state.
      const freeze = world.getResource<{ remaining?: number }>("GameplayFreeze");
      const isPausedResource = world.getResource("IsPaused") === true;
      const hasActiveGameplayFreeze =
        freeze !== undefined &&
        (typeof freeze.remaining !== "number" || freeze.remaining > 0);
      const isFrozen = hasActiveGameplayFreeze || isPausedResource || effectiveTimeScale === 0;
      if (freeze && typeof freeze.remaining === "number") {
        freeze.remaining = Math.max(0, freeze.remaining - deltaTime);
      }
      const scaledDeltaTime = deltaTime * effectiveTimeScale;

      const gameState = world.getSingleton("GameState" as Extract<keyof TComponents, string>) as unknown as { phase?: string } | undefined;
      let activeGroups = world.getResource<string[]>("ActiveGroups");
      if (gameState && gameState.phase) {
        if (gameState.phase === "PLAYING") {
          activeGroups = ["simulation", "presentation"];
        } else if (gameState.phase === "WAVE_TRANSITION") {
          activeGroups = ["transition", "presentation"];
        } else if (gameState.phase === "MUTATOR_DRAFT") {
          activeGroups = ["draft", "presentation"];
        }
      }

      for (const phase of this.phases) {
        if (isFrozen) {
          if (phase === SystemPhase.Input || phase === SystemPhase.Transform || phase === SystemPhase.Collision || phase === SystemPhase.GameRules) {
            continue;
          }
        }

        const phaseSystems = this.phasedSystems.get(phase);
        if (phaseSystems) {
          for (let i = 0; i < phaseSystems.length; i++) {
            const sysRecord = phaseSystems[i];
            const sys = sysRecord.system;
            const className = sys.constructor.name;
            if (isFrozen && phase === SystemPhase.Simulation && !sys.runsWhileFrozen && className !== "TTLSystem" && className !== "JuiceSystem" && className !== "ParticleSystem") {
              continue;
            }
            if (activeGroups && sysRecord.group && !activeGroups.includes(sysRecord.group)) {
              continue;
            }
            const dtToPass = (phase === SystemPhase.Presentation || sys.runsWhileFrozen || className === "TTLSystem" || className === "JuiceSystem" || className === "ParticleSystem")
              ? deltaTime
              : scaledDeltaTime;
            sys.update(world, dtToPass);
          }
        }
      }

      // Expire only the exact resource observed at tick start. This avoids
      // deleting a replacement freeze installed by a system during the tick.
      if (
        freeze &&
        typeof freeze.remaining === "number" &&
        freeze.remaining <= 0 &&
        world.getResource("GameplayFreeze") === freeze
      ) {
        world.deleteResource("GameplayFreeze");
      }

      const eventBus = world.getEventBus ? world.getEventBus() : null;
      if (eventBus && typeof eventBus.flushDeferred === "function") {
        eventBus.flushDeferred();
      }
    } finally {
      world.isUpdating = false;
      if (world.gameplayRandom) {
        world.gameplayRandom.lock();
      }
    }
    world.flush();
  }
}
