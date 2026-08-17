import { ContextItem, NarrativeBlock, SpeakerViewModel } from './narrative';
import { ChoiceViewModel } from './choices';
import { EvidenceEdgeViewModel, EvidenceNodeViewModel } from './evidence';

export interface RuntimeChoiceSnapshot {
  id: string;
  title: string;
  description?: string;
  available: boolean;
}

export interface RuntimeNodeSnapshot {
  id: string;
  title?: string;
  speaker?: SpeakerViewModel;
  blocks?: NarrativeBlock[];
  text?: string;
}

export interface StoryRuntimeSnapshot {
  currentNode: RuntimeNodeSnapshot;
  choices: RuntimeChoiceSnapshot[];
  flags: Record<string, boolean>;
  variables: Record<string, number | string | boolean>;
  selectedChoices: string[];
  objectives: string[];
}

export interface InvestigationState {
  nodes: EvidenceNodeViewModel[];
  edges: EvidenceEdgeViewModel[];
  discoveredNodeIds: string[];
  discoveredEdgeIds: string[];
  selectedNodeId?: string;
  unreadEvidenceCount: number;
}

export interface StoryScreenViewModel {
  node: {
    id: string;
    title?: string;
    speaker?: SpeakerViewModel;
    blocks: NarrativeBlock[];
  };
  context: ContextItem[];
  choices: ChoiceViewModel[];
  hud: {
    oxygen?: number;
    energy?: number;
  };
  investigation: {
    nodes: EvidenceNodeViewModel[];
    edges: EvidenceEdgeViewModel[];
    selectedNodeId?: string;
    hasNewEvidence: boolean;
    unreadCount: number;
  };
}
