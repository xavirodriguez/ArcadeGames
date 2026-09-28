import {
  StoryGraph,
  StoryNode,
  StoryNodeType,
  StoryChoice,
  StoryCondition,
  StoryEffect,
  StoryObjective,
  Dialogue,
  DialogueLine,
  Cutscene,
  StoryCharacter,
  RewindPolicy
} from "./StoryTypes";
import {
  StoryGraphValidator,
  StoryGraphValidationError,
  StoryGraphValidationOptions
} from "./StoryGraphValidator";

/**
 * Custom error thrown when building a `StoryGraph` fails validation requirements.
 *
 * @public
 */
export class StoryGraphBuildError extends Error {
  /** List of structural errors that prevented building the story graph. */
  public readonly errors: StoryGraphValidationError[];
  /** List of structural warnings detected during story graph building. */
  public readonly warnings: StoryGraphValidationError[];

  constructor(
    message: string,
    errors: StoryGraphValidationError[] = [],
    warnings: StoryGraphValidationError[] = []
  ) {
    super(message);
    this.name = "StoryGraphBuildError";
    this.errors = errors;
    this.warnings = warnings;
    Object.setPrototypeOf(this, StoryGraphBuildError.prototype);
  }
}

/**
 * Shared fluent builder interface for configuring common `StoryNode` properties.
 *
 * @public
 */
export interface CommonNodeBuilderMethods<TBuilder> {
  /** Sets the user-visible title of the story node. */
  setTitle(title: string): TBuilder;
  /** Sets the scene ID to trigger when this node becomes active. */
  setSceneToLoad(sceneToLoad: string): TBuilder;
  /** Flags whether this node represents a terminal ending in the story graph. */
  setIsEndNode(isEndNode?: boolean): TBuilder;
  /** Sets whether reaching this node saves narrative progression as a restore checkpoint. */
  setCheckpoint(checkpoint?: boolean): TBuilder;
  /** Attaches custom metadata properties to the story node. */
  setMeta(meta: Record<string, unknown>): TBuilder;
  /** Appends a narrative effect to execute when this node is entered. */
  addEffect(effect: StoryEffect): TBuilder;
  /** Appends an outgoing transition rule targeting another node. */
  addTransition(
    targetNodeId: string,
    condition?: StoryCondition,
    priority?: number
  ): TBuilder;
  /** Sets an event payload to emit on the event bus when this node triggers. */
  setEmitEvent(
    name: string,
    payload?: Record<string, number | string | boolean>
  ): TBuilder;
  /** Constructs and returns the final plain `StoryNode` object. */
  build(): StoryNode;
}

/**
 * Fluent builder interface for dialogue nodes.
 *
 * @public
 */
export interface DialogueNodeBuilder
  extends CommonNodeBuilderMethods<DialogueNodeBuilder> {
  setDialogue(dialogue: Dialogue): DialogueNodeBuilder;
  addDialogueLine(line: DialogueLine): DialogueNodeBuilder;
  setAutoAdvance(autoAdvance: boolean): DialogueNodeBuilder;
}

/**
 * Fluent builder interface for choice nodes.
 *
 * @public
 */
export interface ChoiceNodeBuilder
  extends CommonNodeBuilderMethods<ChoiceNodeBuilder> {
  /** Sets the optional introductory dialogue displayed alongside the choices. */
  setDialogue(dialogue: Dialogue): ChoiceNodeBuilder;
  /** Appends a single line to the introductory dialogue. */
  addDialogueLine(line: DialogueLine): ChoiceNodeBuilder;
  /** Appends a choice definition object. */
  addChoice(choice: StoryChoice): ChoiceNodeBuilder;
  /** Appends a choice option with individual parameters. */
  addChoice(
    id: string,
    titleKey: string,
    targetNodeId: string,
    options?: {
      descriptionKey?: string;
      condition?: StoryCondition;
      effects?: StoryEffect[];
      rewindPolicy?: RewindPolicy;
    }
  ): ChoiceNodeBuilder;
}

/**
 * Fluent builder interface for cutscene nodes.
 *
 * @public
 */
