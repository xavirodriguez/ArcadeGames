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
      className="flex flex-wrap gap-2 my-2"
      role="region"
      aria-label="Contexto narrativo y evidencias relacionadas"
    >
      {items.map((item) => {
        const isInteractive = Boolean(item.evidenceId && onSelectEvidence);

        const content = (
          <div
            key={item.id}
            className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border transition-all ${getTypeStyles(
              item.type
            )} ${
              isInteractive
                ? 'cursor-pointer hover:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-cyan-400'
                : ''
            }`}
            tabIndex={isInteractive ? 0 : undefined}
            role={isInteractive ? 'button' : 'status'}
            aria-label={`${getTypeBadge(item.type)}: ${item.label}`}
            onClick={() => {
              if (item.evidenceId && onSelectEvidence) {
                onSelectEvidence(item.evidenceId);
              }
            }}
            onKeyDown={(e) => {
              if (
                isInteractive &&
                (e.key === 'Enter' || e.key === ' ') &&
                item.evidenceId &&
                onSelectEvidence
              ) {
                e.preventDefault();
                onSelectEvidence(item.evidenceId);
              }
            }}
          >
            <span className="font-bold tracking-wider text-[10px]">
              [{getTypeBadge(item.type)}]
            </span>
            <span>{item.label}</span>
          </div>
        );

        return content;
      })}
    </div>
  );
};
