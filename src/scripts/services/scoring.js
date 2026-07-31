/**
 * Pure scoring helpers for H5P.FlashImage (testable without H5P).
 */

export const MIN_DURATION_MS = 100;
export const MAX_DURATION_MS = 10000;
export const DEFAULT_DURATION_MS = 1000;
export const MIN_DURATION_SEC = 0.1;
export const MAX_DURATION_SEC = 10;
export const DEFAULT_DURATION_SEC = 1;

/**
 * Clamp display duration to the MVP-allowed range.
 *
 * @param {number|string|null|undefined} value
 * @returns {number}
 */
export function clampDurationMs(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return DEFAULT_DURATION_MS;
  }
  return Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, Math.round(n)));
}

/**
 * Convert authored seconds to clamped milliseconds.
 *
 * @param {number|string|null|undefined} seconds
 * @returns {number}
 */
export function durationSecToMs(seconds) {
  const n = Number(seconds);
  if (!Number.isFinite(n)) {
    return DEFAULT_DURATION_MS;
  }
  return clampDurationMs(n * 1000);
}

/**
 * Resolve flash duration from flashimage params.
 * Prefers displayDurationSec; falls back to legacy displayDurationMs.
 *
 * @param {object|null|undefined} flashimage
 * @returns {number}
 */
export function resolveDisplayDurationMs(flashimage) {
  const fi = flashimage || {};
  if (fi.displayDurationSec !== undefined && fi.displayDurationSec !== null
    && fi.displayDurationSec !== '') {
    return durationSecToMs(fi.displayDurationSec);
  }
  if (fi.displayDurationMs !== undefined && fi.displayDurationMs !== null
    && fi.displayDurationMs !== '') {
    return clampDurationMs(fi.displayDurationMs);
  }
  return DEFAULT_DURATION_MS;
}

/**
 * Migrate legacy displayDurationMs to displayDurationSec on a flashimage object.
 * Mutates and returns the object for upgrades.js / tests.
 *
 * @param {object|null|undefined} flashimage
 * @returns {object|null|undefined}
 */
export function migrateDurationParams(flashimage) {
  if (!flashimage || typeof flashimage !== 'object') {
    return flashimage;
  }
  if (flashimage.displayDurationSec !== undefined && flashimage.displayDurationSec !== null) {
    if (flashimage.displayDurationMs !== undefined) {
      delete flashimage.displayDurationMs;
    }
    return flashimage;
  }
  if (flashimage.displayDurationMs !== undefined && flashimage.displayDurationMs !== null
    && flashimage.displayDurationMs !== '') {
    const ms = Number(flashimage.displayDurationMs);
    if (Number.isFinite(ms)) {
      flashimage.displayDurationSec = Math.round((ms / 1000) * 10) / 10;
    }
    delete flashimage.displayDurationMs;
  }
  return flashimage;
}

/**
 * Whether at least one answer option is marked correct.
 *
 * @param {Array<{correct?: boolean}>|null|undefined} answers
 * @returns {boolean}
 */
export function hasAtLeastOneCorrect(answers) {
  return Array.isArray(answers) && answers.some((a) => a && a.correct);
}

/**
 * Normalize overallFeedback params to a range list.
 * Accepts either a bare array or the semantics group `{ overallFeedback: [] }`.
 *
 * @param {Array|{overallFeedback?: Array}|null|undefined} value
 * @returns {Array<{from?: number, to?: number, feedback?: string}>}
 */
export function normalizeOverallFeedbackRanges(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && Array.isArray(value.overallFeedback)) {
    return value.overallFeedback;
  }
  return [];
}

/**
 * Pick overall feedback text for a score ratio (0–1).
 * Mirrors H5P.Question.determineOverallFeedback for unit testing.
 *
 * @param {Array|{overallFeedback?: Array}|null|undefined} ranges
 * @param {number} scoreRatio
 * @returns {string}
 */
export function pickOverallFeedback(ranges, scoreRatio) {
  const list = normalizeOverallFeedbackRanges(ranges);
  const pct = Math.floor(Number(scoreRatio) * 100);
  if (!Number.isFinite(pct)) {
    return '';
  }
  for (let i = 0; i < list.length; i++) {
    const feedback = list[i];
    if (!feedback) {
      continue;
    }
    const text = feedback.feedback;
    const hasFeedback = text !== undefined && String(text).trim().length !== 0;
    if (feedback.from <= pct && feedback.to >= pct && hasFeedback) {
      return String(text);
    }
  }
  return '';
}

