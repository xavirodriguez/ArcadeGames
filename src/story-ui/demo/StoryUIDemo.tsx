import React, { useMemo, useState } from 'react';
import { StoryUIController } from '../controller/StoryUIController';
import { StoryScreen } from '../components/StoryScreen';
import { mockInvestigationState, mockStoryRuntimeSnapshot } from './mockStoryData';

export const StoryUIDemo: React.FC = () => {
  const [investigationOpen, setInvestigationOpen] = useState(false);
  const [investigationState, setInvestigationState] = useState(mockInvestigationState);

  const controller = useMemo(() => new StoryUIController(), []);

  const viewModel = useMemo(() => {
    return controller.buildViewModel(mockStoryRuntimeSnapshot, investigationState);
  }, [controller, investigationState]);

  const handleSelectChoice = (choiceId: string) => {
    alert(`[INTENCIÓN]: Elección seleccionada '${choiceId}'`);
  };

  const handleOpenInvestigation = () => {
    setInvestigationOpen(true);
    setInvestigationState((prev) => ({
      ...prev,
      unreadEvidenceCount: 0,
    }));
  };

  const handleCloseInvestigation = () => {
    setInvestigationOpen(false);
  };

  const handleSelectEvidence = (evidenceId: string) => {
    setInvestigationState((prev) => ({
      ...prev,
      selectedNodeId: evidenceId,
    }));
    setInvestigationOpen(true);
  };

  return (
    <StoryScreen
      vm={viewModel}
      investigationOpen={investigationOpen}
      onSelectChoice={handleSelectChoice}
      onOpenInvestigation={handleOpenInvestigation}
      onCloseInvestigation={handleCloseInvestigation}
      onSelectEvidence={handleSelectEvidence}
    />
  );
};

export default StoryUIDemo;
