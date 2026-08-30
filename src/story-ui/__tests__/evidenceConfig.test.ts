import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getKindConfig, getRelationConfig, KIND_CONFIGS, RELATION_CONFIGS } from '../config/evidenceConfig';
import { calculateEdgeLabelPosition } from '../utils/evidence';

describe('evidenceConfig', () => {
  it('returns valid KindConfig with expected labels for all 8 evidence kinds', () => {
    const kindLabelMap = {
      fact: 'HECHO',
      testimony: 'TESTIMONIO',
      hypothesis: 'HIPÓTESIS',
      person: 'PERSONA',
      location: 'UBICACIÓN',
      record: 'REGISTRO',
      protocol: 'PROTOCOLO',
      event: 'EVENTO',
    } as const;

    (Object.keys(kindLabelMap) as (keyof typeof kindLabelMap)[]).forEach((kind) => {
      const cfg = getKindConfig(kind);
      assert.ok(cfg);
      assert.equal(cfg.label, kindLabelMap[kind]);
      assert.ok(cfg.icon);
      assert.ok(cfg.styles);
      assert.ok(cfg.badgeStyles);
    });
  });

  it('fallback to fact config for unknown kind', () => {
    // @ts-expect-error - testing invalid fallback
    const cfg = getKindConfig('non_existent_kind');
    assert.equal(cfg.label, 'HECHO');
  });

  it('returns valid RelationConfig for all 7 relation types', () => {
    const relations = ['confirms', 'contradicts', 'suggests', 'mentions', 'caused', 'requires', 'hiddenBy'] as const;

    relations.forEach((rel) => {
      const cfg = getRelationConfig(rel);
      assert.ok(cfg);
      assert.ok(cfg.label);
      assert.ok(cfg.stroke);
      assert.ok(cfg.strokeWidth);
    });
  });

  it('calculates perpendicular offset for edge label positioning', () => {
    // Horizontal edge from (0, 0) to (10, 0)
    // Midpoint is (5, 0), angle is 0 rad
    // Perpendicular angle (0 + PI/2) = PI/2 -> cos=0, sin=1
    // For offset = 2, labelX should be 5, labelY should be 2
    const { labelX, labelY } = calculateEdgeLabelPosition(0, 0, 10, 0, 2);
    assert.ok(Math.abs(labelX - 5) < 1e-5, `expected labelX ~ 5, got ${labelX}`);
    assert.ok(Math.abs(labelY - 2) < 1e-5, `expected labelY ~ 2, got ${labelY}`);
  });
});
