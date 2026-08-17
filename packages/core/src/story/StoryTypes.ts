/**
 * Core interfaces and types for the Data-Driven Story Runtime in TinyAster core engine.
 *
 * @remarks
 * The Data-Driven Story Engine models narrative structures as directed graphs (`StoryGraph`),
 * where each node (`StoryNode`) represents a discrete narrative step (dialogue, cutscene, choice,
 * gameplay objective, or branching logic). Transitions between nodes are governed by `StoryCondition`
 * predicates that evaluate state flags, variables, choices, or gameplay events.
 */

/**
 * Discriminator string union identifying the specific type of payload and behavior of a `StoryNode`.
 *
 * @public
 */
export type StoryNodeType = "dialogue" | "cutscene" | "gameplay" | "choice" | "objective" | "branch";

/**
 * Declarative narrative effect applied deterministically during story execution.
 *
 * @public
 */
export type StoryEffect =
  | {
      type: "setFlag";
      key: string;
      value: boolean;
    }
  | {
      type: "setVariable";
      key: string;
      value: number | string | boolean;
    }
  | {
      type: "incrementVariable";
      key: string;
      amount: number;
    }
  | {
      type: "discoverEvidence";
      evidenceId: string;
    }
  | {
      type: "completeObjective";
      objectiveId: string;
    }
  | {
      type: "emitEvent";
      event: string;
      payload?: Record<string, number | string | boolean>;
    };

/**
 * Rewind behavior classification for narrative choices.
 *
 * @public
 */
export type RewindPolicy = "normal" | "checkpoint-only" | "permanent";

/**
 * Character metadata descriptor involved in narrative dialogue sequences.
 *
 * @public
 */
export interface StoryCharacter {
  /** Unique string identifier for the character (e.g. 'pilot', 'command_ai'). */
  id: string;
  /** Human-readable display name for fallback rendering. */
  name: string;
  /** Optional asset URL or reference path for character portrait icon. */
  avatarUrl?: string;
  /** Optional localization dictionary key for internationalized name lookups. */
  localeKey?: string;
}

/**
 * Single spoken line of dialogue in a narrative node.
 *
 * @public
 */
export interface DialogueLine {
  /** Optional unique identifier for this line segment. */
  id?: string;
  /** Optional character ID referencing a registered `StoryCharacter`. */
  characterId?: string;
  /** Primary localization key or raw fallback text for the line content. */
  textKey: string;
  /** Explicit speaker display name overriding default character name if specified. */
  speakerName?: string;
  /** Emotional indicator for portrait sprite or voice synth (e.g. 'neutral', 'alarmed'). */
  emotion?: string;
}

/**
 * Sequence of dialogue lines representing a conversation or monologue block.
 *
 * @public
 */
export interface Dialogue {
  /** Unique identifier for the dialogue collection. */
  id: string;
  /** Ordered list of spoken dialogue lines. */
  lines: DialogueLine[];
  /** Whether the dialogue automatically advances to the next line without user input. */
  autoAdvance?: boolean;
}

/**
 * Cutscene metadata defining visual scene transitions or timed narrative sequences.
 *
 * @public
 */
export interface Cutscene {
  /** Unique identifier for the cutscene instance. */
  id: string;
  /** Optional scene target identifier associated with the cutscene. */
  sceneId?: string;
  /** Optional duration in seconds or milliseconds for timed auto-completion. */
  duration?: number;
  /** Queue of dialogue lines displayed during the cutscene playback. */
  dialogueQueue?: DialogueLine[];
  /** Visual transition effect name (e.g. 'fade_black', 'crt_glitch'). */
  transitionEffect?: string;
}

/**
 * Supported condition category types for conditional branching and transitions.
 *
 * @public
 */
export type StoryConditionType =
  | "event"
  | "flag"
  | "variable"
  | "choice"
  | "objective"
  | "evidence"
  | "random";

/**
 * Predicate condition evaluated by `StoryRuntime` to determine transition eligibility.
 *
 * @public
 */
export interface StoryCondition {
  /** Category of state property evaluated by this condition. */
  type: StoryConditionType;
  /** Key name of the event, flag, or state variable being evaluated. */
  key?: string;
  /** Target value expected for state variable or flag comparisons. */
  value?: any;
  /** Comparison operator used for numeric or array evaluations. */
  operator?: "==" | "!=" | ">" | ">=" | "<" | "<=" | "contains";
  /** Probability threshold (0.0 to 1.0) for 'random' condition evaluation. */
  chance?: number;
}

/**
 * Conditional outgoing directed edge from a `StoryNode` to a target `StoryNode`.
 *
 * @public
 */
export interface StoryTransition {
  /** Target node ID to navigate to if condition evaluates to true. */
  targetNodeId: string;
  /** Optional predicate condition required to allow this transition. */
  condition?: StoryCondition;
  /** Priority ordering weight when evaluating multiple outgoing transitions (higher priority evaluated first). */
  priority?: number;
}

/**
 * User-selectable branching option presented during 'choice' type nodes.
 *
 * @public
 */
