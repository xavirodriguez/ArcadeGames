import React from 'react';
import { EvidenceNodeViewModel } from '../../types/evidence';
import { getKindConfig } from '../../config/evidenceConfig';

interface EvidenceNodeProps {
  node: EvidenceNodeViewModel;
  isSelected: boolean;
  hasNodeSelected?: boolean;
  isRelatedToSelected?: boolean;
  onSelect: (nodeId: string) => void;
}

/**
 * Renders an evidence node on the investigation board using unified SVG iconography,
 * shared evidence configurations, and Tailwind CSS v4 hover effects (hover:scale-[1.02]).
 */
export const EvidenceNode: React.FC<EvidenceNodeProps> = ({
  node,
  isSelected,
  hasNodeSelected = false,
  isRelatedToSelected = false,
  onSelect,
}) => {
  if (!node.discovered) return null;

  const config = getKindConfig(node.kind);
  const IconComponent = config.icon;

  // Position is 0..1000 percentage mapped
  const leftPercent = `${(node.position.x / 1000) * 100}%`;
  const topPercent = `${(node.position.y / 1000) * 100}%`;

  // Focus effect: dim unrelated nodes slightly when another node is selected
  const isDimmed = hasNodeSelected && !isSelected && !isRelatedToSelected;

  return (
    <div
      style={{ left: leftPercent, top: topPercent }}
      className={`absolute -translate-x-1/2 -translate-y-1/2 z-10 transition-opacity duration-300 ${
        isDimmed ? 'opacity-40' : 'opacity-100'
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        className={`flex flex-col p-3 rounded-md border-2 w-48 shadow-lg transition-transform transition-shadow duration-200 text-left focus:outline-none focus:ring-2 focus:ring-cyan-300 ${
          config.styles
        } ${
          isSelected
            ? 'ring-4 ring-cyan-400 scale-[1.05] shadow-cyan-500/50 z-20'
            : 'hover:scale-[1.02] hover:brightness-125'
        }`}
        aria-label={`${config.label}: ${node.title}`}
      >
        <div className="flex items-center justify-between text-xs font-mono font-bold mb-1 opacity-90 border-b border-white/20 pb-1">
          <span className="flex items-center gap-1.5">
            <IconComponent size={14} className="flex-shrink-0" />
            <span>{config.label}</span>
          </span>
          {node.status && (
            <span className="text-[10px] uppercase bg-black/40 px-1.5 py-0.5 rounded font-mono">
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
