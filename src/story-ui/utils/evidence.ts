export {
  type KindConfig,
  type RelationConfig,
  type ResourceStatus,
  EVIDENCE_KIND_CONFIGS,
  KIND_CONFIGS,
  RELATION_CONFIGS,
  getEvidenceKindConfig,
  getKindConfig,
  getRelationConfig,
  getResourceStatus,
} from '../config/evidenceConfig';

/**
 * Calculates midpoint with perpendicular offset for edge label positioning.
 */
export function calculateEdgeLabelPosition(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  offset = 2
): { labelX: number; labelY: number } {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const angle = Math.atan2(y2 - y1, x2 - x1);

  const labelX = midX + Math.cos(angle + Math.PI / 2) * offset;
  const labelY = midY + Math.sin(angle + Math.PI / 2) * offset;

  return { labelX, labelY };
}
