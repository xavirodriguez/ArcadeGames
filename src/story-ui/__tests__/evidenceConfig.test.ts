import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getKindConfig, getRelationConfig, KIND_CONFIGS, RELATION_CONFIGS } from '../config/evidenceConfig';

describe('evidenceConfig', () => {
  it('returns valid KindConfig for all 8 evidence kinds', () => {
    const kinds = ['fact', 'testimony', 'hypothesis', 'person', 'location', 'record', 'protocol', 'event'] as const;

    kinds.forEach((kind) => {
      const cfg = getKindConfig(kind);
      assert.ok(cfg);
      assert.ok(cfg.label);
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
});
