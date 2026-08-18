import {
  MiniGameEncounter,
  MiniGameModifier,
  StoryRuntimeSnapshot
} from "./ArcadeIntegrationTypes";

/**
 * Pure resolver translating read-only StoryRuntimeSnapshots into domain-specific arcade minigame modifiers.
 *
 * @remarks
 * Minigame components never receive narrative flags or variables directly.
 * `MiniGameModifierResolver` isolates narrative state inspection and outputs clean,
 * decoupled `MiniGameModifier` descriptors.
 *
 * @public
 */
export class MiniGameModifierResolver {
  /**
   * Resolves active modifiers for a minigame encounter given a read-only snapshot of narrative state.
   *
   * @param snapshot - Read-only snapshot of current `StoryState`.
   * @param encounter - MiniGameEncounter definition containing modifier evaluation rules.
   * @returns Array of resolved domain-specific minigame modifiers.
   */
  public resolve(
    snapshot: StoryRuntimeSnapshot,
    encounter: MiniGameEncounter
  ): MiniGameModifier[] {
    if (!encounter.modifierRules || encounter.modifierRules.length === 0) {
      return [];
    }

    const modifiers: MiniGameModifier[] = [];
    for (const rule of encounter.modifierRules) {
      try {
        if (rule.condition(snapshot)) {
          modifiers.push(rule.modifier);
        }
      } catch {
        // Safe evaluation fallback
      }
    }
    return modifiers;
  }
}
