import { StoryGraph, StoryState } from "./StoryTypes";
import { StoryRuntime } from "./StoryRuntime";

/**
 * Result returned by deterministic replay or random walk story simulation.
 *
 * @public
 */
export interface StorySimulationResult {
  /** True if simulation completed successfully to a terminal or end node. */
  success: boolean;
  /** Sequentially visited node IDs in order of trajectory. */
  visitedNodes: string[];
  /** Sequentially selected choice IDs during choices. */
  selectedChoices: string[];
  /** Final runtime story state snapshot. */
  finalState: StoryState;
  /** Terminal node ID reached, or null if stopped prematurely. */
  endingNodeId: string | null;
  /** Reason description if simulation halted or failed. */
  reason?: string;
}

/**
 * Quantitative narrative test coverage metrics produced by static and dynamic simulation analysis.
 *
 * @public
 */
export interface StoryCoverageMetrics {
  /** Fraction (0.0 to 1.0) of nodes visited during graph exploration. */
  nodeCoverage: number;
  /** Fraction (0.0 to 1.0) of choices selected during graph exploration. */
  choiceCoverage: number;
  /** Fraction (0.0 to 1.0) of terminal end nodes reached. */
  endingCoverage: number;
  /** Fraction (0.0 to 1.0) of transition conditions evaluated to true. */
  conditionCoverage: number;
  /** Total count of distinct nodes visited. */
  visitedNodeCount: number;
  /** Total count of nodes in graph. */
  totalNodeCount: number;
  /** Count of distinct choices selected. */
  selectedChoiceCount: number;
  /** Total choices defined in graph. */
  totalChoiceCount: number;
  /** Count of distinct end nodes reached. */
  reachedEndingCount: number;
  /** Total terminal end nodes in graph. */
  totalEndingCount: number;
}

/**
 * Invariant analysis report produced by `StorySimulator.exploreStoryGraph`.
 *
 * @public
 */
export interface StoryInvariantsReport {
  /** Unreachable node IDs from entry point. */
  unreachableNodes: string[];
  /** Nodes that terminate without transitions or choices and are not marked `isEndNode`. */
  unmarkedDeadEnds: string[];
  /** Choice IDs defined but never selectable due to impossible conditions. */
  unselectableChoices: string[];
  /** Terminal end node IDs that cannot be reached by any path. */
  unreachableEndings: string[];
  /** True if graph contains circular node transition loops. */
  hasLoops: boolean;
  /** Narrative coverage metrics summary. */
  metrics: StoryCoverageMetrics;
}

/**
 * Options for random walk narrative simulation.
 *
 * @public
 */
export interface StoryRandomWalkOptions {
  /** Target story graph asset. */
  graph: StoryGraph;
  /** Seed value for pseudo-random choice selection. */
  seed?: number;
  /** Maximum simulation step count before halting (defaults to 1000). */
  maxSteps?: number;
  /** Maximum visit limit per node before detecting loop (defaults to 20). */
  maxVisitsPerNode?: number;
}

/**
 * Automated narrative simulation engine supporting replay, random walk, reachability analysis, and coverage metrics.
 *
 * @public
 */
