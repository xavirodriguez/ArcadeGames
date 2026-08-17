import test, { describe, beforeEach, it } from 'node:test';
import assert from 'node:assert/strict';
import { StoryUIController } from '../controller/StoryUIController';
import { InvestigationState, StoryRuntimeSnapshot } from '../types/story-screen';

describe('StoryUIController', () => {
  let controller: StoryUIController;

  beforeEach(() => {
    controller = new StoryUIController();
  });

  const baseRuntimeSnapshot: StoryRuntimeSnapshot = {
    currentNode: {
      id: 'node_test',
      title: 'Node Test Title',
      text: 'Sample paragraph text.',
    },
    choices: [
      { id: 'query_logs', title: 'Query Logs', available: true },
      { id: 'confront_ares', title: 'Confront ARES', available: false },
      { id: 'disable_quarantine', title: 'Disable Quarantine', available: false },
      { id: 'secret_transfer', title: 'Secret Transfer', available: false },
      { id: 'unregistered_choice', title: 'Unregistered Choice', available: false },
    ],
    flags: { log04_contradiction_discovered: true },
    variables: { oxygen: 50, energy: 80 },
    selectedChoices: [],
    objectives: ['Investigate station.'],
  };

  const baseInvestigationState: InvestigationState = {
    nodes: [
      {
        id: 'ev_1',
        kind: 'fact',
        title: 'Evidence 1',
        discovered: true,
        position: { x: 100, y: 100 },
      },
    ],
    edges: [],
    discoveredNodeIds: ['ev_1'],
    discoveredEdgeIds: [],
    unreadEvidenceCount: 0,
  };

  it('correctly maps narrative blocks and context items', () => {
    const vm = controller.buildViewModel(baseRuntimeSnapshot, baseInvestigationState);

    assert.equal(vm.node.id, 'node_test');
    assert.equal(vm.node.title, 'Node Test Title');
    assert.deepEqual(vm.node.blocks, [{ type: 'paragraph', text: 'Sample paragraph text.' }]);

    assert.equal(vm.context.length, 2);
    assert.equal(vm.context[0].id, 'ctx_log04_contradiction');
    assert.equal(vm.context[1].label, 'Investigate station.');
  });

  it('filters out choices with lockedPresentation === "hidden"', () => {
    const vm = controller.buildViewModel(baseRuntimeSnapshot, baseInvestigationState);

    const choiceIds = vm.choices.map((c) => c.id);
    assert.ok(choiceIds.includes('query_logs'));
    assert.ok(choiceIds.includes('confront_ares'));
    assert.ok(choiceIds.includes('disable_quarantine'));
    assert.ok(!choiceIds.includes('secret_transfer'));
    assert.ok(!choiceIds.includes('unregistered_choice'));
  });

  it('correctly sets lockedVariant for locked and mystery choices', () => {
    const vm = controller.buildViewModel(baseRuntimeSnapshot, baseInvestigationState);

    const confront = vm.choices.find((c) => c.id === 'confront_ares');
    assert.ok(confront);
    assert.equal(confront?.state, 'locked');
    assert.equal(confront?.lockedVariant, 'locked');
    assert.equal(confront?.lockedReason, 'Requiere nivel de autorización ARES Nivel 4');

    const quarantine = vm.choices.find((c) => c.id === 'disable_quarantine');
    assert.ok(quarantine);
    assert.equal(quarantine?.state, 'locked');
    assert.equal(quarantine?.lockedVariant, 'mystery');
    assert.equal(quarantine?.lockedReason, undefined);
  });

  it('applies default metadata for choices not in registry', () => {
    const snapshot: StoryRuntimeSnapshot = {
      ...baseRuntimeSnapshot,
      choices: [
        { id: 'unknown_available', title: 'Unknown Choice', available: true },
      ],
    };

    const vm = controller.buildViewModel(snapshot, baseInvestigationState);
    assert.equal(vm.choices.length, 1);
    assert.equal(vm.choices[0].id, 'unknown_available');
    assert.equal(vm.choices[0].state, 'available');
    assert.equal(vm.choices[0].importance, 'normal');
  });
});
