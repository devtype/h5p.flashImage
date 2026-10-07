/**
 * Pure helpers for H5P.FlashImage (testable without H5P).
 */

export const MIN_DURATION_MS = 100;
export const MAX_DURATION_MS = 10000;
export const DEFAULT_DURATION_MS = 1000;
export const MIN_DURATION_SEC = 0.1;
export const MAX_DURATION_SEC = 10;
export const DEFAULT_DURATION_SEC = 1;

export const DEFAULT_MAX_FLASH_VIEWS = 1;
export const MAX_FLASH_VIEWS_CAP = 20;

/**
 * Clamp display duration to the allowed range.
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
 * Clamp a flash-view limit. 0 means unlimited.
 *
 * @param {number|string|null|undefined} value
 * @returns {number}
 */
export function normalizeMaxFlashViews(value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 0) {
    return DEFAULT_MAX_FLASH_VIEWS;
  }
  return Math.min(MAX_FLASH_VIEWS_CAP, n);
}

/**
 * Resolve the view limit from raw behaviour params.
 * An explicit maxFlashViews wins. Legacy allowRepeatFlash maps false → 1 and
 * true → 0. When neither key is present, new content uses the default (1).
 *
 * @param {object|null|undefined} behaviour
 * @returns {number}
 */
export function resolveMaxFlashViews(behaviour) {
  const source = behaviour || {};
  if (Object.prototype.hasOwnProperty.call(source, 'maxFlashViews')
    && source.maxFlashViews !== undefined
    && source.maxFlashViews !== null
    && source.maxFlashViews !== '') {
    return normalizeMaxFlashViews(source.maxFlashViews);
  }
  if (Object.prototype.hasOwnProperty.call(source, 'allowRepeatFlash')) {
    return source.allowRepeatFlash === false ? 1 : 0;
  }
  return DEFAULT_MAX_FLASH_VIEWS;
}

/**
 * Upgrade mapping for 0.1 behaviour.
 * allowRepeatFlash false → 1, true or missing → 0 (unlimited).
 * An existing maxFlashViews value is kept.
 *
 * @param {object|null|undefined} behaviour
 * @returns {number}
 */
export function migrateMaxFlashViews(behaviour) {
  const source = behaviour || {};
  if (source.maxFlashViews !== undefined && source.maxFlashViews !== null
    && source.maxFlashViews !== '') {
    return normalizeMaxFlashViews(source.maxFlashViews);
  }
  if (source.allowRepeatFlash === false) {
    return 1;
  }
  return 0;
}

/**
 * Whether another flash is still allowed in this attempt.
 *
 * @param {number} flashesUsed
 * @param {number} maxFlashViews
 * @returns {boolean}
 */
export function hasFlashViewsRemaining(flashesUsed, maxFlashViews) {
  const max = normalizeMaxFlashViews(maxFlashViews);
  if (max === 0) {
    return true;
  }
  const used = Math.max(0, Math.floor(Number(flashesUsed) || 0));
  return used < max;
}

/**
 * Whether the repeat-flash button should be visible.
 *
 * @param {object} ctx
 * @param {string} ctx.phase
 * @param {boolean} ctx.submitted
 * @param {number} ctx.flashesUsed
 * @param {number} ctx.maxFlashViews
 * @returns {boolean}
 */
export function canShowRepeatFlash(ctx) {
  if (!ctx || ctx.phase !== 'question' || ctx.submitted) {
    return false;
  }
  return hasFlashViewsRemaining(ctx.flashesUsed, ctx.maxFlashViews);
}
