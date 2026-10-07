import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  clampDurationMs,
  durationSecToMs,
  migrateDurationParams,
  resolveDisplayDurationMs,
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

  it('clamps to the allowed range', () => {
    assert.equal(clampDurationMs(1), MIN_DURATION_MS);
    assert.equal(clampDurationMs(99999), MAX_DURATION_MS);
    assert.equal(clampDurationMs(1500), 1500);
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
