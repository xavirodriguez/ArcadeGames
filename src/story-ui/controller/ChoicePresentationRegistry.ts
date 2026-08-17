import { ChoicePresentation } from '../types/choices';

export const ChoicePresentationRegistry: Readonly<Record<string, ChoicePresentation>> = {
  confront_ares: {
    category: 'deception',
    irreversible: true,
    lockedPresentation: 'locked',
    lockedReason: 'Requiere nivel de autorización ARES Nivel 4',
    relatedEvidenceIds: ['ev_ares', 'ev_log_04'],
  },
  disable_quarantine: {
    category: 'action',
    irreversible: true,
    lockedPresentation: 'mystery',
    relatedEvidenceIds: ['ev_protocol_k12'],
  },
  secret_transfer: {
    category: 'investigation',
    irreversible: false,
    lockedPresentation: 'hidden',
    relatedEvidenceIds: ['ev_dead_crew'],
  },
  purge_override: {
    category: 'action',
    irreversible: true,
    relatedEvidenceIds: ['ev_protocol_k12'],
  },
};
