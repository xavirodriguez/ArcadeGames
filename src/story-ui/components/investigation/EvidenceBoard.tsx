import React from 'react';
import { EvidenceEdgeViewModel, EvidenceNodeViewModel } from '../../types/evidence';
import { EvidenceEdge } from './EvidenceEdge';
import { EvidenceNode } from './EvidenceNode';

interface EvidenceBoardProps {
  nodes: EvidenceNodeViewModel[];
  edges: EvidenceEdgeViewModel[];
  selectedNodeId?: string;
  onSelectNode: (nodeId: string) => void;
}

export const EvidenceBoard: React.FC<EvidenceBoardProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
}) => {
  const visibleNodes = nodes.filter((node) => node.discovered);
  const visibleEdges = edges.filter((edge) => edge.discovered);

  return (
    <div
      className="relative w-full h-full min-h-[500px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden select-none"
      role="region"
      aria-label="Tablero de Investigación y Evidencias"
    >
      {/* Grid pattern background */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />

      {/* SVG Layer for rendering Edges FIRST */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        {visibleEdges.map((edge) => (
          <EvidenceEdge key={edge.id} edge={edge} nodes={visibleNodes} />
        ))}
      </svg>

      {/* HTML Layer for rendering Nodes SECOND */}
      <div className="absolute inset-0 pointer-events-auto">
        {visibleNodes.map((node) => (
          <EvidenceNode
            key={node.id}
            node={node}
            isSelected={node.id === selectedNodeId}
            onSelect={onSelectNode}
          />
        ))}
      </div>

      {visibleNodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-600 italic text-sm">
          No hay evidencias ni pistas descubiertas en este momento.
        </div>
      )}
    </div>
  );
};