export interface CutsceneNodeBuilder
  extends CommonNodeBuilderMethods<CutsceneNodeBuilder> {
  setCutscene(cutscene: Cutscene): CutsceneNodeBuilder;
  addDialogueLine(line: DialogueLine): CutsceneNodeBuilder;
}

/**
 * Fluent builder interface for gameplay nodes.
 *
 * @public
 */
export interface GameplayNodeBuilder
  extends CommonNodeBuilderMethods<GameplayNodeBuilder> {
  setObjective(objective: StoryObjective): GameplayNodeBuilder;
}

/**
 * Fluent builder interface for objective nodes.
 *
 * @public
 */
export interface ObjectiveNodeBuilder
  extends CommonNodeBuilderMethods<ObjectiveNodeBuilder> {
  setObjective(objective: StoryObjective): ObjectiveNodeBuilder;
}

/**
 * Fluent builder interface for branch nodes.
 *
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BranchNodeBuilder
  extends CommonNodeBuilderMethods<BranchNodeBuilder> {}

/**
 * Concrete builder for constructing individual `StoryNode` objects using fluent methods.
 *
 * @public
 */
export class StoryNodeBuilder
  implements
    DialogueNodeBuilder,
    ChoiceNodeBuilder,
    CutsceneNodeBuilder,
    GameplayNodeBuilder,
    ObjectiveNodeBuilder,
    BranchNodeBuilder {
  private id: string;
  private type: StoryNodeType = "dialogue";
  private title?: string;
  private sceneToLoad?: string;
  private isEndNode?: boolean;
  private checkpoint?: boolean;
  private meta?: Record<string, unknown>;
  private dialogue?: Dialogue;
  private cutscene?: Cutscene;
  private choices: StoryChoice[] = [];
  private objective?: StoryObjective;
  private effects: StoryEffect[] = [];
  private emitEvent?: {
    name: string;
    payload?: Record<string, number | string | boolean>;
  };
  private transitions: Array<{
    targetNodeId: string;
    condition?: StoryCondition;
    priority?: number;
  }> = [];

  constructor(id: string) {
    this.id = id;
  }

  /**
   * Static factory method to create a new `StoryNodeBuilder` instance.
   *
   * @param id - Unique node identifier.
   */
  public static node(id: string): StoryNodeBuilder {
    return new StoryNodeBuilder(id);
  }

  /** Configures this node as a dialogue node. */
  public asDialogue(): DialogueNodeBuilder {
    this.type = "dialogue";
    return this;
  }

  /** Configures this node as a cutscene node. */
  public asCutscene(): CutsceneNodeBuilder {
    this.type = "cutscene";
    return this;
  }

  /** Configures this node as a choice node. */
  public asChoice(): ChoiceNodeBuilder {
    this.type = "choice";
    return this;
  }

  /** Configures this node as a gameplay node. */
  public asGameplay(): GameplayNodeBuilder {
    this.type = "gameplay";
    return this;
  }

  /** Configures this node as an objective node. */
  public asObjective(): ObjectiveNodeBuilder {
    this.type = "objective";
    return this;
  }

  /** Configures this node as a logical branch node. */
  public asBranch(): BranchNodeBuilder {
    this.type = "branch";
    return this;
  }

  /** Sets the title of the node. */
  public setTitle(title: string): this {
    this.title = title;
    return this;
  }

  /** Sets the scene ID to trigger when this node is reached. */
  public setSceneToLoad(sceneToLoad: string): this {
    this.sceneToLoad = sceneToLoad;
    return this;
  }

  /** Sets whether this node acts as a narrative graph terminal end node. */
  public setIsEndNode(isEndNode = true): this {
    this.isEndNode = isEndNode;
    return this;
  }

  /** Sets whether progress is saved at this node as a restore checkpoint. */
  public setCheckpoint(checkpoint = true): this {
    this.checkpoint = checkpoint;
    return this;
  }

  /** Sets metadata KV pairs on the node. */
  public setMeta(meta: Record<string, unknown>): this {
    this.meta = meta;
    return this;
  }

  /** Appends a narrative effect to execute when this node is triggered. */
  public addEffect(effect: StoryEffect): this {
    this.effects.push(effect);
    return this;
  }

  /** Appends a conditional or direct transition to another target node. */
  public addTransition(
    targetNodeId: string,
    condition?: StoryCondition,
    priority?: number
  ): this {
    const transition: {
      targetNodeId: string;
      condition?: StoryCondition;
      priority?: number;
    } = { targetNodeId };
    if (condition !== undefined) {
      transition.condition = condition;
    }
    if (priority !== undefined) {
      transition.priority = priority;
    }
    this.transitions.push(transition);
    return this;
  }

  /** Sets an event payload emitted on the EventBus when this node triggers. */
  public setEmitEvent(
    name: string,
    payload?: Record<string, number | string | boolean>
  ): this {
    this.emitEvent = { name, payload };
    return this;
  }

  /** Sets the complete dialogue structure for this node. */
  public setDialogue(dialogue: Dialogue): this {
    this.dialogue = dialogue;
    return this;
  }

  /** Appends a single dialogue line to the active dialogue queue or cutscene queue. */
  public addDialogueLine(line: DialogueLine): this {
    if (this.type === "cutscene") {
      if (!this.cutscene) {
        this.cutscene = { id: `cs_${this.id}`, dialogueQueue: [] };
      }
      if (!this.cutscene.dialogueQueue) {
        this.cutscene.dialogueQueue = [];
      }
      this.cutscene.dialogueQueue.push(line);
    } else {
      if (!this.dialogue) {
        this.dialogue = { id: `dlg_${this.id}`, lines: [] };
      }
      this.dialogue.lines.push(line);
    }
    return this;
  }

  /** Toggles automatic advance behavior for dialogue lines. */
  public setAutoAdvance(autoAdvance: boolean): this {
    if (!this.dialogue) {
      this.dialogue = { id: `dlg_${this.id}`, lines: [] };
    }
    this.dialogue.autoAdvance = autoAdvance;
    return this;
  }

  /** Sets the cutscene configuration for this node. */
  public setCutscene(cutscene: Cutscene): this {
    this.cutscene = cutscene;
    return this;
  }

  /** Appends a player choice option to this choice node. */
  public addChoice(
    choiceOrId: StoryChoice | string,
    titleKey?: string,
    targetNodeId?: string,
    options?: {
      descriptionKey?: string;
      condition?: StoryCondition;
      effects?: StoryEffect[];
      rewindPolicy?: RewindPolicy;
    }
  ): this {
    if (typeof choiceOrId === "object") {
      this.choices.push(choiceOrId);
    } else {
      const choice: StoryChoice = {
        id: choiceOrId,
        titleKey: titleKey!,
        targetNodeId: targetNodeId!
      };
      if (options?.descriptionKey !== undefined) {
        choice.descriptionKey = options.descriptionKey;
      }
      if (options?.condition !== undefined) {
        choice.condition = options.condition;
      }
      if (options?.effects !== undefined) {
        choice.effects = options.effects;
      }
      if (options?.rewindPolicy !== undefined) {
        choice.rewindPolicy = options.rewindPolicy;
      }
      this.choices.push(choice);
    }
    return this;
  }

  /** Sets the objective required to complete this gameplay/objective node. */
  public setObjective(objective: StoryObjective): this {
    this.objective = objective;
    return this;
  }

  /**
   * Constructs the plain `StoryNode` object.
   *
   * @throws `Error` if mandatory payload properties are missing for the configured node type.
   */
  public build(): StoryNode {
    const node: StoryNode = {
      id: this.id,
      type: this.type
    };

    if (this.title !== undefined) node.title = this.title;
    if (this.sceneToLoad !== undefined) node.sceneToLoad = this.sceneToLoad;
    if (this.isEndNode !== undefined) node.isEndNode = this.isEndNode;
    if (this.checkpoint !== undefined) node.checkpoint = this.checkpoint;
    if (this.meta !== undefined) node.meta = this.meta;
    if (this.effects.length > 0) node.effects = [...this.effects];
    if (this.emitEvent !== undefined) node.emitEvent = this.emitEvent;
    if (this.transitions.length > 0) node.transitions = [...this.transitions];

    switch (this.type) {
      case "dialogue":
        if (!this.dialogue) {
          throw new Error(`Dialogue node '${this.id}' must have a dialogue defined.`);
        }
        node.dialogue = this.dialogue;
        break;

      case "cutscene":
        if (!this.cutscene) {
          throw new Error(`Cutscene node '${this.id}' must have a cutscene defined.`);
        }
        node.cutscene = this.cutscene;
        break;

      case "choice":
        if (!this.choices || this.choices.length === 0) {
          throw new Error(`Choice node '${this.id}' must have at least one choice option.`);
        }
        node.choices = [...this.choices];
        if (this.dialogue) {
          node.dialogue = this.dialogue;
        }
        break;

      case "gameplay":
        if (this.objective) {
          node.objective = this.objective;
        }
        break;

      case "objective":
        if (!this.objective) {
          throw new Error(`Objective node '${this.id}' must have an objective defined.`);
        }
        node.objective = this.objective;
        break;

      case "branch":
        break;
    }

    return node;
  }
}

