export type ChoiceCategory =
  | 'dialogue'
  | 'action'
  | 'investigation'
  | 'deception';

export interface ChoicePresentation {
  category?: ChoiceCategory;
  irreversible?: boolean;
  lockedPresentation?: 'hidden' | 'locked' | 'mystery';
  lockedReason?: string;
  relatedEvidenceIds?: string[];
}

export type ChoiceImportance = 'normal' | 'major' | 'irreversible';

export interface ChoiceViewModel {
  id: string;
  title: string;
  description?: string;
  state: 'available' | 'locked';
  importance: ChoiceImportance;
  category?: ChoiceCategory;
  lockedVariant?: 'locked' | 'mystery';
  lockedReason?: string;
  relatedEvidenceIds?: string[];
}
