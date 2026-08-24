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
        return 'bg-rose-950/40 border-rose-500/50 text-rose-300';
      case 'objective':
        return 'bg-amber-950/40 border-amber-500/50 text-amber-300';
      case 'knowledge':
        return 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300';
      case 'memory':
        return 'bg-purple-950/40 border-purple-500/50 text-purple-300';
      case 'relationship':
        return 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300';
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
      aria-label="Contexto narrativo y evidencias relacionadas"
    >
      {items.map((item) => {
        const isInteractive = Boolean(item.evidenceId && onSelectEvidence);

        return (
          <button
            key={item.id}
            type={isInteractive ? 'button' : undefined}
            disabled={!isInteractive}
            className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border font-mono tracking-wide transition-all ${getTypeStyles(
              item.type
            )} ${
              isInteractive
                ? 'cursor-pointer hover:bg-slate-800/90 hover:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400'
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
            <span className="font-sans font-medium">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
