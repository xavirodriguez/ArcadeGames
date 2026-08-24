import React from 'react';
import { EvidenceNodeKind, EvidenceRelation } from '../types/evidence';
import {
  FactIcon,
  TestimonyIcon,
  HypothesisIcon,
  PersonIcon,
  LocationIcon,
  RecordIcon,
  ProtocolIcon,
  EventIcon,
  IconProps,
} from '../components/icons/EvidenceIcons';

export interface KindConfig {
  label: string;
  icon: React.FC<IconProps>;
  styles: string;
  badgeStyles: string;
  accentColor: string;
}

export interface RelationConfig {
  label: string;
  stroke: string;
  strokeWidth: number;
  dashArray?: string;
}

export const KIND_CONFIGS: Record<EvidenceNodeKind, KindConfig> = {
  fact: {
    label: 'HECHO',
    icon: FactIcon,
    styles: 'bg-emerald-950/80 border-emerald-500 text-emerald-200',
    badgeStyles: 'bg-emerald-900/60 text-emerald-300 border-emerald-700/50',
    accentColor: '#10b981',
  },
  testimony: {
    label: 'TESTIMONIO',
    icon: TestimonyIcon,
    styles: 'bg-cyan-950/80 border-cyan-500 text-cyan-200',
    badgeStyles: 'bg-cyan-900/60 text-cyan-300 border-cyan-700/50',
    accentColor: '#06b6d4',
  },
  hypothesis: {
    label: 'HIPÓTESIS',
    icon: HypothesisIcon,
    styles: 'bg-purple-950/80 border-purple-500 text-purple-200 border-dashed',
    badgeStyles: 'bg-purple-900/60 text-purple-300 border-purple-700/50',
    accentColor: '#a855f7',
  },
  person: {
    label: 'PERSONA',
    icon: PersonIcon,
    styles: 'bg-indigo-950/80 border-indigo-500 text-indigo-200',
    badgeStyles: 'bg-indigo-900/60 text-indigo-300 border-indigo-700/50',
    accentColor: '#6366f1',
  },
  location: {
    label: 'UBICACIÓN',
    icon: LocationIcon,
    styles: 'bg-amber-950/80 border-amber-500 text-amber-200',
    badgeStyles: 'bg-amber-900/60 text-amber-300 border-amber-700/50',
    accentColor: '#f59e0b',
  },
  record: {
    label: 'REGISTRO',
    icon: RecordIcon,
    styles: 'bg-blue-950/80 border-blue-500 text-blue-200',
    badgeStyles: 'bg-blue-900/60 text-blue-300 border-blue-700/50',
    accentColor: '#3b82f6',
  },
  protocol: {
    label: 'PROTOCOLO',
    icon: ProtocolIcon,
    styles: 'bg-rose-950/80 border-rose-500 text-rose-200',
    badgeStyles: 'bg-rose-900/60 text-rose-300 border-rose-700/50',
    accentColor: '#f43f5e',
  },
  event: {
    label: 'EVENTO',
    icon: EventIcon,
    styles: 'bg-yellow-950/80 border-yellow-500 text-yellow-200',
    badgeStyles: 'bg-yellow-900/60 text-yellow-300 border-yellow-700/50',
    accentColor: '#eab308',
  },
};

export function getKindConfig(kind: EvidenceNodeKind): KindConfig {
  return KIND_CONFIGS[kind] ?? KIND_CONFIGS.fact;
}

export const RELATION_CONFIGS: Record<EvidenceRelation, RelationConfig> = {
  confirms: {
    label: 'Confirma',
    stroke: '#10b981',
    strokeWidth: 3,
  },
  contradicts: {
    label: 'Contradice',
    stroke: '#f43f5e',
    strokeWidth: 3,
    dashArray: '6,6',
  },
  suggests: {
    label: 'Sugiere',
    stroke: '#06b6d4',
    strokeWidth: 2,
    dashArray: '4,4',
  },
  mentions: {
    label: 'Menciona',
    stroke: '#94a3b8',
    strokeWidth: 2,
  },
  caused: {
    label: 'Causó',
    stroke: '#f59e0b',
    strokeWidth: 3,
  },
  requires: {
    label: 'Requiere',
    stroke: '#a855f7',
    strokeWidth: 2,
    dashArray: '2,2',
  },
  hiddenBy: {
    label: 'Oculto por',
    stroke: '#64748b',
    strokeWidth: 2,
    dashArray: '8,4',
  },
};

export function getRelationConfig(relation: EvidenceRelation): RelationConfig {
  return RELATION_CONFIGS[relation] ?? RELATION_CONFIGS.mentions;
}
