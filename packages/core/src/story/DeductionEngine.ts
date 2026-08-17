import { DeductionRule, StoryEffect } from "./StoryTypes";
import { StoryRuntime } from "./StoryRuntime";

/**
 * Result descriptor returned by active deduction formulation attempts.
 *
 * @public
 */
export interface FormulationResult {
  /** True if selected evidence matched a valid deduction rule requirements. */
  success: boolean;
  /** Matching deduction rule if successful. */
  rule?: DeductionRule;
  /** Produced evidence ID resulting from successful deduction. */
  resultEvidenceId?: string;
  /** Explanation reason if deduction failed or evidence was insufficient. */
  reason?: string;
}

/**
 * Deduction engine handling automatic and active gameplay evidence synthesis.
 *
 * @remarks
 * Manages evidence discovery, evaluates deduction rule requirements, provides
 * guided question framing to prevent brute-force evidence combinations, and applies
 * declarative `StoryEffect` consequences upon successful deduction formulations.
 *
 * @public
 */
export class DeductionEngine {
  private rules: Map<string, DeductionRule> = new Map();
  private discoveredEvidence: Set<string> = new Set();
  private completedDeductions: Set<string> = new Set();
  private runtime?: StoryRuntime;

  /**
   * Constructs a new `DeductionEngine` instance.
   *
   * @param rules - Array or registry map of deduction rules.
   * @param runtime - Optional active `StoryRuntime` instance to apply declarative effects upon deduction.
   */
  constructor(rules?: DeductionRule[] | Record<string, DeductionRule>, runtime?: StoryRuntime) {
    this.runtime = runtime;
    if (rules) {
      this.registerRules(rules);
    }
  }

  /**
   * Binds an active `StoryRuntime` instance for narrative effect execution.
   *
   * @param runtime - The narrative runtime engine.
   */
  public bindRuntime(runtime: StoryRuntime): void {
    this.runtime = runtime;
  }

  /**
   * Registers deduction rules into the engine.
   *
   * @param rules - Array or record map of deduction rule definitions.
   */
  public registerRules(rules: DeductionRule[] | Record<string, DeductionRule>): void {
    const list = Array.isArray(rules) ? rules : Object.values(rules);
    for (const rule of list) {
      this.rules.set(rule.id, rule);
    }
  }

  /**
   * Discovers an evidence item by ID and evaluates automatic deduction rules.
   *
   * @param evidenceId - Identifier of evidence acquired.
   * @returns List of newly completed deduction rule IDs triggered automatically.
   */
  public discoverEvidence(evidenceId: string): string[] {
    if (!this.discoveredEvidence.has(evidenceId)) {
      this.discoveredEvidence.add(evidenceId);
      if (this.runtime) {
        this.runtime.discoverEvidence(evidenceId);
      }
    }
    return this.evaluateAutomaticDeductions();
  }

  /**
   * Performs active deduction formulation by selecting a combination of discovered evidence items.
   *
   * @param selectedEvidenceIds - List of evidence IDs proposed by player.
   * @param questionId - Optional framing question ID scoping candidate deductions.
   * @returns Formulation result status and matching deduction rule.
   */
  public formulateDeduction(
    selectedEvidenceIds: string[],
    questionId?: string
  ): FormulationResult {
    // Check that all selected evidence items are discovered
    for (const evId of selectedEvidenceIds) {
      if (!this.discoveredEvidence.has(evId)) {
        return {
          success: false,
          reason: `Evidence '${evId}' has not been discovered.`
        };
      }
    }

    const selectedSet = new Set(selectedEvidenceIds);

    for (const rule of this.rules.values()) {
      if (this.completedDeductions.has(rule.id)) {
        continue;
      }

      if (questionId && rule.questionId && rule.questionId !== questionId) {
        continue;
      }

      const reqSet = new Set(rule.requires);
      if (
        reqSet.size === selectedSet.size &&
        [...reqSet].every((req) => selectedSet.has(req))
      ) {
        this.completedDeductions.add(rule.id);
        this.discoveredEvidence.add(rule.resultEvidenceId);

        if (this.runtime) {
          this.runtime.discoverEvidence(rule.resultEvidenceId);
          if (rule.effects) {
            this.runtime.applyEffects(rule.effects);
          }
        }

        return {
          success: true,
          rule,
          resultEvidenceId: rule.resultEvidenceId
        };
      }
    }

    return {
      success: false,
      reason: "No valid deduction rule matches the selected combination of evidence."
    };
  }

  /**
   * Retrieves active framing questions and candidate evidence IDs to guide deduction UI without brute-force guessing.
   *
   * @returns List of active framing question descriptors.
   */
  public getFramingQuestions(): Array<{ questionId: string; candidates: string[] }> {
    const questionsMap = new Map<string, Set<string>>();

    for (const rule of this.rules.values()) {
      if (this.completedDeductions.has(rule.id) || !rule.questionId) {
        continue;
      }

      if (!questionsMap.has(rule.questionId)) {
        questionsMap.set(rule.questionId, new Set<string>());
      }

      const candidateSet = questionsMap.get(rule.questionId)!;
      for (const reqEv of rule.requires) {
        if (this.discoveredEvidence.has(reqEv)) {
          candidateSet.add(reqEv);
        }
      }
    }

    const result: Array<{ questionId: string; candidates: string[] }> = [];
    for (const [qId, candidates] of questionsMap.entries()) {
      result.push({
        questionId: qId,
        candidates: Array.from(candidates)
      });
    }

    return result;
  }

  /**
   * Evaluates all automatic deduction rules where all required evidence items have been discovered.
   *
   * @returns Array of deduction rule IDs completed automatically.
   */
  public evaluateAutomaticDeductions(): string[] {
    const newlyCompleted: string[] = [];

    for (const rule of this.rules.values()) {
      if (this.completedDeductions.has(rule.id)) continue;
      // Auto deductions are rules without explicit questionId or explicitly flagged
      if (!rule.questionId) {
        const allPresent = rule.requires.every((req) => this.discoveredEvidence.has(req));
        if (allPresent) {
          this.completedDeductions.add(rule.id);
          this.discoveredEvidence.add(rule.resultEvidenceId);
          newlyCompleted.push(rule.id);

          if (this.runtime) {
            this.runtime.discoverEvidence(rule.resultEvidenceId);
            if (rule.effects) {
              this.runtime.applyEffects(rule.effects);
            }
          }
        }
      }
    }

    return newlyCompleted;
  }

  /** Retrieves set of all discovered evidence IDs. */
  public getDiscoveredEvidence(): string[] {
    return Array.from(this.discoveredEvidence);
  }

  /** Retrieves set of completed deduction rule IDs. */
  public getCompletedDeductions(): string[] {
    return Array.from(this.completedDeductions);
  }
}
