import React from 'react';
import { ContextItem } from '../../types/narrative';

interface ContextStripProps {
  items: ContextItem[];
  onSelectEvidence?: (evidenceId: string) => void;
}

export const ContextStrip: React.FC<ContextStripProps> = ({
  items,
  onSelectEvidence,
}) => {
  if (items.length === 0) return null;

  const getTypeStyles = (type: ContextItem['type']) => {
    switch (type) {
      case 'warning':
        return 'bg-rose-950/50 border-rose-600/60 text-rose-300';
      case 'objective':
        return 'bg-amber-950/50 border-amber-600/60 text-amber-300';
      case 'knowledge':
        return 'bg-slate-900/90 border-slate-700 text-slate-200';
      case 'memory':
        return 'bg-purple-950/50 border-purple-600/60 text-purple-300';
      case 'relationship':
        return 'bg-emerald-950/50 border-emerald-600/60 text-emerald-300';
    }
  };

  const getTypeBadge = (type: ContextItem['type']) => {
    switch (type) {
      case 'warning':
        return 'ADVERTENCIA';
      case 'objective':
        return 'OBJETIVO';
      case 'knowledge':
        return 'CONOCIMIENTO';
      case 'memory':
        return 'MEMORIA';
      case 'relationship':
        return 'RELACIÓN';
    }
  };

  return (
    <div
      className="flex flex-wrap gap-2 my-2 select-none"
      role="region"
      aria-label="Registro de contexto narrativo"
    >
      {items.map((item) => {
        const isInteractive = Boolean(item.evidenceId && onSelectEvidence);

        return (
          <button
            key={item.id}
            type={isInteractive ? 'button' : undefined}
            disabled={!isInteractive}
            className={`inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded border font-mono tracking-wide transition-all ${getTypeStyles(
              item.type
            )} ${
              isInteractive
                ? 'cursor-pointer hover:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400'
                : 'cursor-default'
            }`}
            aria-label={`${getTypeBadge(item.type)}: ${item.label}`}
            onClick={() => {
              if (item.evidenceId && onSelectEvidence) {
                onSelectEvidence(item.evidenceId);
              }
            }}
          >
            <span className="font-extrabold uppercase text-[10px] tracking-wider opacity-90">
              [{getTypeBadge(item.type)}]
            </span>
            <span className="font-mono text-xs uppercase tracking-wide">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
