/**
 * Core interfaces and types for the Data-Driven Story Runtime.
 * @public
 */

export type StoryNodeType = "dialogue" | "cutscene" | "gameplay" | "choice" | "objective" | "branch";

export interface StoryCharacter {
  id: string;
  name: string;
  avatarUrl?: string;
  localeKey?: string;
}

export interface DialogueLine {
  id?: string;
  characterId?: string;
  textKey: string;
  speakerName?: string;
  emotion?: string;
}

export interface Dialogue {
  id: string;
  lines: DialogueLine[];
  autoAdvance?: boolean;
}

export interface Cutscene {
  id: string;
  sceneId?: string;
  duration?: number;
  dialogueQueue?: DialogueLine[];
  transitionEffect?: string;
}

export type StoryConditionType =
  | "event"
  | "flag"
  | "variable"
  | "choice"
  | "objective"
  | "random";

export interface StoryCondition {
  type: StoryConditionType;
  /** Name of the event or flag or variable */
  key?: string;
  /** Expected value or target comparison */
  value?: any;
  /** Operator for numeric/string comparisons: '==' | '!=' | '>' | '>=' | '<' | '<=' | 'contains' */
  operator?: "==" | "!=" | ">" | ">=" | "<" | "<=" | "contains";
  /** Probability threshold (0.0 - 1.0) for 'random' condition */
  chance?: number;
}

export interface StoryTransition {
  targetNodeId: string;
  condition?: StoryCondition;
  priority?: number;
}

export interface StoryChoice {
  id: string;
  titleKey: string;
  descriptionKey?: string;
  targetNodeId: string;
  condition?: StoryCondition;
}

export interface StoryObjective {
  id: string;
  titleKey: string;
  descriptionKey?: string;
  targetCount: number;
  currentCount: number;
  completed: boolean;
}

export interface StoryNode {
  id: string;
  type: StoryNodeType;
  title?: string;
  /** Optional target scene identifier to load when entering this node */
  sceneToLoad?: string;
  /** Optional end/terminal node flag to prevent false-positive dead end warnings in validator */
  isEndNode?: boolean;
  /** Generic metadata container for node payload */
  meta?: Record<string, any>;
  /** Specific node data payload depending on node type */
  dialogue?: Dialogue;
  cutscene?: Cutscene;
  choices?: StoryChoice[];
  objective?: StoryObjective;
  /** Event payload to emit upon entering this node */
  emitEvent?: {
    name: string;
    payload?: Record<string, any>;
  };
  /** Transitions out of this node */
  transitions?: StoryTransition[];
}

export interface StoryGraph {
  id: string;
  title: string;
  entryNodeId: string;
  nodes: Record<string, StoryNode>;
  characters?: Record<string, StoryCharacter>;
}

export interface StoryState {
  graphId: string | null;
  currentNodeId: string | null;
  flags: Record<string, boolean>;
  variables: Record<string, number | string | boolean | any>;
  selectedChoices: string[];
  objectives: Record<string, StoryObjective>;
  history: string[];
}
