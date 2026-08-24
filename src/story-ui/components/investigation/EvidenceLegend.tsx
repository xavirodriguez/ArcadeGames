import React, { useState } from 'react';
import { EvidenceRelation } from '../../types/evidence';
import { getRelationConfig } from '../../utils/evidence';

const RELATIONS: EvidenceRelation[] = [
  'confirms',
  'contradicts',
  'suggests',
  'mentions',
  'caused',
  'requires',
  'hiddenBy',
];

export const EvidenceLegend: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="absolute bottom-3 left-3 z-20 max-w-xs select-none">
      <div className="bg-slate-950/90 border border-slate-800 rounded-md backdrop-blur-md p-2 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-slate-300">
            LEYENDA DE RELACIONES
          </span>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[10px] font-mono font-bold text-slate-400 hover:text-cyan-300 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-400"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Ocultar leyenda' : 'Mostrar leyenda'}
          >
            {isExpanded ? 'CONTRAER' : 'EXPANDIR'}
          </button>
        </div>

        {isExpanded && (
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-col gap-1.5 max-h-48 overflow-y-auto">
            {RELATIONS.map((rel) => {
              const cfg = getRelationConfig(rel);
              return (
                <div key={rel} className="flex items-center gap-2 text-xs text-slate-300">
                  <svg className="w-8 h-3 flex-shrink-0" viewBox="0 0 32 12" aria-hidden="true">
                    <line
                      x1="0"
                      y1="6"
                      x2="32"
                      y2="6"
                      stroke={cfg.stroke}
                      strokeWidth={cfg.strokeWidth}
                      strokeDasharray={cfg.dashArray}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="font-mono text-[11px] truncate">{cfg.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
