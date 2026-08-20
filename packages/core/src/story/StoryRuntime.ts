import { World } from "../ecs/World";
import { EventBus } from "../events/EventBus";
import {
  StoryGraph,
  StoryNode,
  StoryState,
  StoryCondition,
  StoryChoice,
  StoryEffect
} from "./StoryTypes";
import { RelationshipEngine } from "./RelationshipEngine";
import { DeductionEngine } from "./DeductionEngine";
import { NarrativeTimelineEngine } from "./NarrativeTimelineEngine";

/**
 * StoryRuntime orchestrates narrative progression based on a data-driven `StoryGraph`.
 *
 * @remarks
 * Acts as the stateful runtime engine for campaign narrative flow across arcade games.
 * Operates deterministically with `world.gameplayRandom` when available and communicates
 * asynchronously with decoupled UI and game systems via `EventBus`.
 *
 * Emits key lifecycle events:
 * - `story:node_changed` when transitioning to a new node.
 * - `story:scene_change` when entering a node configured with `sceneToLoad`.
 * - `story:choice_selected` when a player picks a narrative choice option.
 * - `story:objective_completed` when an active objective counter reaches target.
 * - `story:evidence_discovered` when evidence is acquired via narrative effects.
 * - `story:beat_reached` for backwards compatibility with legacy dialogue/cutscene listeners.
 *
 * @public
 */
export class StoryRuntime {
  private graph: StoryGraph | null = null;
  private state: StoryState;
  private world?: World;
  private eventBus?: EventBus;
  private relationshipEngine?: RelationshipEngine;
  private deductionEngine?: DeductionEngine;
  private timelineEngine?: NarrativeTimelineEngine;
  private lastRecordedEventId: string | null = null;
  private checkpoints: Map<string, { state: StoryState; lastEventId: string | null }> = new Map();

  /**
   * Constructs a new `StoryRuntime` instance.
   *
   * @param graph - Optional initial `StoryGraph` asset to load on initialization.
   */
  constructor(graph?: StoryGraph) {
    this.state = {
      graphId: graph?.id || null,
      currentNodeId: null,
      flags: {},
      variables: {},
      selectedChoices: [],
      objectives: {},
      evidence: [],
      history: []
    };

    if (graph) {
      this.loadGraph(graph);
    }
  }

  /**
   * Binds a `RelationshipEngine` instance to track character dispositions and memories.
   *
   * @param engine - RelationshipEngine instance.
   */
  public bindRelationshipEngine(engine: RelationshipEngine): void {
    this.relationshipEngine = engine;
  }

  /**
   * Retrieves bound `RelationshipEngine` instance.
   */
  public getRelationshipEngine(): RelationshipEngine | undefined {
    return this.relationshipEngine;
  }

  /**
   * Binds a `DeductionEngine` instance to evaluate automated evidence conclusions.
   *
   * @param engine - DeductionEngine instance.
   */
  public bindDeductionEngine(engine: DeductionEngine): void {
    this.deductionEngine = engine;
    engine.bindRuntime(this);
  }

  /**
   * Retrieves bound `DeductionEngine` instance.
   */
  public getDeductionEngine(): DeductionEngine | undefined {
    return this.deductionEngine;
  }

  /**
   * Binds a `NarrativeTimelineEngine` instance to record causal narrative events.
   *
   * @param engine - NarrativeTimelineEngine instance.
   */
  public bindTimelineEngine(engine: NarrativeTimelineEngine): void {
    this.timelineEngine = engine;
  }

  /**
   * Retrieves bound `NarrativeTimelineEngine` instance.
   */
  public getTimelineEngine(): NarrativeTimelineEngine | undefined {
    return this.timelineEngine;
  }

  /**
   * Retrieves list of all recorded checkpoint node IDs.
   */
  public getCheckpoints(): string[] {
    return Array.from(this.checkpoints.keys());
  }

