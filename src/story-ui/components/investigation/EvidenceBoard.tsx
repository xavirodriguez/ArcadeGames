import React, { useMemo } from 'react';
import { EvidenceEdgeViewModel, EvidenceNodeViewModel } from '../../types/evidence';
import { EvidenceEdge } from './EvidenceEdge';
import { EvidenceNode } from './EvidenceNode';
import { EvidenceLegend } from './EvidenceLegend';

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
  const visibleNodes = useMemo(() => nodes.filter((node) => node.discovered), [nodes]);
  const visibleEdges = useMemo(() => edges.filter((edge) => edge.discovered), [edges]);

  // Set of node IDs related to the selected node via edges
  const relatedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const set = new Set<string>([selectedNodeId]);
    visibleEdges.forEach((edge) => {
      if (edge.from === selectedNodeId) set.add(edge.to);
      if (edge.to === selectedNodeId) set.add(edge.from);
    });
    return set;
  }, [selectedNodeId, visibleEdges]);

  // Diagnostic Overlap Detector (approx < 220px equivalent in 0..1000 coordinate space)
  const overlappingWarnings = useMemo(() => {
    const warnings: string[] = [];
    const minDistanceThreshold = 220;
    const minDistanceSq = minDistanceThreshold * minDistanceThreshold;

    for (let i = 0; i < visibleNodes.length; i++) {
      for (let j = i + 1; j < visibleNodes.length; j++) {
        const n1 = visibleNodes[i];
        const n2 = visibleNodes[j];
        const dx = n1.position.x - n2.position.x;
        const dy = n1.position.y - n2.position.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < minDistanceSq) {
          const dist = Math.round(Math.sqrt(distSq));
          warnings.push(
            `Nodos excesivamente próximos (${dist}px < 220px): "${n1.title}" y "${n2.title}"`
          );
        }
      }
    }
    return warnings;
  }, [visibleNodes]);

  const hasNodeSelected = Boolean(selectedNodeId);

  return (
    <div
      className="relative w-full h-full min-h-[500px] bg-slate-950 rounded-lg border border-slate-800 overflow-hidden select-none"
      role="region"
      aria-label="Tablero de Investigación y Evidencias"
    >
      {/* Grid pattern background */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />

      {/* SVG Layer for rendering Edges FIRST */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        {visibleEdges.map((edge) => {
          const isConnected =
            hasNodeSelected && (edge.from === selectedNodeId || edge.to === selectedNodeId);
          const isDimmed = hasNodeSelected && !isConnected;

          return (
            <EvidenceEdge
              key={edge.id}
              edge={edge}
              nodes={visibleNodes}
              selectedNodeId={selectedNodeId}
              isHighlighted={isConnected}
              isDimmed={isDimmed}
              isSelectedNodeConnected={isConnected}
              hasNodeSelected={hasNodeSelected}
            />
          );
        })}
      </svg>

      {/* HTML Layer for rendering Nodes SECOND */}
      <div className="absolute inset-0 pointer-events-auto">
        {visibleNodes.map((node) => (
          <EvidenceNode
            key={node.id}
            node={node}
            isSelected={node.id === selectedNodeId}
            hasNodeSelected={hasNodeSelected}
            isRelatedToSelected={relatedNodeIds.has(node.id)}
            onSelect={onSelectNode}
          />
        ))}
      </div>

      {/* Relationship Legend */}
      <EvidenceLegend />

      {/* Dev Warning Banner for Overlapping Nodes (< 220 units in 0..1000 coordinate space) */}
      {process.env.NODE_ENV !== 'production' && overlappingWarnings.length > 0 && (
        <div className="absolute top-2 left-2 z-30 max-w-sm bg-amber-950/90 border border-amber-500/80 text-amber-200 text-[10px] p-2 rounded shadow-lg pointer-events-none font-mono">
          <div className="font-bold uppercase tracking-wider mb-1">[DEV WARNING - OVERLAP DETECTION]</div>
          <ul className="list-disc pl-3 space-y-0.5">
            {overlappingWarnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {visibleNodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-600 italic text-sm font-mono">
          No hay evidencias ni pistas descubiertas en este momento.
        </div>
      )}
    </div>
  );
};
