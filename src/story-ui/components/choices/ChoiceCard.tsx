import React from 'react';
import { ChoiceViewModel } from '../../types/choices';

interface ChoiceCardProps {
  choice: ChoiceViewModel;
  onSelect: (choiceId: string) => void;
}

export const ChoiceCard: React.FC<ChoiceCardProps> = ({ choice, onSelect }) => {
  const isIrreversible = choice.importance === 'irreversible';

  const getCategoryBadge = () => {
    switch (choice.category) {
      case 'dialogue':
        return 'DIÁLOGO';
      case 'action':
        return 'ACCIÓN';
      case 'investigation':
        return 'INVESTIGACIÓN';
      case 'deception':
        return 'ENGAÑO';
      default:
        return 'DECISIÓN';
    }
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(choice.id)}
      className={`w-full text-left p-4 rounded-lg border transition-all duration-200 group relative focus:outline-none focus:ring-2 focus:ring-cyan-400 active:scale-[0.99] ${
        isIrreversible
          ? 'bg-rose-950/20 border-rose-600/60 hover:bg-rose-900/40 hover:border-rose-500'
          : 'bg-slate-900/80 border-slate-700/80 hover:bg-slate-800 hover:border-cyan-500/70'
      }`}
      aria-label={`${getCategoryBadge()}: ${choice.title}${
        isIrreversible ? ' (Decisión irreversible)' : ''
      }`}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
              isIrreversible
                ? 'bg-rose-900/60 text-rose-300 border border-rose-700/50'
                : 'bg-slate-800 text-cyan-400 border border-slate-700'
            }`}
          >
            {getCategoryBadge()}
          </span>

          {isIrreversible && (
            <span
              className="text-xs font-black uppercase text-rose-400 bg-rose-950/80 border border-rose-600/80 px-2 py-0.5 rounded tracking-wide animate-pulse"
              title="Esta decisión tendrá consecuencias permanentes"
            >
              ⚠ IRREVERSIBLE
            </span>
          )}
        </div>

        <h3 className="text-base font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
          {choice.title}
        </h3>

        {choice.description && (
          <p className="text-sm text-slate-400 leading-snug">
            {choice.description}
          </p>
        )}
      </div>
    </button>
  );
};