/**
 * Fluent builder for assembling and validating `StoryGraph` assets.
 *
 * @public
 */
export class StoryGraphBuilder {
  private id: string = "";
  private title: string = "";
  private entryNodeId: string = "";
  private nodesList: Array<StoryNode | { build(): StoryNode }> = [];
  private characters: Record<string, StoryCharacter> = {};

  constructor(id?: string, title?: string, entryNodeId?: string) {
    if (id !== undefined) this.id = id;
    if (title !== undefined) this.title = title;
    if (entryNodeId !== undefined) this.entryNodeId = entryNodeId;
  }

  /**
   * Static factory method for creating a `StoryGraphBuilder`.
   */
  public static graph(id?: string, title?: string, entryNodeId?: string): StoryGraphBuilder {
    return new StoryGraphBuilder(id, title, entryNodeId);
  }

  public setId(id: string): this {
    this.id = id;
    return this;
  }

  public setTitle(title: string): this {
    this.title = title;
    return this;
  }

  public setEntryNodeId(entryNodeId: string): this {
    this.entryNodeId = entryNodeId;
    return this;
  }

  public addCharacter(keyOrCharacter: string | StoryCharacter, character?: StoryCharacter): this {
    if (typeof keyOrCharacter === "string") {
      this.characters[keyOrCharacter] = character!;
    } else {
      this.characters[keyOrCharacter.id] = keyOrCharacter;
    }
    return this;
  }

