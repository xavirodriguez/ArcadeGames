import { StoryGraph, StoryCondition } from "./StoryTypes";

/**
 * Validation options for StoryGraph analysis.
 * @public
 */
export interface StoryGraphValidationOptions {
  /** Optional list of declared variable keys in initial state schema */
  declaredVariables?: string[];
  /** Optional list of declared flag keys in initial state schema */
  declaredFlags?: string[];
}

/**
 * Error or warning descriptor produced by StoryGraphValidator.
 * @public
 */
export interface StoryGraphValidationError {
  type:
    | "orphan_node"
    | "broken_transition"
    | "dead_end"
    | "undeclared_variable"
    | "undeclared_flag"
    | "invalid_entry_node";
  severity: "error" | "warning";
  nodeId?: string;
  targetNodeId?: string;
  variableKey?: string;
  message: string;
}

/**
 * Result structure returned by StoryGraphValidator.
 * @public
 */
export interface StoryGraphValidationResult {
  valid: boolean;
  errors: StoryGraphValidationError[];
  warnings: StoryGraphValidationError[];
}

/**
 * Static linter utility for pure StoryGraph narrative structures.
 * Performs build-time and load-time validation without altering runtime state or RNG seeds.
 * @public
 */
export class StoryGraphValidator {
  /**
   * Validates a pure StoryGraph dataset and returns errors and warnings.
   */
  public static validate(
    graph: StoryGraph,
    options?: StoryGraphValidationOptions
  ): StoryGraphValidationResult {
    const errors: StoryGraphValidationError[] = [];
    const warnings: StoryGraphValidationError[] = [];

    if (!graph || !graph.nodes) {
      errors.push({
        type: "invalid_entry_node",
        severity: "error",
        message: "StoryGraph missing nodes map."
      });
      return { valid: false, errors, warnings };
    }

    // 1. Check Entry Node validity
    if (!graph.entryNodeId || !graph.nodes[graph.entryNodeId]) {
      errors.push({
        type: "invalid_entry_node",
        severity: "error",
        nodeId: graph.entryNodeId,
        message: `Entry node '${graph.entryNodeId}' does not exist in graph nodes.`
      });
    }

    const referencedNodeIds = new Set<string>();
    if (graph.entryNodeId) {
      referencedNodeIds.add(graph.entryNodeId);
    }

    const inspectCondition = (cond: StoryCondition | undefined, nodeId: string) => {
      if (!cond) return;

      if (cond.type === "variable" && cond.key) {
        if (
          options?.declaredVariables &&
          !options.declaredVariables.includes(cond.key)
        ) {
          errors.push({
            type: "undeclared_variable",
            severity: "error",
            nodeId,
            variableKey: cond.key,
            message: `Condition in node '${nodeId}' references undeclared variable '${cond.key}'.`
          });
        }
      }

      if (cond.type === "flag" && cond.key) {
        if (
          options?.declaredFlags &&
          !options.declaredFlags.includes(cond.key) &&
          !cond.key.startsWith("event:")
        ) {
          warnings.push({
            type: "undeclared_flag",
            severity: "warning",
            nodeId,
            variableKey: cond.key,
            message: `Condition in node '${nodeId}' references undeclared flag '${cond.key}'.`
          });
        }
      }
    };

    // 2. Inspect all nodes for broken transitions, choices, dead ends, and condition variables
    for (const nodeId in graph.nodes) {
      const node = graph.nodes[nodeId];
      let hasOutgoing = false;

      // Check transitions
      if (node.transitions && node.transitions.length > 0) {
        hasOutgoing = true;
        for (const transition of node.transitions) {
          referencedNodeIds.add(transition.targetNodeId);
          if (!graph.nodes[transition.targetNodeId]) {
            errors.push({
              type: "broken_transition",
              severity: "error",
              nodeId,
              targetNodeId: transition.targetNodeId,
              message: `Transition in node '${nodeId}' points to non-existent node '${transition.targetNodeId}'.`
            });
          }
          inspectCondition(transition.condition, nodeId);
        }
      }

      // Check choices
      if (node.choices && node.choices.length > 0) {
        hasOutgoing = true;
        for (const choice of node.choices) {
          referencedNodeIds.add(choice.targetNodeId);
          if (!graph.nodes[choice.targetNodeId]) {
            errors.push({
              type: "broken_transition",
              severity: "error",
              nodeId,
              targetNodeId: choice.targetNodeId,
              message: `Choice in node '${nodeId}' points to non-existent node '${choice.targetNodeId}'.`
            });
          }
          inspectCondition(choice.condition, nodeId);
        }
      }

      // Check dead ends
      const isTerminal =
        node.isEndNode === true ||
        node.meta?.isEndNode === true ||
        node.type === ("end" as any);

      if (!hasOutgoing && !isTerminal) {
        warnings.push({
          type: "dead_end",
          severity: "warning",
          nodeId,
          message: `Node '${nodeId}' is a dead end without outgoing transitions and is not marked as end node.`
        });
      }
    }

    // 3. Detect orphan nodes
    for (const nodeId in graph.nodes) {
      if (nodeId !== graph.entryNodeId && !referencedNodeIds.has(nodeId)) {
        warnings.push({
          type: "orphan_node",
          severity: "warning",
          nodeId,
          message: `Node '${nodeId}' is orphaned and unreachable from entry node or any transition.`
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
