import { MiniGameModifier } from "./ArcadeIntegrationTypes";

/**
 * Categorized player skill profile for dynamic difficulty adjustment (DDA).
 *
 * @public
 */
export interface ArcadeSkillProfile {
  readonly navigation: number; // 0.0 to 1.0 rating
  readonly accuracy: number; // 0.0 to 1.0 rating
  readonly reaction: number; // 0.0 to 1.0 rating
  readonly survival: number; // 0.0 to 1.0 rating
}

/**
 * Detailed telemetry metrics supplied after an encounter attempt to update skill profile.
 *
 * @public
 */
export interface EncounterTelemetryMetrics {
  readonly accuracyRatio?: number; // 0.0 to 1.0
  readonly survivalDurationRatio?: number; // 0.0 to 1.0
  readonly collisionFrequency?: number; // lower is better
  readonly averageReactionTimeMs?: number; // lower is better
}

/**
 * Historical record of encounter attempts.
 *
 * @public
 */
export interface EncounterAttemptHistory {
  readonly encounterId: string;
  readonly attempts: number;
  readonly failures: number;
  readonly consecutiveFailures: number;
}

/**
 * Declarative rule for offering DDA assistance.
 *
 * @public
 */
export interface AssistRule {
  readonly id: string;
  readonly encounterId: string;
  readonly minConsecutiveFailures: number;
  readonly diegeticOfferMessageKey: string;
  readonly modifier: MiniGameModifier;
}

/**
 * Dynamic Difficulty Adjustment Manager.
 *
 * @remarks
 * Tracks per-category player skill profiles and attempt histories to offer diegetic assistance.
 *
 * @public
 */
export class DynamicDifficultyManager {
  private historyMap: Map<string, EncounterAttemptHistory> = new Map();
  private skillProfile: ArcadeSkillProfile = {
    navigation: 0.5,
    accuracy: 0.5,
    reaction: 0.5,
    survival: 0.5
  };

  /**
   * Retrieves active player skill profile.
   */
  public getSkillProfile(): ArcadeSkillProfile {
    return { ...this.skillProfile };
  }

  /**
   * Updates skill profile ratings based on performance telemetry.
   */
  public updateSkillProfile(metrics: EncounterTelemetryMetrics): void {
    const alpha = 0.2; // Exponential smoothing factor

    let newAccuracy = this.skillProfile.accuracy;
    if (typeof metrics.accuracyRatio === "number") {
      newAccuracy = (1 - alpha) * this.skillProfile.accuracy + alpha * metrics.accuracyRatio;
    }

    let newSurvival = this.skillProfile.survival;
    if (typeof metrics.survivalDurationRatio === "number") {
      newSurvival = (1 - alpha) * this.skillProfile.survival + alpha * metrics.survivalDurationRatio;
    }

    let newNav = this.skillProfile.navigation;
    if (typeof metrics.collisionFrequency === "number") {
      const navScore = Math.max(0, Math.min(1, 1 - metrics.collisionFrequency / 10));
      newNav = (1 - alpha) * this.skillProfile.navigation + alpha * navScore;
    }

    let newReaction = this.skillProfile.reaction;
    if (typeof metrics.averageReactionTimeMs === "number") {
      const reactScore = Math.max(0, Math.min(1, 1 - metrics.averageReactionTimeMs / 1000));
      newReaction = (1 - alpha) * this.skillProfile.reaction + alpha * reactScore;
    }

    this.skillProfile = {
      navigation: Number(newNav.toFixed(2)),
      accuracy: Number(newAccuracy.toFixed(2)),
      reaction: Number(newReaction.toFixed(2)),
      survival: Number(newSurvival.toFixed(2))
    };
  }

  /**
   * Records attempt outcome for an encounter.
   */
  public recordAttempt(encounterId: string, success: boolean, telemetry?: EncounterTelemetryMetrics): void {
    const existing = this.historyMap.get(encounterId) || {
      encounterId,
      attempts: 0,
      failures: 0,
      consecutiveFailures: 0
    };

    const attempts = existing.attempts + 1;
    const failures = success ? existing.failures : existing.failures + 1;
    const consecutiveFailures = success ? 0 : existing.consecutiveFailures + 1;

    this.historyMap.set(encounterId, {
      encounterId,
      attempts,
      failures,
      consecutiveFailures
    });

    if (telemetry) {
      this.updateSkillProfile(telemetry);
    }
  }

  /**
   * Retrieves attempt history for a specific encounter.
   */
  public getHistory(encounterId: string): EncounterAttemptHistory {
    return (
      this.historyMap.get(encounterId) || {
        encounterId,
        attempts: 0,
        failures: 0,
        consecutiveFailures: 0
      }
    );
  }

  /**
   * Evaluates whether diegetic assistance should be offered for an encounter.
   *
   * @param rule - Candidate AssistRule.
   * @returns `true` if assistance threshold is reached.
   */
  public shouldOfferAssistance(rule: AssistRule): boolean {
    const history = this.getHistory(rule.encounterId);
    return history.consecutiveFailures >= rule.minConsecutiveFailures;
  }
}
