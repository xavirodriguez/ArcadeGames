import { ArcadeKernel, ArcadeState } from "../runtime/ArcadeKernel";
import {
  MiniGameEncounter,
  MiniGameResult,
  MiniGameRunContext,
  StoryRuntimeSnapshot
} from "./ArcadeIntegrationTypes";
import { MiniGameModifierResolver } from "./MiniGameModifierResolver";
import { OutcomeRuleEngine } from "./OutcomeRuleEngine";
import { StoryEffectApplier } from "./StoryEffectApplier";
import { StoryRuntime } from "./StoryRuntime";
import { StoryEffect } from "./StoryTypes";

/**
 * Valid states for the ArcadeOrchestrator state machine.
 *
 * @remarks
 * State mapping to `ArcadeState` in `ArcadeKernel`:
 * - `idle`      -\> `ArcadeState.MENU` / `ArcadeState.STORY` / `ArcadeState.TITLE`
 * - `loading`   -\> `ArcadeState.LOADING`
 * - `playing`   -\> `ArcadeState.PLAYING`
 * - `resolving` -\> `ArcadeState.PLAYING` / transition to `ArcadeState.STORY` / `ArcadeState.GAME_OVER`
 * - `failed`    -\> `ArcadeState.GAME_OVER` / `ArcadeState.MENU`
 * - `aborted`   -\> `ArcadeState.MENU` / `ArcadeState.STORY`
 *
 * @public
 */
export type OrchestratorState =
  | "idle"
  | "loading"
  | "playing"
  | "resolving"
  | "failed"
  | "aborted";

/**
 * Options required to initialize `ArcadeOrchestrator`.
 *
 * @public
 */
export interface ArcadeOrchestratorOptions {
  /** Optional narrative StoryRuntime instance. */
  readonly runtime?: StoryRuntime;
  /** Optional ArcadeKernel instance for global state synchronization. */
  readonly kernel?: ArcadeKernel;
  /** Optional custom resolver for computing minigame modifiers from story state. */
  readonly resolver?: MiniGameModifierResolver;
  /** Optional custom rule engine for evaluating run outcomes. */
  readonly ruleEngine?: OutcomeRuleEngine;
  /** Optional custom applier for mutating story state based on rule effects. */
  readonly effectApplier?: StoryEffectApplier;
}

/**
 * State machine managing narrative-driven minigame execution lifecycles.
 *
 * @remarks
 * Coordinates minigame context setup, single-execution resolution, abort/failure handling,
 * and rule-based narrative state mutation while remaining fully decoupled from frontend UI.
 *
 * @public
 */
export class ArcadeOrchestrator {
  private state: OrchestratorState = "idle";
  private activeContext: MiniGameRunContext | null = null;
  private activeEncounter: MiniGameEncounter | null = null;
  private hasResolvedCurrentRun: boolean = false;

  private readonly runtime?: StoryRuntime;
  private readonly kernel?: ArcadeKernel;
  private readonly resolver: MiniGameModifierResolver;
  private readonly ruleEngine: OutcomeRuleEngine;
  private readonly effectApplier: StoryEffectApplier;

  constructor(options: ArcadeOrchestratorOptions = {}) {
    this.runtime = options.runtime;
    this.kernel = options.kernel;
    this.resolver = options.resolver ?? new MiniGameModifierResolver();
    this.ruleEngine = options.ruleEngine ?? new OutcomeRuleEngine();
    this.effectApplier = options.effectApplier ?? new StoryEffectApplier();
  }

  /**
   * Retrieves current orchestrator state machine state.
   */
  public getState(): OrchestratorState {
    return this.state;
  }

  /**
   * Retrieves active minigame run context, if any.
   */
  public getActiveContext(): MiniGameRunContext | null {
    return this.activeContext;
  }

