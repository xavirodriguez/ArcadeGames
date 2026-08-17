import React from 'react';
import { ChoiceViewModel } from '../../types/choices';
import { ChoiceCard } from './ChoiceCard';
import { LockedChoice } from './LockedChoice';

interface ChoiceListProps {
  choices: ChoiceViewModel[];
  onSelectChoice: (choiceId: string) => void;
}

export const ChoiceList: React.FC<ChoiceListProps> = ({
  choices,
  onSelectChoice,
}) => {
  if (choices.length === 0) {
    return (
      <div
        className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg text-slate-500 text-center italic text-sm"
        role="status"
      >
        No hay acciones disponibles en este momento.
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-3 w-full"
      role="region"
      aria-label="Opciones de decisión"
    >
      {choices.map((choice) => {
        if (choice.state === 'available') {
          return (
            <ChoiceCard
              key={choice.id}
              choice={choice}
              onSelect={onSelectChoice}
            />
          );
        }

        return <LockedChoice key={choice.id} choice={choice} />;
      })}
    </div>
  );
};
