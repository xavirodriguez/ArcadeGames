import { World } from "../ecs/World";
import { EventBus } from "../events/EventBus";
import {
  StoryGraph,
  StoryNode,
  StoryState,
  StoryCondition,
  StoryChoice,
  StoryObjective
} from "./StoryTypes";

/**
 * StoryRuntime orchestrates narrative progression based on a data-driven StoryGraph.
 * Operates deterministically with world.gameplayRandom and communicates via EventBus.
 * @public
 */
export class StoryRuntime {
  private graph: StoryGraph | null = null;
  private state: StoryState;
  private world?: World;
  private eventBus?: EventBus;

  constructor(graph?: StoryGraph) {
    this.state = {
      graphId: graph?.id || null,
      currentNodeId: null,
      flags: {},
      variables: {},
      selectedChoices: [],
      objectives: {},
      history: []
    };

    if (graph) {
      this.loadGraph(graph);
    }
  }

  /**
   * Binds the runtime to a World and its EventBus.
   */
  public bindWorld(world: World): void {
    this.world = world;
    const bus = world.getResource<EventBus>("EventBus") || world.getEventBus();
    if (bus) {
      this.bindEventBus(bus);
    }
  }

  /**
   * Binds event bus listeners for gameplay narrative triggers.
   */
  public bindEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;

    // Standard story & gameplay event hooks
    const listenEvents = [
      "level:completed",
      "spawn:wave_complete",
      "CollectiblePickedUp",
      "story:beat_reached",
      "story:choice_selected",
      "story:objective_completed",
      "dialogue:completed",
      "cutscene:completed"
    ];

