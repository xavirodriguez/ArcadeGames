import React from 'react';
import { EvidenceEdgeViewModel, EvidenceNodeViewModel } from '../../types/evidence';
import { getRelationConfig } from '../../utils/evidence';

interface EvidenceEdgeProps {
  edge: EvidenceEdgeViewModel;
  nodes: EvidenceNodeViewModel[];
  isHighlighted?: boolean;
  isDimmed?: boolean;
  isSelectedNodeConnected?: boolean;
  hasNodeSelected?: boolean;
  selectedNodeId?: string;
}

export const EvidenceEdge: React.FC<EvidenceEdgeProps> = ({
  edge,
  nodes,
  isHighlighted,
  isDimmed,
  isSelectedNodeConnected = false,
  hasNodeSelected = false,
  selectedNodeId,
}) => {
  if (!edge.discovered) return null;

  const fromNode = nodes.find((n) => n.id === edge.from && n.discovered);
  const toNode = nodes.find((n) => n.id === edge.to && n.discovered);

  if (!fromNode || !toNode) return null;

  // Coordinates are in 0..1000 percentage mapped system
  const x1 = (fromNode.position.x / 1000) * 100;
  const y1 = (fromNode.position.y / 1000) * 100;
  const x2 = (toNode.position.x / 1000) * 100;
  const y2 = (toNode.position.y / 1000) * 100;

  const nodeIsSelected = Boolean(selectedNodeId || hasNodeSelected);
  const connectedToSelected =
    (selectedNodeId && (edge.from === selectedNodeId || edge.to === selectedNodeId)) ||
    isSelectedNodeConnected;

  const isConnected = isHighlighted ?? (nodeIsSelected && Boolean(connectedToSelected));
  const dimmed = isDimmed ?? (nodeIsSelected && !isConnected);

  // Perpendicular offset for edge label positioning
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const offset = 2;

  const labelX = midX + Math.cos(angle + Math.PI / 2) * offset;
  const labelY = midY + Math.sin(angle + Math.PI / 2) * offset;

  const style = getRelationConfig(edge.relation);

  // Focus highlighting: connected edge stays full opacity, unconnected dims to 0.25
  let opacity = 1;
  let strokeWidth = style.strokeWidth;

  if (dimmed) {
    opacity = 0.25;
  } else if (isConnected) {
    opacity = 1;
    strokeWidth = style.strokeWidth + 1.5;
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
        className="transition-all duration-300"
      />
      {isConnected && (
        <line
          x1={`${x1}%`}
          y1={`${y1}%`}
          x2={`${x2}%`}
          y2={`${y2}%`}
          stroke={style.stroke}
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
          opacity={0.35}
          className="transition-all duration-300"
        />
      )}
      {edge.label && (
        <g transform={`translate(0, 0)`}>
          <foreignObject
            x={`${labelX}%`}
            y={`${labelY}%`}
            width="130"
            height="32"
            className="overflow-visible -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          >
            <div className="flex justify-center items-center h-full">
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-md whitespace-nowrap transition-colors ${
                  isConnected
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