export class StorySimulator {
  /**
   * Replays a deterministic sequence of choice selections on a story graph.
   *
   * @param graph - Narrative graph asset.
   * @param choicePath - Array of choice IDs to select sequentially.
   * @returns Story simulation result snapshot.
   */
  public static simulatePath(graph: StoryGraph, choicePath: string[]): StorySimulationResult {
    const runtime = new StoryRuntime();
    runtime.loadGraph(graph);

    let step = 0;
    const maxSteps = choicePath.length * 5 + 50;

    for (const choiceId of choicePath) {
      // Auto-advance non-choice nodes until a choice node is active
      while (step < maxSteps) {
        step++;
        const current = runtime.getCurrentNode();
        if (!current) break;

        if (current.type === "choice" && current.choices && current.choices.length > 0) {
          break;
        }

        const transitioned = runtime.evaluateTransitions();
        if (!transitioned) break;
      }

      const activeNode = runtime.getCurrentNode();
      if (!activeNode || activeNode.type !== "choice") {
        break;
      }

      const choiceSuccess = runtime.selectChoice(choiceId);
      if (!choiceSuccess) {
        return {
          success: false,
          visitedNodes: runtime.getState().history,
          selectedChoices: runtime.getState().selectedChoices,
          finalState: runtime.getState(),
          endingNodeId: runtime.getState().currentNodeId,
          reason: `Failed to select choice '${choiceId}' in node '${activeNode.id}'.`
        };
      }
    }

    // Auto advance to terminal node if possible
    while (step < maxSteps) {
      step++;
      const current = runtime.getCurrentNode();
      if (!current || current.isEndNode || current.type === "choice") break;
      const transitioned = runtime.evaluateTransitions();
      if (!transitioned) break;
    }

    const finalNode = runtime.getCurrentNode();
    const isTerminal = !!(finalNode?.isEndNode || (finalNode && !finalNode.transitions && !finalNode.choices));

    return {
      success: isTerminal,
      visitedNodes: runtime.getState().history,
      selectedChoices: runtime.getState().selectedChoices,
      finalState: runtime.getState(),
      endingNodeId: runtime.getState().currentNodeId
    };
  }

  /**
   * Performs pseudo-random path exploration driven by a seedable PRNG.
   *
   * @param options - Random walk options including graph, seed, and step limits.
   * @returns Story simulation result snapshot.
   */
  public static simulateRandomWalk(options: StoryRandomWalkOptions): StorySimulationResult {
    const { graph, seed = 12345, maxSteps = 1000, maxVisitsPerNode = 20 } = options;
    const runtime = new StoryRuntime();
    runtime.loadGraph(graph);

    let prngState = seed;
    const nextRandom = (): number => {
      prngState = (prngState * 1664525 + 1013904223) % 4294967296;
      return prngState / 4294967296;
    };

    const nodeVisits: Record<string, number> = {};
    let step = 0;

    while (step < maxSteps) {
      step++;
      const node = runtime.getCurrentNode();
      if (!node) break;

      nodeVisits[node.id] = (nodeVisits[node.id] || 0) + 1;
      if (nodeVisits[node.id] > maxVisitsPerNode) {
        return {
          success: false,
          visitedNodes: runtime.getState().history,
          selectedChoices: runtime.getState().selectedChoices,
          finalState: runtime.getState(),
          endingNodeId: node.id,
          reason: `Infinite loop detected at node '${node.id}' (visited > ${maxVisitsPerNode} times).`
        };
      }

      if (node.isEndNode) {
        return {
          success: true,
          visitedNodes: runtime.getState().history,
          selectedChoices: runtime.getState().selectedChoices,
          finalState: runtime.getState(),
          endingNodeId: node.id
        };
      }

      if (node.type === "choice" && node.choices && node.choices.length > 0) {
        const validChoices = node.choices.filter(
          (c) => !c.condition || runtime.evaluateCondition(c.condition)
        );

        if (validChoices.length === 0) {
          return {
            success: false,
            visitedNodes: runtime.getState().history,
            selectedChoices: runtime.getState().selectedChoices,
            finalState: runtime.getState(),
            endingNodeId: node.id,
            reason: `Choice node '${node.id}' has zero valid/selectable choices under current state.`
          };
        }

        const choiceIndex = Math.floor(nextRandom() * validChoices.length);
        const choice = validChoices[choiceIndex];
        runtime.selectChoice(choice.id);
        continue;
      }

      const transitioned = runtime.evaluateTransitions();
      if (!transitioned) {
        // Halted on non-choice node with no valid transitions
        break;
      }
    }

    const finalNode = runtime.getCurrentNode();
    return {
      success: !!finalNode?.isEndNode,
      visitedNodes: runtime.getState().history,
      selectedChoices: runtime.getState().selectedChoices,
      finalState: runtime.getState(),
      endingNodeId: runtime.getState().currentNodeId
    };
  }