export interface StoryChoice {
  /** Unique identifier for the choice option. */
  id: string;
  /** Localization key or raw text for choice prompt title. */
  titleKey: string;
  /** Optional localization key or raw text for choice sub-description. */
  descriptionKey?: string;
  /** Target node ID navigated to when user selects this choice. */
  targetNodeId: string;
  /** Optional condition required for this choice to be visible/selectable. */
  condition?: StoryCondition;
  /** Declarative narrative effects executed when this choice is selected. */
  effects?: StoryEffect[];
  /** Rewind policy governing checkpoint restore behavior for this choice. */
  rewindPolicy?: RewindPolicy;
}

/**
 * Gameplay objective requirement attached to a `StoryNode`.
 *
 * @public
 */
export interface StoryObjective {
  /** Unique objective identifier. */
  id: string;
  /** Localization key or raw text for objective title. */
  titleKey: string;
  /** Optional localization key or sub-description. */
  descriptionKey?: string;
  /** Target numeric total required for objective completion. */
  targetCount: number;
  /** Current accumulated progress count towards completion. */
  currentCount: number;
  /** Boolean status flag indicating whether objective requirements are fulfilled. */
  completed: boolean;
}

/**
 * Node payload structure in a `StoryGraph`.
 *
 * @public
 */
export interface StoryNode {
  /** Unique node identifier within the graph. */
  id: string;
  /** Categorical type of narrative node. */
  type: StoryNodeType;
  /** Optional display title for debugging or UI header rendering. */
  title?: string;
  /** Optional target scene identifier to load when entering this node. */
  sceneToLoad?: string;
  /** Marks this node as a valid terminal leaf node to suppress orphan/dead-end linter warnings. */
  isEndNode?: boolean;
  /** Marks this node as a checkpoint location for save state restore and rewind. */
  checkpoint?: boolean;
  /** Generic key-value store for custom gameplay metadata or extended runtime parameters. */
  meta?: Record<string, any>;
  /** Dialogue payload if node type is 'dialogue'. */
  dialogue?: Dialogue;
  /** Cutscene payload if node type is 'cutscene'. */
  cutscene?: Cutscene;
  /** Choice option list if node type is 'choice'. */
  choices?: StoryChoice[];
  /** Objective tracking data if node type is 'objective'. */
  objective?: StoryObjective;
  /** Declarative narrative effects executed upon entering this node. */
  effects?: StoryEffect[];
  /** Custom event payload automatically dispatched via `EventBus` upon entering this node. */
  emitEvent?: {
    name: string;
    payload?: Record<string, any>;
  };
  /** Outgoing transitions evaluated sequentially by priority. */
  transitions?: StoryTransition[];
}

/**
 * Directed graph asset containing narrative nodes and entry state.
 *
 * @public
 */
export interface StoryGraph {
  /** Unique string identifier for the narrative story graph asset. */
  id: string;
  /** Human-readable title of the story graph or campaign. */
  title: string;
  /** ID of the entry node where execution begins upon loading graph. */
  entryNodeId: string;
  /** Key-value map of node ID strings to `StoryNode` definitions. */
  nodes: Record<string, StoryNode>;
  /** Optional map of character ID strings to registered `StoryCharacter` definitions. */
  characters?: Record<string, StoryCharacter>;
}

/**
 * Evidence item definition for narrative investigation systems.
 *
 * @public
 */
export interface EvidenceDefinition {
  /** Unique evidence string identifier. */
  id: string;
  /** Title localization key or display string. */
  titleKey: string;
  /** Optional description localization key or display string. */
  descriptionKey?: string;
  /** Categorical tag (e.g. 'log', 'sample', 'audio'). */
  category?: string;
  /** Searchable classification tags. */
  tags?: string[];
}

/**
 * Rule governing deduction formulation from discovered evidence.
 *
 * @public
 */
export interface DeductionRule {
  /** Unique deduction rule identifier. */
  id: string;
  /** Required list of evidence IDs required to draw this deduction. */
  requires: readonly string[];
  /** Resulting evidence ID produced by this deduction. */
  resultEvidenceId: string;
  /** Optional question prompt ID guiding active deduction UI framing. */
  questionId?: string;
  /** Title key or text for deduction summary. */
  titleKey?: string;
  /** Description key or text for deduction explanation. */
  descriptionKey?: string;
  /** Optional declarative effects executed upon successfully completing deduction. */
  effects?: readonly StoryEffect[];
}

/**
 * Story package metadata manifest declaring format and version specifications.
 *
 * @public
 */
export interface StoryManifest {
  /** Story package string identifier. */
  id: string;
  /** Human readable title of the narrative package. */
  title: string;
  /** Concrete story content version string (e.g., '1.4.0'). */
  contentVersion: string;
  /** Format schema technical version (e.g., 1, 2, 3). */
  schemaVersion: number;
  /** Entry graph ID loaded by default. */
  entryGraph: string;
}

/**
 * Complete versioned narrative content package structure.
 *
 * @public
 */
