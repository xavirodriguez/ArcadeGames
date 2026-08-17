import React, { useEffect, useRef } from 'react';
import { EvidenceEdgeViewModel, EvidenceNodeViewModel } from '../../types/evidence';
import { EvidenceBoard } from './EvidenceBoard';

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
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;

      // Focus close button on open
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
          return;
        }

        // Focus trap inside modal
        if (e.key === 'Tab' && modalRef.current) {
          const focusables = modalRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusables.length === 0) return;

          const first = focusables[0];
          const last = focusables[focusables.length - 1];

          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Panel de Investigación"
    >
      <div
        ref={modalRef}
        className="w-full md:w-4/5 lg:w-3/4 h-full bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔍</span>
            <h2 className="text-lg font-extrabold text-cyan-400 tracking-wider">
              TABLERO DE INVESTIGACIÓN
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            aria-label="Cerrar panel de investigación"
          >
            ✕ CERRAR (ESC)
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
          {selectedNode && (
            <div
              className="w-full lg:w-80 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 overflow-y-auto"
              role="region"
              aria-label="Detalle de evidencia seleccionada"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold uppercase text-cyan-400 tracking-wider">
                  [{selectedNode.kind}]
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
