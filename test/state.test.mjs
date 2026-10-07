import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import StateService from '../src/scripts/services/state.js';

describe('StateService', () => {
  it('serializes flash progress and child task state', () => {
    const taskState = { blanks: [1] };
    const state = StateService.serialize({
      phase: 'question',
      flashesUsed: 2,
      submitted: true,
      taskState
    });
    assert.equal(state.v, 3);
    assert.equal(state.phase, 'question');
    assert.equal(state.flashesUsed, 2);
    assert.equal(state.submitted, true);
    assert.deepEqual(state.taskState, taskState);
    assert.equal(state.selectedIndexes, undefined);
  });

  it('stores an in-progress flash as the question phase', () => {
    const state = StateService.serialize({
      phase: 'flashing',
      flashesUsed: 1,
      submitted: false
    });
    assert.equal(state.phase, 'question');
    assert.equal(state.flashesUsed, 1);
  });

  it('normalizes flashing and loading phases on restore', () => {
    const flashing = StateService.normalize({
      phase: 'flashing',
      flashesUsed: 1,
      submitted: false
    });
    assert.equal(flashing.phase, 'question');
    assert.equal(flashing.flashesUsed, 1);

    const loading = StateService.normalize({ phase: 'loading' });
    assert.equal(loading.phase, 'ready');
    assert.equal(loading.flashesUsed, 0);
  });

  it('handles empty input', () => {
    const empty = StateService.normalize(null);
    assert.equal(empty.phase, 'ready');
    assert.equal(empty.flashesUsed, 0);
    assert.equal(empty.submitted, false);
    assert.equal(empty.taskState, undefined);
  });
});
