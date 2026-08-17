import React from 'react';

interface ResourceHUDProps {
  oxygen?: number;
  energy?: number;
  hasNewEvidence: boolean;
  unreadCount?: number;
  onOpenInvestigation: () => void;
}

export const ResourceHUD: React.FC<ResourceHUDProps> = ({
  oxygen,
  energy,
  hasNewEvidence,
  unreadCount = 0,
  onOpenInvestigation,
}) => {
  return (
    <header
      className="w-full bg-slate-950/90 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between backdrop-blur-md sticky top-0 z-30"
      role="banner"
    >
      {/* Station Vital Signs */}
      <div className="flex items-center gap-6">
        {typeof oxygen === 'number' && (
          <div
            className="flex items-center gap-2"
            role="status"
            aria-label={`Nivel de Oxígeno: ${oxygen}%`}
          >
            <span className="text-xs font-bold text-cyan-400 tracking-wider">
              O2
            </span>
            <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full transition-all duration-300 ${
                  oxygen < 20
                    ? 'bg-rose-500 animate-pulse'
                    : oxygen < 50
                    ? 'bg-amber-400'
                    : 'bg-cyan-400'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, oxygen))}%` }}
              />
            </div>
            <span className="text-xs font-mono text-slate-300 font-bold">
              {oxygen}%
            </span>
          </div>
        )}

        {typeof energy === 'number' && (
          <div
            className="flex items-center gap-2"
            role="status"
            aria-label={`Energía de Estación: ${energy}%`}
          >
            <span className="text-xs font-bold text-amber-400 tracking-wider">
              PWR
            </span>
            <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-amber-400 transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, energy))}%` }}
              />
            </div>
            <span className="text-xs font-mono text-slate-300 font-bold">
              {energy}%
            </span>
          </div>
        )}
      </div>

      {/* Investigation Drawer Button Trigger */}
      <button
        type="button"
        onClick={onOpenInvestigation}
        className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 hover:bg-slate-800 transition-all text-xs font-bold text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        aria-label={`Abrir Tablero de Investigación${
          hasNewEvidence ? ` (${unreadCount} nuevas pistas)` : ''
        }`}
      >
        <span>🔍 INVESTIGACIÓN</span>
        {hasNewEvidence && (
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
          </span>
        )}
      </button>
    </header>
  );
};
