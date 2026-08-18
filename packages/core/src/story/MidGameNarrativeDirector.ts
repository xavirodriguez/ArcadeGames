import { StoryRuntimeSnapshot } from "./ArcadeIntegrationTypes";
import {
  GameplayEvent,
  MidGameDirectorRule,
  NarrativeCue
} from "./NarrativeDirectorTypes";

/**
 * MidGameNarrativeDirector evaluates gameplay events against narrative snapshot state to produce narrative cues.
 *
 * @remarks
 * Decouples arcade game engines from UI narrative rendering. Implements anti-spam features:
 * cooldownMs, once, maxTriggersPerRun, priority ordering, and interruptPolicy.
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
      const lastTime = this.lastTriggerTime.get(ruleId) || 0;

      // 1. Check once constraint
      if (rule.once && count >= 1) continue;

      // 2. Check maxTriggersPerRun constraint
      if (rule.maxTriggersPerRun !== undefined && count >= rule.maxTriggersPerRun) continue;

      // 3. Check cooldownMs constraint
      if (rule.cooldownMs && event.timestamp - lastTime < rule.cooldownMs) continue;

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
   * Resets anti-spam tracking counters for a new run.
   */
  public resetRunState(): void {
    this.triggerCounts.clear();
    this.lastTriggerTime.clear();
  }
}
