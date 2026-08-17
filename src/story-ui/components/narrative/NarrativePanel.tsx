import React from 'react';
import { ContextItem, NarrativeBlock, SpeakerViewModel } from '../../types/narrative';
import { SpeakerHeader } from './SpeakerHeader';
import { ContextStrip } from './ContextStrip';

interface NarrativePanelProps {
  title?: string;
  speaker?: SpeakerViewModel;
  blocks: NarrativeBlock[];
  context?: ContextItem[];
  onSelectEvidence?: (evidenceId: string) => void;
}

export const NarrativePanel: React.FC<NarrativePanelProps> = ({
  title,
  speaker,
  blocks,
  context = [],
  onSelectEvidence,
}) => {
  return (
    <div
      className="flex flex-col gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-xl shadow-2xl backdrop-blur-md text-slate-100"
      role="article"
      aria-label={title || 'Escena Narrativa'}
    >
      {title && (
        <h2 className="text-xl font-extrabold text-cyan-400 tracking-wide border-b border-slate-800 pb-2">
          {title}
        </h2>
      )}

      {speaker && <SpeakerHeader speaker={speaker} />}

      {context.length > 0 && (
        <ContextStrip items={context} onSelectEvidence={onSelectEvidence} />
      )}

      <div className="flex flex-col gap-3 mt-2 leading-relaxed">
        {blocks.map((block, idx) => {
          switch (block.type) {
            case 'paragraph':
              return (
                <p key={idx} className="text-slate-200 text-base">
                  {block.text}
                </p>
              );
            case 'quote':
              return (
                <blockquote
                  key={idx}
                  className="pl-4 border-l-4 border-cyan-500 italic bg-cyan-950/20 py-2 px-3 rounded-r text-cyan-200"
                >
                  <p>"{block.text}"</p>
                  {block.author && (
                    <footer className="text-xs text-cyan-400 font-semibold mt-1">
                      — {block.author}
                    </footer>
                  )}
                </blockquote>
              );
            case 'system':
              return (
                <div
                  key={idx}
                  className="p-3 bg-slate-950 font-mono text-xs text-emerald-400 border border-emerald-500/30 rounded"
                >
                  <span className="font-bold mr-2">[SISTEMA]:</span>
                  {block.text}
                </div>
              );
            case 'warning':
              return (
                <div
                  key={idx}
                  className="p-3 bg-rose-950/40 border border-rose-500/50 text-rose-200 rounded font-semibold text-sm"
                >
                  <span className="font-bold mr-2">[ALERTA]:</span>
                  {block.text}
                </div>
              );
          }
        })}
      </div>
    </div>
  );
};
