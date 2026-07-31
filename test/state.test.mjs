import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import StateService from '../src/scripts/services/state.js';

describe('StateService', () => {
  it('serializes learner state without media', () => {
    const state = StateService.serialize({
      phase: 'question',
      selectedIndexes: [2, 0],
      submitted: true,
      solutionsShown: false,
      answerOrder: [1, 0, 2]
    });
    assert.equal(state.v, 2);
    assert.equal(state.phase, 'question');
    assert.deepEqual(state.selectedIndexes, [2, 0]);
    assert.equal(state.submitted, true);
    assert.deepEqual(state.answerOrder, [1, 0, 2]);
  });

  it('accepts legacy order key from older saved state', () => {
    const restored = StateService.normalize({
      phase: 'question',
      selectedIndexes: [0],
      order: [2, 1, 0]
    });
    assert.deepEqual(restored.answerOrder, [2, 1, 0]);
  });

  it('normalizes flashing/loading phases on restore', () => {
    const flashing = StateService.normalize({
      phase: 'flashing',
      selectedIndexes: [1],
      submitted: false
    });
    assert.equal(flashing.phase, 'ready');

    const submittedFlash = StateService.normalize({
      phase: 'flashing',
      selectedIndexes: [1],
      submitted: true
    });
    assert.equal(submittedFlash.phase, 'question');
  });

  it('handles empty input', () => {
    const empty = StateService.normalize(null);
    assert.equal(empty.phase, 'ready');
    assert.deepEqual(empty.selectedIndexes, []);
  });
});
