import React from 'react';
import { EvidenceEdgeViewModel, EvidenceNodeViewModel } from '../../types/evidence';
import { getRelationConfig } from '../../config/evidenceConfig';

interface EvidenceEdgeProps {
  edge: EvidenceEdgeViewModel;
  nodes: EvidenceNodeViewModel[];
  isSelectedNodeConnected?: boolean;
  hasNodeSelected?: boolean;
}

export const EvidenceEdge: React.FC<EvidenceEdgeProps> = ({
  edge,
  nodes,
  isSelectedNodeConnected = false,
  hasNodeSelected = false,
}) => {
  if (!edge.discovered) return null;

  const fromNode = nodes.find((n) => n.id === edge.from && n.discovered);
  const toNode = nodes.find((n) => n.id === edge.to && n.discovered);

  if (!fromNode || !toNode) return null;

  // Position coordinates map 0..1000 to percentages 0..100
  const x1 = (fromNode.position.x / 1000) * 100;
  const y1 = (fromNode.position.y / 1000) * 100;
  const x2 = (toNode.position.x / 1000) * 100;
  const y2 = (toNode.position.y / 1000) * 100;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);

  // Perpendicular offset for label to avoid line collision
  // Offset in percent space (approx 1.8% offset perpendicularly)
  const offsetDistance = 1.8;
  const perpX = -Math.sin(angle) * offsetDistance;
  const perpY = Math.cos(angle) * offsetDistance;

  const midX = (x1 + x2) / 2 + perpX;
  const midY = (y1 + y2) / 2 + perpY;

  const style = getRelationConfig(edge.relation);

  // Selection states: highlighted, dimmed, or normal
  let opacity = 1;
  let strokeWidth = style.strokeWidth;

  if (hasNodeSelected) {
    if (isSelectedNodeConnected) {
      opacity = 1;
      strokeWidth = style.strokeWidth + 1.5;
    } else {
      opacity = 0.25;
    }
  }

  return (
    <g className="transition-all duration-300" style={{ opacity }}>
      <line
        x1={`${x1}%`}
        y1={`${y1}%`}
        x2={`${x2}%`}
        y2={`${y2}%`}
        stroke={style.stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={style.dashArray}
        strokeLinecap="round"
      />
      {isSelectedNodeConnected && (
        /* Additional glow line for connected selected edge */
        <line
          x1={`${x1}%`}
          y1={`${y1}%`}
          x2={`${x2}%`}
          y2={`${y2}%`}
          stroke={style.stroke}
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
          opacity={0.3}
        />
      )}
      {edge.label && (
        <g transform={`translate(0, 0)`}>
          <foreignObject
            x={`${midX}%`}
            y={`${midY}%`}
            width="130"
            height="32"
            className="overflow-visible -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          >
            <div className="flex justify-center items-center h-full">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-md whitespace-nowrap transition-colors ${
                  isSelectedNodeConnected
                    ? 'bg-slate-900 text-cyan-200 border border-cyan-500/80 ring-1 ring-cyan-500/40'
                    : 'bg-slate-950/90 text-slate-300 border border-slate-700/80'
                }`}
              >
                {edge.label}
              </span>
            </div>
          </foreignObject>
        </g>
      )}
    </g>
  );
};
