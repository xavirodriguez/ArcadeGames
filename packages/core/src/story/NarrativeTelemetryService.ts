/**
 * Discrete privacy-safe narrative telemetry event payload.
 *
 * @public
 */
export type NarrativeTelemetryEvent =
  | { type: "node_entered"; nodeId: string; timestamp: number }
  | { type: "choice_shown"; choiceId: string; nodeId: string; timestamp: number }
  | { type: "choice_selected"; choiceId: string; nodeId: string; timestamp: number }
  | { type: "evidence_discovered"; evidenceId: string; timestamp: number }
  | { type: "deduction_completed"; deductionId: string; timestamp: number }
  | { type: "ending_reached"; endingId: string; timestamp: number };

/**
 * Funnel step analytics entry for narrative drop-off tracking.
 *
 * @public
 */
export interface NarrativeFunnelStep {
  /** Target node ID in ordered funnel sequence. */
  nodeId: string;
  /** Player visit count reaching this funnel step. */
  count: number;
  /** Fraction (0.0 to 1.0) of players converting from initial step. */
  conversionRate: number;
}

/**
 * Privacy-first narrative telemetry service for tracking playtesting analytics, choice balance, and funnels.
 *
 * @public
 */
export class NarrativeTelemetryService {
  private logs: NarrativeTelemetryEvent[] = [];

  /** Logs node entry event. */
  public logNodeEntered(nodeId: string): void {
    this.logs.push({ type: "node_entered", nodeId, timestamp: Date.now() });
  }

  /** Logs choice option displayed to player. */
  public logChoiceShown(choiceId: string, nodeId: string): void {
    this.logs.push({ type: "choice_shown", choiceId, nodeId, timestamp: Date.now() });
  }

  /** Logs choice option selected by player. */
  public logChoiceSelected(choiceId: string, nodeId: string): void {
    this.logs.push({ type: "choice_selected", choiceId, nodeId, timestamp: Date.now() });
  }

  /** Logs evidence item discovered. */
  public logEvidenceDiscovered(evidenceId: string): void {
    this.logs.push({ type: "evidence_discovered", evidenceId, timestamp: Date.now() });
  }

  /** Logs deduction formulation completed. */
  public logDeductionCompleted(deductionId: string): void {
    this.logs.push({ type: "deduction_completed", deductionId, timestamp: Date.now() });
  }

  /** Logs terminal narrative ending reached. */
  public logEndingReached(endingId: string): void {
    this.logs.push({ type: "ending_reached", endingId, timestamp: Date.now() });
  }

  /** Retrieves heat map of node visit frequencies. */
  public getHeatmap(): Record<string, number> {
    const heatmap: Record<string, number> = {};
    for (const log of this.logs) {
      if (log.type === "node_entered") {
        heatmap[log.nodeId] = (heatmap[log.nodeId] || 0) + 1;
      }
    }
    return heatmap;
  }

  /**
   * Computes player drop-off funnel metrics across an ordered sequence of milestone node IDs.
   *
   * @param sequenceNodeIds - Sequential list of milestone node IDs.
   * @returns List of funnel step analytics entries.
   */
  public calculateFunnel(sequenceNodeIds: string[]): NarrativeFunnelStep[] {
    if (sequenceNodeIds.length === 0) return [];

    const counts = sequenceNodeIds.map((id) => {
      return this.logs.filter((l) => l.type === "node_entered" && l.nodeId === id).length;
    });

    const initialCount = counts[0] || 1;

    return sequenceNodeIds.map((nodeId, idx) => ({
      nodeId,
      count: counts[idx],
      conversionRate: counts[idx] / initialCount
    }));
  }

  /**
   * Computes Shannon Decision Entropy for a choice node, measuring decision balance among choices.
   *
   * @param choiceNodeId - ID of choice node evaluated.
   * @returns Entropy value in bits (0.0 indicates 100% biased towards 1 choice, 1.0+ indicates balanced distribution).
   */
  public getDecisionEntropy(choiceNodeId: string): number {
    const selections: Record<string, number> = {};
    let total = 0;

    for (const log of this.logs) {
      if (log.type === "choice_selected" && log.nodeId === choiceNodeId) {
        selections[log.choiceId] = (selections[log.choiceId] || 0) + 1;
        total++;
      }
    }

    if (total === 0) return 0;

    let entropy = 0;
    for (const count of Object.values(selections)) {
      const p = count / total;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }

    return entropy;
  }

  /** Retrieves full list of recorded telemetry events. */
  public getLogs(): readonly NarrativeTelemetryEvent[] {
    return [...this.logs];
  }

  /** Clears all telemetry log entries. */
  public clear(): void {
    this.logs = [];
  }
}
