import React from 'react';
import { EvidenceNodeKind, EvidenceNodeViewModel } from '../../types/evidence';

interface EvidenceNodeProps {
  node: EvidenceNodeViewModel;
  isSelected: boolean;
  onSelect: (nodeId: string) => void;
}

export const EvidenceNode: React.FC<EvidenceNodeProps> = ({
  node,
  isSelected,
  onSelect,
}) => {
  if (!node.discovered) return null;

  const getKindConfig = (kind: EvidenceNodeKind) => {
    switch (kind) {
      case 'fact':
        return {
          label: 'HECHO',
          icon: '◆',
          styles: 'bg-emerald-950/80 border-emerald-500 text-emerald-200',
        };
      case 'testimony':
        return {
          label: 'TESTIMONIO',
          icon: '💬',
          styles: 'bg-cyan-950/80 border-cyan-500 text-cyan-200',
        };
      case 'hypothesis':
        return {
          label: 'HIPÓTESIS',
          icon: '?',
          styles: 'bg-purple-950/80 border-purple-500 text-purple-200 border-dashed',
        };
      case 'person':
        return {
          label: 'PERSONA',
          icon: '👤',
          styles: 'bg-indigo-950/80 border-indigo-500 text-indigo-200',
        };
      case 'location':
        return {
          label: 'UBICACIÓN',
          icon: '📍',
          styles: 'bg-amber-950/80 border-amber-500 text-amber-200',
        };
      case 'record':
        return {
          label: 'REGISTRO',
          icon: '📄',
          styles: 'bg-blue-950/80 border-blue-500 text-blue-200',
        };
      case 'protocol':
        return {
          label: 'PROTOCOLO',
          icon: '⚙',
          styles: 'bg-rose-950/80 border-rose-500 text-rose-200',
        };
      case 'event':
        return {
          label: 'EVENTO',
          icon: '⚡',
          styles: 'bg-yellow-950/80 border-yellow-500 text-yellow-200',
        };
    }
  };

  const config = getKindConfig(node.kind);

  // Position is 0..1000 percentage mapped
  const leftPercent = `${(node.position.x / 1000) * 100}%`;
  const topPercent = `${(node.position.y / 1000) * 100}%`;

  return (
    <div
      style={{ left: leftPercent, top: topPercent }}
      className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
    >
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        className={`flex flex-col p-3 rounded-lg border-2 w-48 shadow-lg transition-all text-left focus:outline-none focus:ring-2 focus:ring-cyan-300 ${
          config.styles
        } ${
          isSelected
            ? 'ring-4 ring-cyan-400 scale-105 shadow-cyan-500/50 z-20'
            : 'hover:scale-102 hover:brightness-125'
        }`}
        aria-label={`${config.label}: ${node.title}`}
      >
        <div className="flex items-center justify-between text-xs font-bold mb-1 opacity-90 border-b border-white/20 pb-1">
          <span className="flex items-center gap-1">
            <span>{config.icon}</span>
            <span>{config.label}</span>
          </span>
          {node.status && (
            <span className="text-[10px] uppercase bg-black/40 px-1.5 py-0.5 rounded">
              {node.status}
            </span>
          )}
        </div>

        <h4 className="font-bold text-sm leading-tight text-white mb-1 line-clamp-2">
          {node.title}
        </h4>

        {node.summary && (
          <p className="text-xs opacity-80 line-clamp-2 leading-snug">
            {node.summary}
          </p>
        )}
      </button>
    </div>
  );
};
