export type NarrativeBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; text: string; author?: string }
  | { type: 'system'; text: string }
  | { type: 'warning'; text: string };

export interface SpeakerViewModel {
  id: string;
  name: string;
  avatarUrl?: string;
  presentation: 'portrait' | 'terminal' | 'radio';
}

export interface ContextItem {
  id: string;
  type: 'knowledge' | 'warning' | 'memory' | 'objective' | 'relationship';
  label: string;
  evidenceId?: string;
}
