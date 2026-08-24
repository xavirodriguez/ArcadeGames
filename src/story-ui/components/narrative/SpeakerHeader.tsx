import React from 'react';
import { SpeakerViewModel } from '../../types/narrative';

interface SpeakerHeaderProps {
  speaker: SpeakerViewModel;
}

export const SpeakerHeader: React.FC<SpeakerHeaderProps> = ({ speaker }) => {
  const getPresentationStyle = () => {
    switch (speaker.presentation) {
      case 'terminal':
        return 'border-emerald-500/50 bg-emerald-950/30 text-emerald-400 font-mono';
      case 'radio':
        return 'border-amber-500/50 bg-amber-950/30 text-amber-400 font-sans tracking-wide';
      case 'portrait':
      default:
        return 'border-slate-700 bg-slate-950/60 text-slate-200 font-sans';
    }
  };

  const getBadgeLabel = () => {
    switch (speaker.presentation) {
      case 'terminal':
        return 'SISTEMA TERMINAL';
      case 'radio':
        return 'TRANSMISIÓN DE RADIO';
      case 'portrait':
        return 'SUJETO IDENTIFICADO';
    }
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded border ${getPresentationStyle()}`}
      role="region"
      aria-label={`Interlocutor: ${speaker.name}`}
    >
      {speaker.avatarUrl ? (
        <img
          src={speaker.avatarUrl}
          alt={`Retrato de ${speaker.name}`}
          className="w-12 h-12 rounded object-cover border border-slate-700"
        />
      ) : (
        <div className="w-12 h-12 rounded bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-lg text-slate-100 flex-shrink-0 font-mono">
          {speaker.name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex flex-col">
        <span className="text-xs font-mono uppercase font-bold opacity-75 tracking-wider">
          {getBadgeLabel()}
        </span>
        <span className="text-lg font-bold text-slate-100">{speaker.name}</span>
      </div>
    </div>
  );
};