  /**
   * Begins a new minigame run for an encounter given a narrative state snapshot.
   *
   * @param encounter - MiniGameEncounter definition to execute.
   * @param snapshot - Read-only snapshot of current StoryState.
   * @param sourceStoryNodeId - Optional ID of narrative node initiating the run.
   * @param seedOverride - Optional seed override.
   * @returns Generated MiniGameRunContext.
   * @throws Error if another run is currently active.
   */
  public startRun(
    encounter: MiniGameEncounter,
    snapshot: StoryRuntimeSnapshot,
    sourceStoryNodeId?: string,
    seedOverride?: number
  ): MiniGameRunContext {
    if (this.state === "loading" || this.state === "playing" || this.state === "resolving") {
      throw new Error(`[ArcadeOrchestrator] Cannot start new run while active run is in state '${this.state}'.`);
    }

    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const modifiers = this.resolver.resolve(snapshot, encounter);
    const seed = seedOverride ?? (typeof snapshot.variables.seed === "number" ? snapshot.variables.seed : Date.now());

    this.activeEncounter = encounter;
    this.hasResolvedCurrentRun = false;
    this.activeContext = {
      runId,
      encounterId: encounter.id,
      sourceStoryNodeId: sourceStoryNodeId ?? snapshot.currentNodeId ?? undefined,
      gameId: encounter.gameId,
      seed,
      config: encounter.baseConfig ?? {},
      modifiers
    };

    this.state = "loading";
    this.syncKernelState(ArcadeState.LOADING, { runId, gameId: encounter.gameId });

    return this.activeContext;
  }

  /**
   * Signals that minigame assets/stage host have finished initializing and simulation has started.
   */
  public notifyPlaying(): void {
    if (this.state !== "loading") return;
    this.state = "playing";
    this.syncKernelState(ArcadeState.PLAYING, { runId: this.activeContext?.runId });
  }

  /**
   * Submits minigame results for evaluation and narrative effect execution.
   *
   * @param result - MiniGameResult payload from minigame adapter.
   * @returns Evaluated StoryEffects if successfully resolved, or null if ignored.
   */
  public submitResult(result: MiniGameResult): StoryEffect[] | null {
    // Ignore result if runId does not match current active run
    if (!this.activeContext || result.runId !== this.activeContext.runId) {
      return null;
    }

    // Guarantee a result is only resolved once
    if (this.hasResolvedCurrentRun || this.state === "resolving" || this.state === "idle") {
      return null;
    }

    if (this.state !== "playing" && this.state !== "loading") {
      return null;
    }

    this.state = "resolving";
    this.hasResolvedCurrentRun = true;

    const outcomeRules = this.activeEncounter?.outcomeRules ?? [];
    const effects = this.ruleEngine.evaluate(result, outcomeRules);

    if (this.runtime) {
      this.effectApplier.applyEffects(this.runtime, effects);
    }

    this.state = "idle";
    this.syncKernelState(ArcadeState.STORY, {
      runId: result.runId,
      completed: result.completed,
      score: result.score
    });

    return effects;
  }

  /**
   * Aborts active minigame run execution.
   *
   * @param reason - Optional description of abort reason.
   */
  public abort(reason?: string): void {
    if (this.state === "idle" || this.state === "aborted") return;

    this.state = "aborted";
    this.syncKernelState(ArcadeState.MENU, { reason: reason ?? "user_aborted" });
  }

  /**
   * Reports a loading or runtime execution error from minigame adapter.
   *
   * @param error - Error encountered during run.
   */
  public reportError(error: Error | string): void {
    this.state = "failed";
    const errorMessage = typeof error === "string" ? error : error.message;
    this.syncKernelState(ArcadeState.GAME_OVER, { error: errorMessage });
  }

  /**
   * Resets orchestrator to idle state.
   */
  public reset(): void {
    this.state = "idle";
    this.activeContext = null;
    this.activeEncounter = null;
    this.hasResolvedCurrentRun = false;
  }

  private syncKernelState(nextArcadeState: ArcadeState, payload?: Record<string, unknown>): void {
    if (!this.kernel) return;
    try {
      this.kernel.transitionTo(nextArcadeState, payload);
    } catch {
      // Safe fallback if kernel transition is rejected or disallowed
    }
  }
}
