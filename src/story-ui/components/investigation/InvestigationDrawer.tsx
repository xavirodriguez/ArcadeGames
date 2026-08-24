import React, { useEffect, useState } from 'react';
import { EvidenceEdgeViewModel, EvidenceNodeViewModel } from '../../types/evidence';
import { EvidenceBoard } from './EvidenceBoard';
import { getKindConfig } from '../../config/evidenceConfig';
import { SearchIcon, CloseIcon } from '../icons/EvidenceIcons';

interface InvestigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: EvidenceNodeViewModel[];
  edges: EvidenceEdgeViewModel[];
  selectedNodeId?: string;
  onSelectNode: (nodeId: string) => void;
}

export const InvestigationDrawer: React.FC<InvestigationDrawerProps> = ({
  isOpen,
  onClose,
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
}) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isOpen) {
      setShouldRender(true);
      timeoutId = setTimeout(() => {
        setIsMounted(true);
      }, 10);
    } else {
      setIsMounted(false);
      timeoutId = setTimeout(() => {
        setShouldRender(false);
      }, 300);
    }
    return () => clearTimeout(timeoutId);
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedKindConfig = selectedNode ? getKindConfig(selectedNode.kind) : null;
  const SelectedIcon = selectedKindConfig ? selectedKindConfig.icon : null;

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300 ${
        isMounted ? 'opacity-100' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Panel de Investigación"
    >
      <div
        className={`w-full md:w-4/5 lg:w-3/4 h-full bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl transform transition-transform duration-300 ease-out ${
          isMounted ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <SearchIcon size={20} className="text-cyan-400" />
            <h2 className="text-lg font-extrabold text-cyan-400 tracking-wider">
              TABLERO DE INVESTIGACIÓN
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors"
            aria-label="Cerrar panel de investigación"
          >
            <CloseIcon size={16} />
            <span>CERRAR (ESC)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col lg:flex-row p-4 gap-4 overflow-hidden">
          {/* Main Evidence Board */}
          <div className="flex-1 h-full min-h-[400px]">
            <EvidenceBoard
              nodes={nodes}
              edges={edges}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
            />
          </div>

          {/* Selected Evidence Detail Sidebar */}
          {selectedNode && selectedKindConfig && SelectedIcon && (
            <div
              className="w-full lg:w-80 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 overflow-y-auto"
              role="region"
              aria-label="Detalle de evidencia seleccionada"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${selectedKindConfig.badgeStyles}`}>
                  <SelectedIcon size={12} />
                  <span>{selectedKindConfig.label}</span>
                </span>
                {selectedNode.status && (
                  <span className="text-xs font-bold uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                    {selectedNode.status}
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-slate-100">
                {selectedNode.title}
              </h3>

              {selectedNode.source && (
                <p className="text-xs text-slate-400 italic">
                  Fuente: {selectedNode.source}
                </p>
              )}

              <p className="text-sm text-slate-300 leading-relaxed border-t border-slate-900 pt-2">
                {selectedNode.summary || 'Sin descripción detallada.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