/**
 * Determine whether the interaction uses single-choice (radio) UI.
 *
 * @param {object} ctx
 * @param {string} [ctx.type] - auto | single | multi
 * @param {Array<{correct?: boolean}>} ctx.answers
 * @returns {boolean}
 */
export function isSingleChoice(ctx) {
  const type = ctx.type || 'auto';
  if (type === 'single') {
    return true;
  }
  if (type === 'multi') {
    return false;
  }
  const correctCount = (ctx.answers || []).filter((a) => a && a.correct).length;
  return correctCount <= 1;
}

/**
 * Whether the learner has selected at least one answer.
 *
 * @param {number[]} selectedIndexes
 * @returns {boolean}
 */
export function hasAnswerGiven(selectedIndexes) {
  return Array.isArray(selectedIndexes) && selectedIndexes.length > 0;
}

/**
 * Resolve score after check (all-or-nothing when singlePoint, else per-correct).
 *
 * @param {object} ctx
 * @param {boolean} ctx.submitted
 * @param {number[]} ctx.selectedIndexes - Original answer indexes selected
 * @param {Array<{correct?: boolean}>} ctx.answers
 * @param {boolean} [ctx.singlePoint]
 * @param {number} ctx.maxScore
 * @returns {number}
 */
export function resolveScore(ctx) {
  if (!ctx.submitted || !hasAnswerGiven(ctx.selectedIndexes)) {
    return 0;
  }

  const answers = ctx.answers || [];
  const selected = new Set(ctx.selectedIndexes.map((i) => Number(i)));
  const correctIndexes = answers
    .map((a, i) => (a && a.correct ? i : -1))
    .filter((i) => i >= 0);

  const exactMatch =
    correctIndexes.length === selected.size
    && correctIndexes.every((i) => selected.has(i));

  if (ctx.singlePoint !== false) {
    const max = Math.floor(Number(ctx.maxScore));
    const effectiveMax = Number.isFinite(max) && max > 0 ? max : 1;
    return exactMatch ? effectiveMax : 0;
  }

  // Per-option scoring: +1 for each correctly selected, -1 for each wrong selection.
  let raw = 0;
  selected.forEach((i) => {
    if (answers[i] && answers[i].correct) {
      raw += 1;
    }
    else {
      raw -= 1;
    }
  });
  const max = Math.max(0, Math.floor(Number(ctx.maxScore) || 0));
  const cappedMax = max > 0 ? max : Math.max(1, correctIndexes.length);
  return Math.max(0, Math.min(cappedMax, raw));
}

/**
 * Effective max score for the task.
 *
 * @param {object} ctx
 * @param {boolean} [ctx.singlePoint]
 * @param {number} [ctx.maxScore]
 * @param {Array<{correct?: boolean}>} [ctx.answers]
 * @returns {number}
 */
export function resolveMaxScore(ctx) {
  if (ctx.singlePoint !== false) {
    const max = Math.floor(Number(ctx.maxScore));
    return Number.isFinite(max) && max > 0 ? max : 1;
  }
  const max = Math.floor(Number(ctx.maxScore));
  if (Number.isFinite(max) && max > 0) {
    return max;
  }
  const correctCount = (ctx.answers || []).filter((a) => a && a.correct).length;
  return Math.max(1, correctCount);
}

/**
 * Whether result.score should be included in an xAPI statement.
 *
 * @param {object} ctx
 * @param {boolean} ctx.submitted
 * @returns {boolean}
 */
export function shouldIncludeScoreInXapi(ctx) {
  return !!ctx.submitted;
}

/**
 * Shuffle a copy of indexes with an optional seeded RNG (Fisher–Yates).
 *
 * @param {number} length
 * @param {() => number} [random]
 * @returns {number[]}
 */
export function shuffledIndexes(length, random = Math.random) {
  const indexes = Array.from({ length }, (_, i) => i);
  for (let i = indexes.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = indexes[i];
    indexes[i] = indexes[j];
    indexes[j] = tmp;
  }
  return indexes;
}
