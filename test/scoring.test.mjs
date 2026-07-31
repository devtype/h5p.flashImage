import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  clampDurationMs,
  durationSecToMs,
  hasAnswerGiven,
  hasAtLeastOneCorrect,
  isSingleChoice,
  migrateDurationParams,
  normalizeOverallFeedbackRanges,
  pickOverallFeedback,
  resolveDisplayDurationMs,
  resolveMaxScore,
  resolveScore,
  shouldIncludeScoreInXapi,
  shuffledIndexes,
  MIN_DURATION_MS,
  MAX_DURATION_MS,
  DEFAULT_DURATION_MS,
  DEFAULT_DURATION_SEC
} from '../src/scripts/services/scoring.js';

describe('clampDurationMs', () => {
  it('returns default for invalid values', () => {
    assert.equal(clampDurationMs(undefined), DEFAULT_DURATION_MS);
    assert.equal(clampDurationMs('x'), DEFAULT_DURATION_MS);
  });

  it('clamps to MVP range', () => {
    assert.equal(clampDurationMs(1), MIN_DURATION_MS);
    assert.equal(clampDurationMs(99999), MAX_DURATION_MS);
    assert.equal(clampDurationMs(1500), 1500);
  });
});

describe('isSingleChoice', () => {
  const answers = [
    { correct: true },
    { correct: false },
    { correct: true }
  ];

  it('respects explicit type', () => {
    assert.equal(isSingleChoice({ type: 'single', answers }), true);
    assert.equal(isSingleChoice({ type: 'multi', answers }), false);
  });

  it('auto-detects from correct count', () => {
    assert.equal(isSingleChoice({ type: 'auto', answers: [{ correct: true }, { correct: false }] }), true);
    assert.equal(isSingleChoice({ type: 'auto', answers }), false);
  });
});

describe('hasAnswerGiven', () => {
  it('requires a non-empty selection', () => {
    assert.equal(hasAnswerGiven([]), false);
    assert.equal(hasAnswerGiven(null), false);
    assert.equal(hasAnswerGiven([1]), true);
  });
});

describe('resolveScore / resolveMaxScore', () => {
  const answers = [
    { correct: true },
    { correct: false },
    { correct: true }
  ];

  it('returns 0 before submit or without selection', () => {
    assert.equal(resolveScore({
      submitted: false,
      selectedIndexes: [0, 2],
      answers,
      singlePoint: true,
      maxScore: 1
    }), 0);
    assert.equal(resolveScore({
      submitted: true,
      selectedIndexes: [],
      answers,
      singlePoint: true,
      maxScore: 1
    }), 0);
  });

  it('scores all-or-nothing in singlePoint mode', () => {
    assert.equal(resolveScore({
      submitted: true,
      selectedIndexes: [0, 2],
      answers,
      singlePoint: true,
      maxScore: 1
    }), 1);
    assert.equal(resolveScore({
      submitted: true,
      selectedIndexes: [0],
      answers,
      singlePoint: true,
      maxScore: 1
    }), 0);
    assert.equal(resolveMaxScore({ singlePoint: true, maxScore: 1 }), 1);
  });

  it('scores per option when singlePoint is false', () => {
    assert.equal(resolveScore({
      submitted: true,
      selectedIndexes: [0, 2],
      answers,
      singlePoint: false,
      maxScore: 2
    }), 2);
    assert.equal(resolveScore({
      submitted: true,
      selectedIndexes: [0, 1],
      answers,
      singlePoint: false,
      maxScore: 2
    }), 0);
  });
});

describe('shouldIncludeScoreInXapi', () => {
  it('only after submit', () => {
    assert.equal(shouldIncludeScoreInXapi({ submitted: false }), false);
    assert.equal(shouldIncludeScoreInXapi({ submitted: true }), true);
  });
});

describe('shuffledIndexes', () => {
  it('returns a permutation of 0..n-1', () => {
    const result = shuffledIndexes(4, () => 0);
    assert.deepEqual([...result].sort((a, b) => a - b), [0, 1, 2, 3]);
  });
});

describe('durationSecToMs / resolveDisplayDurationMs', () => {
  it('converts seconds to clamped milliseconds', () => {
    assert.equal(durationSecToMs(DEFAULT_DURATION_SEC), DEFAULT_DURATION_MS);
    assert.equal(durationSecToMs(0.1), MIN_DURATION_MS);
    assert.equal(durationSecToMs(10), MAX_DURATION_MS);
    assert.equal(durationSecToMs(1.5), 1500);
  });

  it('prefers displayDurationSec over legacy ms', () => {
    assert.equal(resolveDisplayDurationMs({
      displayDurationSec: 2,
      displayDurationMs: 500
    }), 2000);
  });

  it('falls back to legacy displayDurationMs', () => {
    assert.equal(resolveDisplayDurationMs({ displayDurationMs: 750 }), 750);
    assert.equal(resolveDisplayDurationMs({}), DEFAULT_DURATION_MS);
  });
});

describe('migrateDurationParams', () => {
  it('converts ms to seconds and removes legacy key', () => {
    const fi = { displayDurationMs: 1500 };
    migrateDurationParams(fi);
    assert.equal(fi.displayDurationSec, 1.5);
    assert.equal(fi.displayDurationMs, undefined);
  });

  it('keeps existing seconds and drops ms', () => {
    const fi = { displayDurationSec: 2, displayDurationMs: 999 };
    migrateDurationParams(fi);
    assert.equal(fi.displayDurationSec, 2);
    assert.equal(fi.displayDurationMs, undefined);
  });
});

describe('hasAtLeastOneCorrect', () => {
  it('requires at least one correct flag', () => {
    assert.equal(hasAtLeastOneCorrect([]), false);
    assert.equal(hasAtLeastOneCorrect([{ correct: false }, { correct: false }]), false);
    assert.equal(hasAtLeastOneCorrect([{ correct: false }, { correct: true }]), true);
    assert.equal(hasAtLeastOneCorrect(null), false);
  });
});

describe('overallFeedback helpers', () => {
  it('normalizes group or bare array', () => {
    assert.deepEqual(normalizeOverallFeedbackRanges([{ from: 0, to: 100 }]), [
      { from: 0, to: 100 }
    ]);
    assert.deepEqual(normalizeOverallFeedbackRanges({
      overallFeedback: [{ from: 0, to: 50, feedback: 'Low' }]
    }), [{ from: 0, to: 50, feedback: 'Low' }]);
    assert.deepEqual(normalizeOverallFeedbackRanges(null), []);
  });

  it('picks matching feedback by score ratio', () => {
    const ranges = [
      { from: 0, to: 49, feedback: 'Low' },
      { from: 50, to: 100, feedback: 'High' }
    ];
    assert.equal(pickOverallFeedback(ranges, 0), 'Low');
    assert.equal(pickOverallFeedback(ranges, 1), 'High');
    assert.equal(pickOverallFeedback(ranges, 0.5), 'High');
    assert.equal(pickOverallFeedback({ overallFeedback: ranges }, 0.2), 'Low');
  });
});
