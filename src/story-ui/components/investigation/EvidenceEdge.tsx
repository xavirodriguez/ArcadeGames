import React from 'react';
import { EvidenceEdgeViewModel, EvidenceNodeViewModel, EvidenceRelation } from '../../types/evidence';

interface EvidenceEdgeProps {
  edge: EvidenceEdgeViewModel;
  nodes: EvidenceNodeViewModel[];
}

export const EvidenceEdge: React.FC<EvidenceEdgeProps> = ({ edge, nodes }) => {
  if (!edge.discovered) return null;

  const fromNode = nodes.find((n) => n.id === edge.from && n.discovered);
  const toNode = nodes.find((n) => n.id === edge.to && n.discovered);

  if (!fromNode || !toNode) return null;

  // Position coordinates map 0..1000 to percentages 0..100
  const x1 = (fromNode.position.x / 1000) * 100;
  const y1 = (fromNode.position.y / 1000) * 100;
  const x2 = (toNode.position.x / 1000) * 100;
  const y2 = (toNode.position.y / 1000) * 100;

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  const getRelationStyles = (relation: EvidenceRelation) => {
    switch (relation) {
      case 'confirms':
        return { stroke: '#10b981', strokeWidth: '3', dashArray: undefined }; // emerald
      case 'contradicts':
        return { stroke: '#f43f5e', strokeWidth: '3', dashArray: '6,6' }; // rose
      case 'suggests':
        return { stroke: '#06b6d4', strokeWidth: '2', dashArray: '4,4' }; // cyan
      case 'mentions':
        return { stroke: '#94a3b8', strokeWidth: '2', dashArray: undefined }; // slate
      case 'caused':
        return { stroke: '#f59e0b', strokeWidth: '3', dashArray: undefined }; // amber
      case 'requires':
        return { stroke: '#a855f7', strokeWidth: '2', dashArray: '2,2' }; // purple
      case 'hiddenBy':
        return { stroke: '#64748b', strokeWidth: '2', dashArray: '8,4' }; // dark slate
    }
  };

  const style = getRelationStyles(edge.relation);

  return (
    <g className="transition-all duration-300">
      <line
        x1={`${x1}%`}
        y1={`${y1}%`}
        x2={`${x2}%`}
        y2={`${y2}%`}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        strokeDasharray={style.dashArray}
        strokeLinecap="round"
      />
      {edge.label && (
        <g transform={`translate(0, 0)`}>
          <foreignObject
            x={`${midX}%`}
            y={`${midY}%`}
            width="120"
            height="30"
            className="overflow-visible -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          >
            <div className="flex justify-center items-center h-full">
              <span className="bg-slate-950/90 text-slate-300 border border-slate-700/80 text-[10px] font-bold px-2 py-0.5 rounded shadow-md whitespace-nowrap">
                {edge.label}
              </span>
            </div>
          </foreignObject>
        </g>
      )}
    </g>
  );
};