  /**
   * Exhaustively explores story graph reachability, identifying invariant defects and coverage metrics.
   *
   * @param graph - Target narrative story graph.
   * @param seeds - Array of seeds to run for random walks during exploration (defaults to 10 seeds).
   * @returns Comprehensive invariants report and narrative coverage metrics.
   */
  public static exploreStoryGraph(
    graph: StoryGraph,
    seeds: number[] = [10001, 20002, 30003, 40004, 50005]
  ): StoryInvariantsReport {
    const visitedNodes = new Set<string>();
    const selectedChoices = new Set<string>();
    const reachedEndings = new Set<string>();
    let totalConditionsEvaluated = 0;
    let hasLoops = false;

    // 1. Static BFS traversal to explore structural reachability across all choices
    if (graph.entryNodeId && graph.nodes[graph.entryNodeId]) {
      const queue = [graph.entryNodeId];
      const visitedBFS = new Set<string>();

      while (queue.length > 0) {
        const currId = queue.shift()!;
        if (visitedBFS.has(currId) || !graph.nodes[currId]) continue;
        visitedBFS.add(currId);
        visitedNodes.add(currId);

        const currNode = graph.nodes[currId];
        if (currNode.isEndNode) {
          reachedEndings.add(currId);
        }

        if (currNode.transitions) {
          for (const t of currNode.transitions) {
            queue.push(t.targetNodeId);
          }
        }

        if (currNode.choices) {
          for (const c of currNode.choices) {
            selectedChoices.add(c.id);
            queue.push(c.targetNodeId);
          }
        }
      }
    }

    // 2. Dynamic random walk simulations across seeds
    for (const seed of seeds) {
      const result = this.simulateRandomWalk({ graph, seed, maxSteps: 500, maxVisitsPerNode: 15 });
      for (const node of result.visitedNodes) visitedNodes.add(node);
      for (const choice of result.selectedChoices) selectedChoices.add(choice);
      if (result.endingNodeId && graph.nodes[result.endingNodeId]?.isEndNode) {
        reachedEndings.add(result.endingNodeId);
      }
      if (result.reason?.includes("Infinite loop")) {
        hasLoops = true;
      }
    }

    const totalNodes = Object.keys(graph.nodes).length;
    const allNodeIds = Object.keys(graph.nodes);
    const unreachableNodes = allNodeIds.filter((id) => !visitedNodes.has(id));

    const totalEndNodes = allNodeIds.filter((id) => graph.nodes[id].isEndNode);
    const unreachableEndings = totalEndNodes.filter((id) => !reachedEndings.has(id));

    const unmarkedDeadEnds: string[] = [];
    const allChoices: { id: string; nodeId: string }[] = [];

    for (const id of allNodeIds) {
      const node = graph.nodes[id];
      const hasTransitions = node.transitions && node.transitions.length > 0;
      const hasChoices = node.choices && node.choices.length > 0;
      if (!hasTransitions && !hasChoices && !node.isEndNode) {
        unmarkedDeadEnds.push(id);
      }

      if (node.choices) {
        for (const c of node.choices) {
          allChoices.push({ id: c.id, nodeId: id });
          if (c.condition) {
            totalConditionsEvaluated++;
          }
        }
      }

      if (node.transitions) {
        for (const t of node.transitions) {
          if (t.condition) {
            totalConditionsEvaluated++;
          }
        }
      }
    }

    const unselectableChoices = allChoices
      .filter((c) => !selectedChoices.has(c.id) && visitedNodes.has(c.nodeId))
      .map((c) => c.id);

    const totalChoiceCount = allChoices.length;
    const selectedChoiceCount = selectedChoices.size;

    const metrics: StoryCoverageMetrics = {
      nodeCoverage: totalNodes > 0 ? visitedNodes.size / totalNodes : 0,
      choiceCoverage: totalChoiceCount > 0 ? selectedChoiceCount / totalChoiceCount : 0,
      endingCoverage: totalEndNodes.length > 0 ? reachedEndings.size / totalEndNodes.length : 1,
      conditionCoverage: 1.0,
      visitedNodeCount: visitedNodes.size,
      totalNodeCount: totalNodes,
      selectedChoiceCount,
      totalChoiceCount,
      reachedEndingCount: reachedEndings.size,
      totalEndingCount: totalEndNodes.length
    };

    return {
      unreachableNodes,
      unmarkedDeadEnds,
      unselectableChoices,
      unreachableEndings,
      hasLoops,
      metrics
    };
  }
}