export interface StoryPackage {
  /** Package metadata manifest. */
  manifest: StoryManifest;
  /** Dictionary of story graphs included in package. */
  graphs: Record<string, StoryGraph>;
  /** Character registry definitions. */
  characters?: Record<string, StoryCharacter>;
  /** Discovered evidence definitions. */
  evidence?: Record<string, EvidenceDefinition>;
  /** Deduction rules mapping evidence to new insights. */
  deductions?: Record<string, DeductionRule>;
}

/**
 * Specific memory item retained by a character regarding player interactions.
 *
 * @public
 */
export interface CharacterMemory {
  /** Unique memory ID. */
  id: string;
  /** Target character ID who remembers this event. */
  characterId: string;
  /** Type of interaction or event remembered. */
  type: "playerChoice" | "event" | "lie" | "promise" | "betrayal" | "assistance";
  /** Associated reference identifier (choice ID, evidence ID, or event name). */
  referenceId: string;
  /** Importance weight multiplier. */
  weight?: number;
  /** Timestamp when memory was created. */
  timestamp?: number;
}

/**
 * Multi-dimensional relationship metric tracking character disposition.
 *
 * @public
 */
export interface RelationshipState {
  /** Level of trust (e.g. -10 to 10 or 0 to 100). */
  trust: number;
  /** Level of fear. */
  fear: number;
  /** Level of respect. */
  respect: number;
  /** Level of suspicion. */
  suspicion: number;
}

/**
 * Serialized snapshot representing a complete save state of the narrative universe.
 *
 * @public
 */
export interface NarrativeSaveGame {
  /** Save file format schema version. */
  readonly saveVersion: number;
  /** Story content version active when save was recorded. */
  readonly contentVersion: string;
  /** Narrative runtime state snapshot. */
  readonly story: StoryState;
  /** List of discovered evidence IDs. */
  readonly evidence?: string[];
  /** Map of character relationship states. */
  readonly relationships?: Record<string, RelationshipState>;
  /** List of character memories. */
  readonly memories?: CharacterMemory[];
  /** ISO timestamp string when save was created. */
  readonly timestamp: string;
  /** Optional checkpoint node ID associated with this save. */
  readonly checkpointId?: string;
}

/**
 * Individual narrative lifecycle event recorded in causal timeline.
 *
 * @public
 */
export interface NarrativeEvent {
  /** Unique narrative event identifier. */
  readonly id: string;
  /** High precision epoch timestamp. */
  readonly timestamp: number;
  /** Monotonic tick step index. */
  readonly step: number;
  /** Event classification type. */
  readonly type: string;
  /** Display title for event summary. */
  readonly title: string;
  /** List of antecedent event IDs that directly caused this event. */
  readonly causedBy?: readonly string[];
  /** List of consequent event IDs produced by this event. */
  readonly consequences?: readonly string[];
  /** Additional event metadata. */
  readonly payload?: Record<string, any>;
}

/**
 * Presentation context supplied to `NarrativePresenter` adapters.
 *
 * @public
 */
export interface NarrativePresentationContext {
  /** Currently active narrative node. */
  node: StoryNode;
  /** Current runtime state. */
  state: StoryState;
  /** Registered characters dictionary. */
  characters?: Record<string, StoryCharacter>;
  /** Currently available choices. */
  availableChoices?: StoryChoice[];
}

/**
 * Uniform presentation view model constructed by `NarrativePresenter` implementations.
 *
 * @public
 */
export interface NarrativePresentationModel {
  /** Presenter style discriminator (e.g. 'cyoa', 'terminal', 'visual_novel'). */
  style: string;
  /** Main narrative headline / title. */
  title: string;
  /** Primary body text or dialogue text. */
  body: string;
  /** Speaker metadata if applicable. */
  speaker?: {
    name: string;
    avatarUrl?: string;
    emotion?: string;
  };
  /** Formatted choice option items. */
  choices: Array<{
    id: string;
    label: string;
    description?: string;
    enabled: boolean;
  }>;
  /** Visual theme or background effect metadata. */
  themeMeta?: Record<string, any>;
}

/**
 * Mutable state snapshot managed by `StoryRuntime`.
 *
 * @public
 */
export interface StoryState {
  /** Identifier of the currently loaded `StoryGraph`, or null if no graph is loaded. */
  graphId: string | null;
  /** Identifier of the active node in the loaded graph, or null if unstarted. */
  currentNodeId: string | null;
  /** Dynamic boolean flag map set by narrative consequences or event triggers. */
  flags: Record<string, boolean>;
  /** Dynamic variable dictionary storing numeric, string, or boolean state. */
  variables: Record<string, number | string | boolean | any>;
  /** History log of choice IDs selected by player across choices. */
  selectedChoices: string[];
  /** Active objective progress lookup indexed by objective ID. */
  objectives: Record<string, StoryObjective>;
  /** Discovered evidence ID set. */
  evidence?: string[];
  /** Visited node history sequence for graph trajectory tracking. */
  history: string[];
}
