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
  | "random";

/**
 * Predicate condition evaluated by `StoryRuntime` to determine transition eligibility.
 *
 * @remarks
 * Conditions compare active narrative `StoryState` (flags, variables, choices, objectives, transient events)
 * or deterministic probability thresholds (`chance`).
 *
 * Operators available for string and numeric comparisons include standard equality (`==`, `!=`),
 * numeric relational operators (`\>`, `\>=`, `<`, `<=`), and array membership (`contains`).
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
 * @remarks
 * Represents a single narrative step or state machine vertex in the story engine.
 * Node execution emits events on `EventBus` (`story:node_changed`, `story:scene_change`)
 * and triggers transitions when conditions are met.
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
 * Mutable state snapshot managed by `StoryRuntime`.
 *
 * @remarks
 * Contains active graph progress, flags, variables, objective progress, and choice history.
 * Easily serializable for persistence or state rollback across game sessions.
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
  /** Visited node history sequence for graph trajectory tracking. */
  history: string[];
}
