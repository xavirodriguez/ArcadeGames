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
  setTitle(title: string): TBuilder;
  setSceneToLoad(sceneToLoad: string): TBuilder;
  setIsEndNode(isEndNode?: boolean): TBuilder;
  setCheckpoint(checkpoint?: boolean): TBuilder;
  setMeta(meta: Record<string, unknown>): TBuilder;
  addEffect(effect: StoryEffect): TBuilder;
  addTransition(
    targetNodeId: string,
    condition?: StoryCondition,
    priority?: number
  ): TBuilder;
  setEmitEvent(
    name: string,
    payload?: Record<string, number | string | boolean>
  ): TBuilder;
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
  setDialogue(dialogue: Dialogue): ChoiceNodeBuilder;
  addDialogueLine(line: DialogueLine): ChoiceNodeBuilder;
  addChoice(choice: StoryChoice): ChoiceNodeBuilder;
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

  public asDialogue(): DialogueNodeBuilder {
    this.type = "dialogue";
    return this;
  }

  public asCutscene(): CutsceneNodeBuilder {
    this.type = "cutscene";
    return this;
  }

  public asChoice(): ChoiceNodeBuilder {
    this.type = "choice";
    return this;
  }

  public asGameplay(): GameplayNodeBuilder {
    this.type = "gameplay";
    return this;
  }

  public asObjective(): ObjectiveNodeBuilder {
    this.type = "objective";
    return this;
  }

  public asBranch(): BranchNodeBuilder {
    this.type = "branch";
    return this;
  }

  public setTitle(title: string): this {
    this.title = title;
    return this;
  }

  public setSceneToLoad(sceneToLoad: string): this {
    this.sceneToLoad = sceneToLoad;
    return this;
  }

  public setIsEndNode(isEndNode = true): this {
    this.isEndNode = isEndNode;
    return this;
  }

  public setCheckpoint(checkpoint = true): this {
    this.checkpoint = checkpoint;
    return this;
  }

  public setMeta(meta: Record<string, unknown>): this {
    this.meta = meta;
    return this;
  }

  public addEffect(effect: StoryEffect): this {
    this.effects.push(effect);
    return this;
  }

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

  public setEmitEvent(
    name: string,
    payload?: Record<string, number | string | boolean>
  ): this {
    this.emitEvent = { name, payload };
    return this;
  }

  public setDialogue(dialogue: Dialogue): this {
    this.dialogue = dialogue;
    return this;
  }

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

  public setAutoAdvance(autoAdvance: boolean): this {
    if (!this.dialogue) {
      this.dialogue = { id: `dlg_${this.id}`, lines: [] };
    }
    this.dialogue.autoAdvance = autoAdvance;
    return this;
  }

  public setCutscene(cutscene: Cutscene): this {
    this.cutscene = cutscene;
    return this;
  }

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
