export type EvidenceNodeKind =
  | 'fact'
  | 'testimony'
  | 'hypothesis'
  | 'person'
  | 'location'
  | 'record'
  | 'protocol'
  | 'event';

export type EvidenceStatus = 'confirmed' | 'uncertain' | 'disputed';

export type EvidenceRelation =
  | 'confirms'
  | 'contradicts'
  | 'suggests'
  | 'mentions'
  | 'caused'
  | 'requires'
  | 'hiddenBy';

export interface EvidenceNodeViewModel {
  id: string;
  kind: EvidenceNodeKind;
  title: string;
  summary?: string;
  discovered: boolean;
  status?: EvidenceStatus;
  source?: string;
  position: { x: number; y: number };
}

export interface EvidenceEdgeViewModel {
  id: string;
  from: string;
  to: string;
  relation: EvidenceRelation;
  label?: string;
  discovered: boolean;
}