  /**
   * Adds a node or node builder to the story graph.
   * Accepts both a plain `StoryNode` and any builder object with a `.build(): StoryNode` method.
   * Forward references to target nodes not yet added are supported without failing prior to `.build()`.
   */
  public addNode(nodeOrBuilder: StoryNode | { build(): StoryNode }): this {
    this.nodesList.push(nodeOrBuilder);
    return this;
  }

  /**
   * Assembles the `StoryGraph` asset and validates structural integrity using `StoryGraphValidator`.
   *
   * @param validationOptions - Schema declarations for variable and flag checks.
   * @param builderOptions - Options governing build error thresholds (e.g. `strict: true`).
   * @throws `StoryGraphBuildError` if errors occur or if `strict: true` and warnings occur.
   */
  public build(
    validationOptions?: StoryGraphValidationOptions,
    builderOptions?: { strict?: boolean }
  ): StoryGraph {
    const nodes: Record<string, StoryNode> = {};

    for (const item of this.nodesList) {
      const node = "build" in item && typeof (item as { build?: unknown }).build === "function" ? (item as { build(): StoryNode }).build() : (item as StoryNode);
      nodes[node.id] = node;
    }

    const graph: StoryGraph = {
      id: this.id,
      title: this.title,
      entryNodeId: this.entryNodeId,
      nodes
    };

    if (Object.keys(this.characters).length > 0) {
      graph.characters = { ...this.characters };
    }

    const result = StoryGraphValidator.validate(graph, validationOptions);

    const hasErrors = !result.valid;
    const hasWarningsInStrict = builderOptions?.strict === true && result.warnings.length > 0;

    if (hasErrors || hasWarningsInStrict) {
      const message = `Failed to build StoryGraph '${this.id}': ${result.errors.length} error(s), ${result.warnings.length} warning(s).`;
      throw new StoryGraphBuildError(message, result.errors, result.warnings);
    }

    return graph;
  }
}
