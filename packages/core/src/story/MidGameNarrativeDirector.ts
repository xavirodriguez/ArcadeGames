import { MiniGameResult, StoryRuntimeSnapshot } from "./ArcadeIntegrationTypes";
import {
  GameplayEvent,
  MidGameDirectorRule,
  NarrativeCue
} from "./NarrativeDirectorTypes";
import { EventBus } from "../events/EventBus";
import { StoryRuntime } from "./StoryRuntime";

/**
 * Central narrative director that intercepts in-game simulation events and translates them
 * into prioritized narrative cues (`NarrativeCue`) based on active narrative state.
 *
 * @remarks
 * ### Responsibility
 * The `MidGameNarrativeDirector` acts as an intelligent intermediary between arcade minigame
 * engine simulations and the narrative overlay system. Rather than hardcoding narrative logic
 * inside gameplay systems (e.g., player health or collision loops), minigames emit generic
 * `GameplayEvent` instances (such as `"low_health"`, `"boss_defeated"`, or `"score_threshold"`).
 * The director evaluates these events against registered declarative rules (`MidGameDirectorRule`),
 * taking into account read-only narrative snapshots (`StoryRuntimeSnapshot`).
 *
 * ### Lifecycle
 * 1. **Configuration**: Rules are registered via constructor or `addRule()`.
 * 2. **Evaluation**: On each gameplay event trigger, `evaluateEvent()` filters rules matching the
 *    event name, sorts them by priority descending, and enforces anti-spam constraints
 *    (`once`, `maxTriggersPerRun`, `cooldownMs`, and custom `condition` predicates).
 * 3. **Interception**: When bound to an `EventBus` via `bindEventBus()`, it listens for `"game:over"`
 *    events, updates performance variables (`lastMinigameScore`, `playerPerformance`), and
 *    automatically navigates or evaluates transitions on the `StoryRuntime`.
 * 4. **Reset**: When restarting or starting a new run, `resetRunState()` clears all per-run anti-spam
 *    counters and timestamp caches.
 *
 * ### UI Integration & `NarrativeCueOverlay`
 * Returned `NarrativeCue` payloads are designed for consumption by decoupled UI layers, such as
 * `NarrativeCueOverlay`. When a rule matches, the returned cue is broadcast (e.g., via `EventBus`)
 * to `NarrativeCueOverlay`, which renders high-priority radio messages, visual distortion/glitch
 * overlays, warning banners, or triggers contextual audio cues (`audioCueId`).
 *
 * @public
 */
export class MidGameNarrativeDirector {
  private rules: MidGameDirectorRule[] = [];
  private triggerCounts: Map<string, number> = new Map();
  private lastTriggerTime: Map<string, number> = new Map();

  constructor(rules: MidGameDirectorRule[] = []) {
    this.rules = rules;
  }

  /**
   * Registers a new director rule.
   */
  public addRule(rule: MidGameDirectorRule): void {
    this.rules.push(rule);
  }

  /**
   * Evaluates a gameplay event against rules sorted by priority descending and snapshot state.
   *
   * @param event - Gameplay event received from minigame simulation.
   * @param snapshot - Read-only snapshot of current StoryState.
   * @returns NarrativeCue if a rule matched and passed anti-spam constraints, or null.
   */
  public evaluateEvent(
    event: GameplayEvent,
    snapshot: StoryRuntimeSnapshot
  ): NarrativeCue | null {
    const matchingRules = this.rules
      .filter((r) => r.eventName === event.name)
      .sort((a, b) => b.cue.priority - a.cue.priority);

    for (const rule of matchingRules) {
      const ruleId = rule.id;
      const count = this.triggerCounts.get(ruleId) || 0;
      const lastTime = this.lastTriggerTime.get(ruleId);

      // 1. Check once constraint
      if (rule.once && count >= 1) continue;

      // 2. Check maxTriggersPerRun constraint
      if (rule.maxTriggersPerRun !== undefined && count >= rule.maxTriggersPerRun) continue;

      // 3. Check cooldownMs constraint
      if (rule.cooldownMs && lastTime !== undefined && event.timestamp - lastTime < rule.cooldownMs) continue;

      // 4. Check condition predicate
      if (rule.condition && !rule.condition(event, snapshot)) continue;

      // Rule matched! Update state counters
      this.triggerCounts.set(ruleId, count + 1);
      this.lastTriggerTime.set(ruleId, event.timestamp);

      return rule.cue;
    }

    return null;
  }

  /**
   * Binds EventBus and StoryRuntime to intercept minigame game:over events,
   * updating story runtime state before returning to narrative flow.
   *
   * @param eventBus - EventBus instance.
   * @param runtime - Target StoryRuntime instance.
   */
  public bindEventBus(eventBus: EventBus, runtime: StoryRuntime): void {
    eventBus.on("game:over", (payload: unknown) => {
      if (payload && typeof payload === "object") {
        this.processMiniGameResult(payload as MiniGameResult, runtime);
      }
    });
  }

  /**
   * Processes a minigame execution result, updates performance state variables on StoryRuntime,
   * and triggers transition evaluations.
   *
   * @param result - Completed MiniGameResult payload.
   * @param runtime - Active StoryRuntime instance.
   * @returns Performance classification string.
   */
  public processMiniGameResult(
    result: MiniGameResult,
    runtime: StoryRuntime
  ): "perfect" | "good" | "poor" {
    const score = typeof result?.score === "number" ? result.score : 0;
    const completed = !!result?.completed;

    let performance: "perfect" | "good" | "poor" = "good";
    if (!completed || score < 500) {
      performance = "poor";
    } else if (score >= 2000) {
      performance = "perfect";
    }

    runtime.setVariable("lastMinigameScore", score);
    runtime.setVariable("lastMinigameCompleted", completed);
    runtime.setVariable("playerPerformance", performance);

    const snapshot = runtime.getState();
    const event: GameplayEvent = {
      id: `result_${result.runId || Date.now()}`,
      name: "game:over",
      timestamp: Date.now(),
      payload: { score, completed, performance }
    };

    const cue = this.evaluateEvent(event, snapshot);
    if (cue && cue.payload && typeof cue.payload.navigateToNode === "string") {
      runtime.navigateToNode(cue.payload.navigateToNode);
    } else {
      runtime.evaluateTransitions();
    }

    return performance;
  }

  /**
   * Resets anti-spam tracking counters for a new run.
   */
  public resetRunState(): void {
    this.triggerCounts.clear();
    this.lastTriggerTime.clear();
  }
}
