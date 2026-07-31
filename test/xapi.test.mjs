import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import XapiService from '../src/scripts/services/xapi.js';

function createEvent() {
  return {
    data: {
      statement: {
        object: {
          definition: {}
        }
      }
    }
  };
}

describe('XapiService.decorate', () => {
  it('builds a choice interaction with score', () => {
    const event = createEvent();
    XapiService.decorate(event, {
      params: { question: '<p>What did you see?</p>' },
      answers: [
        { text: '<p>Cat</p>', correct: true },
        { text: '<p>Dog</p>', correct: false }
      ],
      selectedIndexes: [0],
      score: 1,
      maxScore: 1,
      includeScore: true,
      success: true,
      getTitle: () => 'Bilderblitzen'
    });

    const statement = event.data.statement;
    assert.equal(statement.object.definition.interactionType, 'choice');
    assert.equal(statement.object.definition.description['en-US'], 'What did you see?');
    assert.equal(statement.object.definition.choices.length, 2);
    assert.equal(statement.object.definition.correctResponsesPattern[0], '0');
    assert.equal(statement.result.response, '0');
    assert.equal(statement.result.success, true);
    assert.deepEqual(statement.result.score, { raw: 1, max: 1, scaled: 1 });
  });

  it('omits score when includeScore is false', () => {
    const event = createEvent();
    XapiService.decorate(event, {
      params: { question: 'Q' },
      answers: [{ text: 'A', correct: true }],
      selectedIndexes: [],
      score: 0,
      maxScore: 1,
      includeScore: false,
      success: false,
      getTitle: () => 'T'
    });
    assert.equal(event.data.statement.result.score, undefined);
  });
});
