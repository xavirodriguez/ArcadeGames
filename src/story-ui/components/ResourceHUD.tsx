import React from 'react';
import { SearchIcon } from './icons/EvidenceIcons';

interface ResourceHUDProps {
  oxygen?: number;
  energy?: number;
  hasNewEvidence: boolean;
  unreadCount?: number;
  onOpenInvestigation: () => void;
}

type ResourceStatus = 'normal' | 'warning' | 'critical';

function getResourceStatus(value: number): ResourceStatus {
  if (value < 20) return 'critical';
  if (value < 50) return 'warning';
  return 'normal';
}

function getBarColorAndAnimation(status: ResourceStatus, isEnergy = false) {
  switch (status) {
    case 'critical':
      return 'bg-rose-500 animate-pulse';
    case 'warning':
      return 'bg-amber-400';
    case 'normal':
    default:
      return isEnergy ? 'bg-amber-400' : 'bg-cyan-400';
  }
}

export const ResourceHUD: React.FC<ResourceHUDProps> = ({
  oxygen,
  energy,
  hasNewEvidence,
  unreadCount = 0,
  onOpenInvestigation,
}) => {
  const o2Status = typeof oxygen === 'number' ? getResourceStatus(oxygen) : 'normal';
  const pwrStatus = typeof energy === 'number' ? getResourceStatus(energy) : 'normal';

  return (
    <header
      className="w-full bg-slate-950/90 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between backdrop-blur-md sticky top-0 z-30 select-none"
      role="banner"
    >
      {/* Station Vital Signs */}
      <div className="flex items-center gap-6">
        {typeof oxygen === 'number' && (
          <div
            className="flex items-center gap-2"
            role="status"
            aria-label={`Nivel de Oxígeno: ${oxygen}%, estado ${o2Status}`}
          >
            <span
              className={`text-xs font-bold tracking-wider ${
                o2Status === 'critical'
                  ? 'text-rose-400 font-extrabold animate-pulse'
                  : o2Status === 'warning'
                  ? 'text-amber-400'
                  : 'text-cyan-400'
              }`}
            >
              O2
            </span>
            <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full transition-all duration-300 ${getBarColorAndAnimation(o2Status)}`}
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
            aria-label={`Energía de Estación: ${energy}%, estado ${pwrStatus}`}
          >
            <span
              className={`text-xs font-bold tracking-wider ${
                pwrStatus === 'critical'
                  ? 'text-rose-400 font-extrabold animate-pulse'
                  : 'text-amber-400'
              }`}
            >
              PWR
            </span>
            <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full transition-all duration-300 ${getBarColorAndAnimation(pwrStatus, true)}`}
                style={{ width: `${Math.max(0, Math.min(100, energy))}%` }}
              />
            </div>
            <span className="text-xs font-mono text-slate-300 font-bold">
              {energy}%
            </span>
          </div>
        )}
      </div>

      {/* Investigation Drawer Trigger */}
      <button
        type="button"
        onClick={onOpenInvestigation}
        className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 hover:bg-slate-800 transition-all text-xs font-bold text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        aria-label={`Abrir Tablero de Investigación${
          hasNewEvidence ? ` (${unreadCount} nuevas pistas)` : ''
        }`}
      >
        <SearchIcon size={14} className="text-cyan-400 flex-shrink-0" />
        <span>INVESTIGACIÓN</span>
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