    for (const eventName of listenEvents) {
      eventBus.on(eventName as any, (payload: any) => {
        this.handleEvent(eventName, payload);
      });
    }
  }

  /**
   * Loads a new StoryGraph into the runtime and sets entry node if not started.
   */
  public loadGraph(graph: StoryGraph, startAtEntry: boolean = true): void {
    this.graph = graph;
    this.state.graphId = graph.id;

    if (startAtEntry && graph.entryNodeId && graph.nodes[graph.entryNodeId]) {
      this.navigateToNode(graph.entryNodeId);
    }
  }

  /**
   * Navigates to a specific node in the active graph.
   */
  public navigateToNode(nodeId: string): boolean {
    if (!this.graph || !this.graph.nodes[nodeId]) {
      return false;
    }

    const previousNodeId = this.state.currentNodeId;
    const node = this.graph.nodes[nodeId];

    this.state.currentNodeId = nodeId;
    if (!this.state.history.includes(nodeId)) {
      this.state.history.push(nodeId);
    }

    // Initialize node objectives if present
    if (node.objective) {
      this.state.objectives[node.objective.id] = { ...node.objective };
    }

    // Emit node custom event if configured
    if (node.emitEvent && this.eventBus) {
      this.eventBus.emit(node.emitEvent.name as any, node.emitEvent.payload || {});
    }

    // Emit story:node_changed event
    if (this.eventBus) {
      this.eventBus.emit("story:node_changed" as any, {
        graphId: this.graph.id,
        currentNodeId: nodeId,
        previousNodeId,
        node
      });

      // Maintain backwards compatibility with story:beat_reached
      if (node.type === "dialogue" || node.type === "cutscene") {
        this.eventBus.emit("story:beat_reached" as any, {
          beatId: nodeId,
          dialogueReference: node.dialogue?.lines[0]?.textKey || nodeId,
          payload: { node }
        });
      }
    }

    return true;
  }

  /**
   * Evaluates and steps through eligible transitions out of current node.
   */
  public evaluateTransitions(): boolean {
    const currentNode = this.getCurrentNode();
    if (!currentNode || !currentNode.transitions || currentNode.transitions.length === 0) {
      return false;
    }

    const sortedTransitions = [...currentNode.transitions].sort(
      (a, b) => (b.priority || 0) - (a.priority || 0)
    );

    for (const transition of sortedTransitions) {
      if (!transition.condition || this.evaluateCondition(transition.condition)) {
        return this.navigateToNode(transition.targetNodeId);
      }
    }

    return false;
  }

  /**
   * Handles incoming event notifications and advances graph state accordingly.
   */
  public handleEvent(eventName: string, payload: any): void {
    // 1. Set transient event flag
    this.state.flags[`event:${eventName}`] = true;

    // 2. Process active objective progress
    this.checkObjectiveProgress(eventName, payload);

    // 3. Evaluate state transition out of current node
    this.evaluateTransitions();

    // 4. Reset transient event flag
    delete this.state.flags[`event:${eventName}`];
  }

  /**
   * Selects a narrative choice option.
   */
  public selectChoice(choiceId: string): boolean {
    const node = this.getCurrentNode();
    if (!node || node.type !== "choice" || !node.choices) {
      return false;
    }

    const choice = node.choices.find((c) => c.id === choiceId);
    if (!choice) {
      return false;
    }

    if (choice.condition && !this.evaluateCondition(choice.condition)) {
      return false;
    }

    this.state.selectedChoices.push(choiceId);

    if (this.eventBus) {
      this.eventBus.emit("story:choice_selected" as any, {
        choiceId,
        nodeId: node.id,
        targetNodeId: choice.targetNodeId
      });
    }

    return this.navigateToNode(choice.targetNodeId);
  }

  /**
   * Evaluates a StoryCondition deterministically.
   */
  public evaluateCondition(condition: StoryCondition): boolean {
    switch (condition.type) {
      case "event":
        if (!condition.key) return false;
        return !!this.state.flags[`event:${condition.key}`];

      case "flag":
        if (!condition.key) return false;
        const flagVal = !!this.state.flags[condition.key];
        return condition.value !== undefined ? flagVal === condition.value : flagVal;

      case "variable":
        if (!condition.key) return false;
        const currentVar = this.state.variables[condition.key];
        return this.compareValues(currentVar, condition.value, condition.operator || "==");

      case "choice":
        if (!condition.key) return false;
        return this.state.selectedChoices.includes(condition.key);

      case "objective":
        if (!condition.key) return false;
        const obj = this.state.objectives[condition.key];
        return obj ? obj.completed : false;

      case "random":
        const threshold = condition.chance ?? 0.5;
        if (this.world && this.world.gameplayRandom) {
          return this.world.gameplayRandom.next() < threshold;
        }
        return Math.random() < threshold;

      default:
        return false;
    }
  }

  /**
   * Sets a narrative state flag.
   */
  public setFlag(key: string, value: boolean = true): void {
    this.state.flags[key] = value;
    this.evaluateTransitions();
  }

  /**
   * Sets a narrative state variable.
   */
  public setVariable(key: string, value: any): void {
    this.state.variables[key] = value;
    this.evaluateTransitions();
  }

  /**
   * Gets current state snapshot.
   */
  public getState(): StoryState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Restores state from snapshot.
   */
  public setState(state: StoryState): void {
    this.state = JSON.parse(JSON.stringify(state));
    if (this.state.currentNodeId) {
      this.navigateToNode(this.state.currentNodeId);
    }
  }

  /**
   * Gets currently active StoryNode.
   */
  public getCurrentNode(): StoryNode | null {
    if (!this.graph || !this.state.currentNodeId) return null;
    return this.graph.nodes[this.state.currentNodeId] || null;
  }

  /**
   * Gets currently active graph.
   */
  public getGraph(): StoryGraph | null {
    return this.graph;
  }

  private checkObjectiveProgress(eventName: string, payload: any): void {
    for (const objId in this.state.objectives) {
      const obj = this.state.objectives[objId];
      if (obj.completed) continue;

      if (
        eventName === "level:completed" ||
        eventName === "spawn:wave_complete" ||
        eventName === "CollectiblePickedUp"
      ) {
        obj.currentCount += 1;
        if (obj.currentCount >= obj.targetCount) {
          obj.completed = true;
          if (this.eventBus) {
            this.eventBus.emit("story:objective_completed" as any, {
              objectiveId: obj.id,
              objective: obj
            });
          }
        }
      }
    }
  }

  private compareValues(current: any, target: any, operator: string): boolean {
    switch (operator) {
      case "==":
        return current == target;
      case "!=":
        return current != target;
      case ">":
        return current > target;
      case ">=":
        return current >= target;
      case "<":
        return current < target;
      case "<=":
        return current <= target;
      case "contains":
        return Array.isArray(current) && current.includes(target);
      default:
        return current == target;
    }
  }
}
