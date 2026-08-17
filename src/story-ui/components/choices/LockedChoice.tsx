import React from 'react';
import { ChoiceViewModel } from '../../types/choices';

interface LockedChoiceProps {
  choice: ChoiceViewModel;
}

export const LockedChoice: React.FC<LockedChoiceProps> = ({ choice }) => {
  const isMystery = choice.lockedVariant === 'mystery';

  const getReasonText = () => {
    if (isMystery) {
      return 'Esta opción permanece envuelta en sombras. Algo o alguien te impide ver la solución con claridad.';
    }
    return choice.lockedReason || 'Opción bloqueada. Requisitos de investigación no satisfechos.';
  };

  return (
    <div
      className={`w-full text-left p-4 rounded-lg border cursor-not-allowed opacity-80 ${
        isMystery
          ? 'bg-purple-950/20 border-purple-800/40 text-purple-300'
          : 'bg-slate-950/60 border-slate-800 text-slate-500'
      }`}
      role="region"
      aria-label={`Opción bloqueada: ${isMystery ? 'Opción misteriosa' : choice.title}`}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
              isMystery
                ? 'bg-purple-900/40 border-purple-700/50 text-purple-300'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            {isMystery ? '??? ENIGMA' : 'BLOQUEADO'}
          </span>
          <span className="text-xs font-semibold uppercase opacity-60">
            [REQUISITO NO CUMPLIDO]
          </span>
        </div>

        <h3 className="text-base font-bold italic">
          {isMystery ? '????????????????' : choice.title}
        </h3>

        <p className="text-xs italic leading-relaxed mt-1 border-t border-slate-800/60 pt-2">
          {getReasonText()}
        </p>
      </div>
    </div>
  );
};
