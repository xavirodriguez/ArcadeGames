import {
  InvestigationState,
  RuntimeChoiceSnapshot,
  StoryRuntimeSnapshot,
  StoryScreenViewModel,
} from '../types/story-screen';
import { ChoiceImportance, ChoiceViewModel } from '../types/choices';
import { ContextItem, NarrativeBlock } from '../types/narrative';
import { ChoicePresentationRegistry } from './ChoicePresentationRegistry';

export class StoryUIController {
  public buildViewModel(
    runtime: StoryRuntimeSnapshot,
    investigation: InvestigationState
  ): StoryScreenViewModel {
    // 1. Translate narrative node blocks
    const blocks: NarrativeBlock[] =
      runtime.currentNode.blocks ??
      (runtime.currentNode.text
        ? [{ type: 'paragraph', text: runtime.currentNode.text }]
        : []);

    // 2. Build context items
    const context: ContextItem[] = [];

    if (runtime.flags.log04_contradiction_discovered) {
      context.push({
        id: 'ctx_log04_contradiction',
        type: 'warning',
        label: 'Registro 04 contradice esta afirmación',
        evidenceId: 'ev_log_04',
      });
    }

    if (runtime.objectives.length > 0) {
      runtime.objectives.forEach((obj, idx) => {
        context.push({
          id: `ctx_obj_${idx}`,
          type: 'objective',
          label: obj,
        });
      });
    }

    // 3. Process choices with ChoicePresentationRegistry
    const choices: ChoiceViewModel[] = [];

    for (const runtimeChoice of runtime.choices) {
      const mapped = this.mapChoice(runtimeChoice);
      if (mapped) {
        choices.push(mapped);
      }
    }

    // 4. Build HUD
    const oxygen = typeof runtime.variables.oxygen === 'number' ? runtime.variables.oxygen : undefined;
    const energy = typeof runtime.variables.energy === 'number' ? runtime.variables.energy : undefined;

    // 5. Incorporate Investigation Visual State
    const filteredNodes = investigation.nodes.map((node) => ({
      ...node,
      discovered: investigation.discoveredNodeIds.includes(node.id),
    }));

    const filteredEdges = investigation.edges.map((edge) => ({
      ...edge,
      discovered: investigation.discoveredEdgeIds.includes(edge.id),
    }));

    const hasNewEvidence = investigation.unreadEvidenceCount > 0;

    return {
      node: {
        id: runtime.currentNode.id,
        title: runtime.currentNode.title,
        speaker: runtime.currentNode.speaker,
        blocks,
      },
      context,
      choices,
      hud: {
        oxygen,
        energy,
      },
      investigation: {
        nodes: filteredNodes,
        edges: filteredEdges,
        selectedNodeId: investigation.selectedNodeId,
        hasNewEvidence,
        unreadCount: investigation.unreadEvidenceCount,
      },
    };
  }

  private mapChoice(choice: RuntimeChoiceSnapshot): ChoiceViewModel | null {
    const meta = ChoicePresentationRegistry[choice.id];

    if (choice.available) {
      const importance: ChoiceImportance = meta?.irreversible
        ? 'irreversible'
        : 'normal';

      return {
        id: choice.id,
        title: choice.title,
        description: choice.description,
        state: 'available',
        importance,
        category: meta?.category,
        relatedEvidenceIds: meta?.relatedEvidenceIds,
      };
    }

    // Choice is locked (available === false)
    const lockedPresentation = meta?.lockedPresentation ?? 'hidden';

    if (lockedPresentation === 'hidden') {
      return null;
    }

    const importance: ChoiceImportance = meta?.irreversible
      ? 'irreversible'
      : 'normal';

    return {
      id: choice.id,
      title: choice.title,
      description: choice.description,
      state: 'locked',
      importance,
      category: meta?.category,
      lockedVariant: lockedPresentation,
      lockedReason: lockedPresentation === 'locked' ? meta?.lockedReason : undefined,
      relatedEvidenceIds: meta?.relatedEvidenceIds,
    };
  }
}
