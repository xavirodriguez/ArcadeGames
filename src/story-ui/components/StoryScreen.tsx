import React from 'react';
import { StoryScreenViewModel } from '../types/story-screen';
import { ResourceHUD } from './ResourceHUD';
import { NarrativePanel } from './narrative/NarrativePanel';
import { ChoiceList } from './choices/ChoiceList';
import { InvestigationDrawer } from './investigation/InvestigationDrawer';

interface StoryScreenProps {
  vm: StoryScreenViewModel;
  investigationOpen: boolean;
  onSelectChoice: (choiceId: string) => void;
  onOpenInvestigation: () => void;
  onCloseInvestigation: () => void;
  onSelectEvidence: (evidenceId: string) => void;
}

export const StoryScreen: React.FC<StoryScreenProps> = ({
  vm,
  investigationOpen,
  onSelectChoice,
  onOpenInvestigation,
  onCloseInvestigation,
  onSelectEvidence,
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top HUD */}
      <ResourceHUD
        oxygen={vm.hud.oxygen}
        energy={vm.hud.energy}
        hasNewEvidence={vm.investigation.hasNewEvidence}
        unreadCount={vm.investigation.unreadCount}
        onOpenInvestigation={onOpenInvestigation}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        {/* Narrative Content */}
        <NarrativePanel
          title={vm.node.title}
          speaker={vm.node.speaker}
          blocks={vm.node.blocks}
          context={vm.context}
          onSelectEvidence={onSelectEvidence}
        />

        {/* Player Choices */}
        <div className="w-full">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3 px-1">
            ACCIONES DISPONIBLES
          </h2>
          <ChoiceList
            choices={vm.choices}
            onSelectChoice={onSelectChoice}
          />
        </div>
      </main>

      {/* Investigation Drawer Overlay */}
      <InvestigationDrawer
        isOpen={investigationOpen}
        onClose={onCloseInvestigation}
        nodes={vm.investigation.nodes}
        edges={vm.investigation.edges}
        selectedNodeId={vm.investigation.selectedNodeId}
        onSelectNode={onSelectEvidence}
      />
    </div>
  );
};
