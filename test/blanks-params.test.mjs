import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ADVANCED_BLANKS_LIBRARY,
  buildAdvancedBlanksRunnable,
  liftNestedTask
} from '../src/scripts/services/blanks-params.js';

describe('liftNestedTask', () => {
  it('wraps a bare view limit and drops an empty task', () => {
    const params = liftNestedTask({ behaviour: 3, task: { library: 'H5P.AdvancedBlanks 1.2' } });
    assert.deepEqual(params.behaviour, { maxFlashViews: 3 });
    assert.equal(params.task, undefined);
  });

  it('keeps unlimited views stored as 0', () => {
    const params = liftNestedTask({ behaviour: 0 });
    assert.deepEqual(params.behaviour, { maxFlashViews: 0 });
  });

  it('copies the nested blanks task onto FlashImage fields', () => {
    const params = liftNestedTask({
      behaviour: 2,
      l10n: { startFlash: 'Start' },
      a11y: { flashEnded: 'Hidden.' },
      task: {
        library: 'H5P.AdvancedBlanks 1.2',
        subContentId: 'sub-1',
        params: {
          content: {
            task: '<p>What did you see?</p>',
            blanksText: '<p>A ___.</p>',
            blanksList: [{ correctAnswerText: 'crane' }]
          },
          behaviour: {
            mode: 'typing',
            caseSensitive: true,
            enableCheckButton: false,
            enableRetry: false
          },
          overallFeedback: { overallFeedback: [{ from: 0, to: 100, feedback: 'Done' }] },
          checkAnswer: 'Prüfen',
          showSolutions: 'Lösung',
          tryAgain: 'Nochmal',
          confirmCheck: { header: 'Finish?' },
          a11yCheck: 'Check answers'
        }
      }
    });

    assert.equal(params.task, undefined);
    assert.equal(params.subContentId, 'sub-1');
    assert.equal(params.content.blanksText, '<p>A ___.</p>');
    assert.equal(params.behaviour.maxFlashViews, 2);
    assert.equal(params.behaviour.caseSensitive, true);
    assert.equal(params.behaviour.enableCheckButton, false);
    assert.equal(params.l10n.startFlash, 'Start');
    assert.equal(params.l10n.checkAnswer, 'Prüfen');
    assert.equal(params.a11y.flashEnded, 'Hidden.');
    assert.equal(params.a11y.check, 'Check answers');
    assert.equal(params.confirmCheck.header, 'Finish?');
    assert.equal(params.overallFeedback.overallFeedback[0].feedback, 'Done');
  });
});

describe('buildAdvancedBlanksRunnable', () => {
  it('builds one AdvancedBlanks library and leaves the view limit on FlashImage', () => {
    const runnable = buildAdvancedBlanksRunnable({
      subContentId: 'sub-1',
      content: {
        task: '<p>Fill in.</p>',
        blanksText: '<p>A ___.</p>',
        blanksList: [{ correctAnswerText: 'crane/builder' }]
      },
      behaviour: {
        maxFlashViews: 3,
        mode: 'typing',
        enableCheckButton: false,
        caseSensitive: true
      },
      l10n: {
        checkAnswer: 'Check',
        showSolutions: 'Show solution',
        tryAgain: 'Retry'
      }
    });

    assert.equal(runnable.library, ADVANCED_BLANKS_LIBRARY);
    assert.equal(runnable.subContentId, 'sub-1');
    assert.equal(runnable.params.behaviour.maxFlashViews, undefined);
    assert.equal(runnable.params.behaviour.enableCheckButton, false);
    assert.equal(runnable.params.behaviour.enableRetry, true);
    assert.equal(runnable.params.behaviour.caseSensitive, true);
    assert.equal(runnable.params.content.blanksList[0].correctAnswerText, 'crane/builder');
    assert.equal(runnable.params.checkAnswer, 'Check');
  });

  it('wraps a bare answer string so the gap becomes an input', () => {
    const runnable = buildAdvancedBlanksRunnable({
      content: {
        blanksText: '<p>Das Shirt war ___</p>',
        blanksList: ['rot']
      }
    });
    assert.deepEqual(runnable.params.content.blanksList, [{ correctAnswerText: 'rot' }]);
  });
});