  /**
   * Rewinds narrative state to a previously saved checkpoint node snapshot.
   *
   * @param targetNodeId - Checkpoint node ID to restore.
   * @returns `true` if rewind succeeded, `false` if target checkpoint is invalid or permanent policy prevents rewind.
   */
  public rewind(targetNodeId: string): boolean {
    const checkpointData = this.checkpoints.get(targetNodeId);
    if (!checkpointData) {
      return false;
    }

    const currentNode = this.getCurrentNode();
    if (currentNode?.meta?.rewindPolicy === "permanent") {
      return false;
    }

    this.state = JSON.parse(JSON.stringify(checkpointData.state));
    this.lastRecordedEventId = checkpointData.lastEventId;

    if (this.timelineEngine) {
      this.timelineEngine.truncateAfter(this.lastRecordedEventId);
    }

    this.navigateToNode(targetNodeId);
    return true;
  }

  /**
   * Binds the runtime to an active ECS `World` container and extracts its `EventBus`.
   *
   * @param world - The ECS world hosting narrative event listeners and seed-based RNG.
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
   *
   * @remarks
   * Automatically inspects all node transition conditions in the active graph and registers
   * listeners for any event key conditions specified. Also binds standard built-in gameplay hooks
   * such as `level:completed`, `spawn:wave_complete`, and `CollectiblePickedUp`.
   *
   * @param eventBus - The central `EventBus` instance used for inter-system narrative signals.
   */
  public bindEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;

    // Standard story & gameplay event hooks
    const listenEvents = new Set<string>([
      "level:completed",
      "spawn:wave_complete",
      "CollectiblePickedUp",
      "story:beat_reached",
      "story:choice_selected",
      "story:objective_completed",
      "story:evidence_discovered",
      "dialogue:completed",
      "cutscene:completed",
      "rock:destroyed",
      "enemy:destroyed"
    ]);

    if (this.graph) {
      for (const node of Object.values(this.graph.nodes)) {
        if (node.transitions) {
          for (const t of node.transitions) {
            if (t.condition?.type === "event" && t.condition.key) {
              listenEvents.add(t.condition.key);
            }
          }
        }
      }
    }

    for (const eventName of listenEvents) {
      eventBus.on(eventName as unknown as keyof import("../events/EventBus").CombinedEvents<import("../events/EventBus").EventRegistry> & string, (payload: any) => {
        this.handleEvent(eventName, payload);
      });
    }
  }

  /**
   * Loads a new `StoryGraph` asset into the runtime and sets entry node if configured.
   *
   * @param graph - The narrative graph asset definition.
   * @param startAtEntry - Whether to automatically navigate to `graph.entryNodeId` on load (defaults to `true`).
   */
  public loadGraph(graph: StoryGraph, startAtEntry: boolean = true): void {
    this.graph = graph;
    this.state.graphId = graph.id;

    if (startAtEntry && graph.entryNodeId && graph.nodes[graph.entryNodeId]) {
      this.navigateToNode(graph.entryNodeId);
    }
  }

  /**
   * Executes a single declarative `StoryEffect`.
   *
   * @param effect - Declarative effect descriptor to execute.
   */
  public applyEffect(effect: StoryEffect): void {
    switch (effect.type) {
      case "setFlag":
        this.setFlag(effect.key, effect.value);
        break;

      case "setVariable":
        this.setVariable(effect.key, effect.value);
        break;

      case "incrementVariable": {
        const current = typeof this.state.variables[effect.key] === "number"
          ? (this.state.variables[effect.key] as number)
          : 0;
        this.setVariable(effect.key, current + effect.amount);
        break;
      }

      case "discoverEvidence": {
        this.discoverEvidence(effect.evidenceId);
        break;
      }

      case "completeObjective": {
        const obj = this.state.objectives[effect.objectiveId];
        if (obj) {
          obj.completed = true;
          obj.currentCount = obj.targetCount;
        } else {
          this.state.objectives[effect.objectiveId] = {
            id: effect.objectiveId,
            titleKey: effect.objectiveId,
            targetCount: 1,
            currentCount: 1,
            completed: true
          };
        }
        if (this.eventBus) {
          this.eventBus.emit("story:objective_completed", {
            objectiveId: effect.objectiveId,
            objective: this.state.objectives[effect.objectiveId]
          });
        }
        this.evaluateTransitions();
        break;
      }

      case "emitEvent": {
        if (this.eventBus) {
          this.eventBus.emit(effect.event as any, effect.payload || {});
        }
        if (this.relationshipEngine) {
          if (effect.event === "betrayal" || effect.event === "relationship:betrayal") {
            const charId = (effect.payload?.characterId as string) || "unknown";
            this.relationshipEngine.modifyRelationship(charId, { trust: -5, suspicion: 5 });
            this.relationshipEngine.addMemory({
              characterId: charId,
              type: "betrayal",
              referenceId: (effect.payload?.referenceId as string) || "betrayal_event"
            });
          } else if (effect.event === "relationship:memory") {
            const charId = (effect.payload?.characterId as string) || "unknown";
            const rawType = effect.payload?.type;
            const validTypes = ["playerChoice", "event", "lie", "promise", "betrayal", "assistance"] as const;
            const memType =
              typeof rawType === "string" && (validTypes as readonly string[]).includes(rawType)
                ? (rawType as typeof validTypes[number])
                : "event";
            const refId = (effect.payload?.referenceId as string) || "memory_event";
            this.relationshipEngine.addMemory({
              characterId: charId,
              type: memType,
              referenceId: refId
            });
          }
        }
        break;
      }

      case "navigateToNode": {
        this.navigateToNode(effect.nodeId);
        break;
      }
    }
  }

  /**
   * Sequentially executes a pipeline of declarative `StoryEffect` commands.
   *
   * @param effects - Array of declarative effect objects.
   */
  public applyEffects(effects?: readonly StoryEffect[]): void {
    if (!effects || effects.length === 0) return;
    for (const effect of effects) {
      this.applyEffect(effect);
    }
  }

  /**
   * Navigates directly to a specific node in the active graph.
   *
   * @param nodeId - Target string identifier of node to execute.
   * @returns `true` if navigation succeeded, `false` if target node does not exist in graph.
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
    if (node.objective && !this.state.objectives[node.objective.id]) {
      this.state.objectives[node.objective.id] = { ...node.objective };
    }

    // Capture checkpoint state snapshot BEFORE node entry effects execute
    if (node.checkpoint) {
      this.checkpoints.set(nodeId, {
        state: JSON.parse(JSON.stringify(this.state)),
        lastEventId: this.lastRecordedEventId
      });
    }

    // Record NodeEntered event on NarrativeTimelineEngine if bound
    if (this.timelineEngine) {
      const recorded = this.timelineEngine.recordEvent({
        type: "NodeEntered",
        title: `Entered node '${node.title || nodeId}'`,
        causedBy: this.lastRecordedEventId ? [this.lastRecordedEventId] : [],
        payload: { nodeId, type: node.type }
      });
      this.lastRecordedEventId = recorded.id;
    }

    // Apply declarative node entry effects if defined
    if (node.effects) {
      this.applyEffects(node.effects);
    }

    // Emit node custom event if configured
    if (node.emitEvent && this.eventBus) {
      this.eventBus.emit(node.emitEvent.name as any, node.emitEvent.payload || {});
    }

    // Invisible branch node handling: auto-evaluate transitions immediately without UI pause
    if (node.type === "branch") {
      const transitioned = this.evaluateTransitions();
      if (transitioned && this.state.currentNodeId !== nodeId) {
        return true;
      }
    }

    // Emit scene change event if node specifies sceneToLoad
    if (node.sceneToLoad || node.meta?.sceneToLoad) {
      const sceneToLoad = node.sceneToLoad || node.meta?.sceneToLoad;
      if (this.eventBus) {
        this.eventBus.emit("story:scene_change", {
          sceneToLoad,
          nodeId: node.id,
          node
        });
      }
    }

    // Emit story:node_changed event
    if (this.eventBus) {
      this.eventBus.emit("story:node_changed", {
        graphId: this.graph.id,
        currentNodeId: nodeId,
        previousNodeId,
        node
      });

      // Maintain backwards compatibility with story:beat_reached
      if (node.type === "dialogue" || node.type === "cutscene") {
        this.eventBus.emit("story:beat_reached", {
          beatId: nodeId,
          dialogueReference: node.dialogue?.lines[0]?.textKey || nodeId,
          payload: { node }
        });
      }
    }

    return true;
  }

  /**
   * Evaluates and steps through eligible outgoing transitions from the current node.
   *
   * @remarks
   * Outgoing transitions are sorted by priority weight (highest priority evaluated first).
   * The first transition whose `condition` evaluates to `true` is taken immediately.
   *
   * @returns `true` if an outgoing transition was triggered and executed, `false` otherwise.
   */
  public evaluateTransitions(): boolean {
    const currentNode = this.getCurrentNode();
    if (!currentNode) {
      return false;
    }

    // 1. Evaluate explicit outgoing transitions sorted by priority
    if (currentNode.transitions && currentNode.transitions.length > 0) {
      const sortedTransitions = [...currentNode.transitions].sort(
        (a, b) => (b.priority || 0) - (a.priority || 0)
      );

      for (const transition of sortedTransitions) {
        if (!transition.condition || this.evaluateCondition(transition.condition)) {
          return this.navigateToNode(transition.targetNodeId);
        }
      }
    }

    // 2. Fallback for branch nodes defined with choices instead of explicit transitions
    if (currentNode.type === "branch" && currentNode.choices && currentNode.choices.length > 0) {
      for (const choice of currentNode.choices) {
        if (!choice.condition || this.evaluateCondition(choice.condition)) {
          if (choice.effects) {
            this.applyEffects(choice.effects);
          }
          return this.navigateToNode(choice.targetNodeId);
        }
      }
    }

    return false;
  }

  /**
   * Handles incoming gameplay event notifications and advances narrative state accordingly.
   *
   * @remarks
   * Briefly sets a transient flag `event:<eventName>` in runtime state during evaluation,
   * updates active objective target counters, and triggers transition checks before clearing
   * the transient event flag.
   *
   * @param eventName - Name of the event received via `EventBus`.
   * @param payload - Data payload associated with the event notification.
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
   * Processes player decision during a 'choice' node execution.
   *
   * @param choiceId - Target choice ID selected by the user.
   * @returns `true` if choice was valid, condition passed, and transition occurred; `false` otherwise.
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

    // Record ChoiceSelected event on NarrativeTimelineEngine if bound
    if (this.timelineEngine) {
      const recorded = this.timelineEngine.recordEvent({
        type: "ChoiceSelected",
        title: `Selected choice '${choice.titleKey || choiceId}'`,
        causedBy: this.lastRecordedEventId ? [this.lastRecordedEventId] : [],
        payload: { choiceId, nodeId: node.id, targetNodeId: choice.targetNodeId }
      });
      this.lastRecordedEventId = recorded.id;
    }

    // Apply declarative choice effects if defined
    if (choice.effects) {
      this.applyEffects(choice.effects);
    }

    if (this.eventBus) {
      this.eventBus.emit("story:choice_selected", {
        choiceId,
        nodeId: node.id,
        targetNodeId: choice.targetNodeId
      });
    }

    return this.navigateToNode(choice.targetNodeId);
  }

  /**
   * Evaluates a `StoryCondition` predicate against active state deterministically.
   *
   * @remarks
   * Evaluates condition types:
   * - `event`: Checks transient `event:<key>` flag.
   * - `flag`: Evaluates boolean state flag.
   * - `variable`: Compares state variable value using relational operator.
   * - `choice`: Checks whether choice ID exists in `state.selectedChoices`.
   * - `objective`: Checks whether specified objective is completed.
   * - `evidence`: Checks whether evidence ID exists in `state.evidence`.
   * - `random`: Evaluates probability using `world.gameplayRandom` or fallback `Math.random`.
   *
   * @param condition - Condition predicate descriptor to evaluate.
   * @returns Boolean truth result of evaluation.
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

      case "evidence":
        if (!condition.key) return false;
        return !!(this.state.evidence && this.state.evidence.includes(condition.key));

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
   * Sets a narrative state boolean flag and re-evaluates outgoing node transitions.
   *
   * @param key - Flag name identifier.
   * @param value - Boolean flag value (defaults to `true`).
   */
  public setFlag(key: string, value: boolean = true): void {
    if (this.state.flags[key] === value) return;
    this.state.flags[key] = value;
    this.evaluateTransitions();
  }

  /**
   * Sets a narrative state variable value and re-evaluates outgoing node transitions.
   *
   * @param key - Variable name identifier.
   * @param value - Value to assign (number, string, or boolean).
   */
  public setVariable(key: string, value: any): void {
    if (this.state.variables[key] === value) return;
    this.state.variables[key] = value;

    if (key === "evidence" && typeof value === "string") {
      this.discoverEvidence(value);
    } else if (key.startsWith("evidence:") && value === true) {
      this.discoverEvidence(key.slice(9));
    } else if ((key.startsWith("relationship:") || key.startsWith("rel:")) && this.relationshipEngine) {
      const parts = key.split(":");
      if (parts.length >= 3) {
        const charId = parts[1];
        const metric = parts[2] as "trust" | "fear" | "respect" | "suspicion";
        if (["trust", "fear", "respect", "suspicion"].includes(metric)) {
          this.relationshipEngine.modifyRelationship(charId, { [metric]: Number(value) });
        }
      }
    }

    this.evaluateTransitions();
  }

  /**
   * Discovers evidence by ID and emits discovery notification event.
   *
   * @param evidenceId - Unique string identifier of evidence unlocked.
   */
  public discoverEvidence(evidenceId: string): void {
    if (!this.state.evidence) {
      this.state.evidence = [];
    }
    const isNew = !this.state.evidence.includes(evidenceId);
    if (isNew) {
      this.state.evidence.push(evidenceId);
      this.state.flags[`evidence:${evidenceId}`] = true;
      if (this.eventBus) {
        this.eventBus.emit("story:evidence_discovered" as any, {
          evidenceId
        });
      }
      if (this.deductionEngine) {
        this.deductionEngine.discoverEvidence(evidenceId);
      }
      this.evaluateTransitions();
    }
  }

  /**
   * Retrieves list of all discovered evidence IDs in current runtime session.
   *
   * @returns Array of discovered evidence string identifiers.
   */
  public getDiscoveredEvidence(): string[] {
    return [...(this.state.evidence || [])];
  }

  /**
   * Captures a deep serialized snapshot clone of the current runtime `StoryState`.
   *
   * @returns Deep copy of active `StoryState`.
   */
  public getState(): StoryState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Restores runtime state from a deep `StoryState` snapshot.
   *
   * @param state - State snapshot object to restore.
   */
  public setState(state: StoryState): void {
    this.state = JSON.parse(JSON.stringify(state));
    if (!this.state.evidence) {
      this.state.evidence = [];
    }
    if (this.state.currentNodeId) {
      this.navigateToNode(this.state.currentNodeId);
    }
  }

  /**
   * Retrieves the currently active `StoryNode` from the loaded graph.
   *
   * @returns Active `StoryNode` instance, or `null` if no graph is loaded or active node is unset.
   */
  public getCurrentNode(): StoryNode | null {
    if (!this.graph || !this.state.currentNodeId) return null;
    return this.graph.nodes[this.state.currentNodeId] || null;
  }

  /**
   * Retrieves the currently loaded `StoryGraph` asset.
   *
   * @returns Active `StoryGraph`, or `null` if no graph is loaded.
   */
  public getGraph(): StoryGraph | null {
    return this.graph;
  }

  private checkObjectiveProgress(eventName: string, payload: any): void {
    if (eventName.startsWith("story:") || eventName.startsWith("dialogue:") || eventName.startsWith("scene:")) {
      return;
    }

    for (const objId in this.state.objectives) {
      const obj = this.state.objectives[objId];
      if (obj.completed) continue;

      const increment =
        typeof payload?.amount === "number"
          ? payload.amount
          : typeof payload?.increment === "number"
          ? payload.increment
          : 1;

      obj.currentCount += increment;
      if (obj.currentCount >= obj.targetCount) {
        obj.completed = true;
        if (this.eventBus) {
          this.eventBus.emit("story:objective_completed", {
            objectiveId: obj.id,
            objective: obj
          });
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
