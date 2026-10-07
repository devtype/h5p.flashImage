import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canShowRepeatFlash,
  hasFlashViewsRemaining,
  migrateMaxFlashViews,
  normalizeMaxFlashViews,
  resolveMaxFlashViews,
  DEFAULT_MAX_FLASH_VIEWS,
  MAX_FLASH_VIEWS_CAP
} from '../src/scripts/services/scoring.js';

describe('normalizeMaxFlashViews', () => {
  it('keeps 0 as unlimited and clamps the range', () => {
    assert.equal(normalizeMaxFlashViews(0), 0);
    assert.equal(normalizeMaxFlashViews(2.9), 2);
    assert.equal(normalizeMaxFlashViews(100), MAX_FLASH_VIEWS_CAP);
    assert.equal(normalizeMaxFlashViews(-1), DEFAULT_MAX_FLASH_VIEWS);
    assert.equal(normalizeMaxFlashViews('x'), DEFAULT_MAX_FLASH_VIEWS);
  });
});

describe('resolveMaxFlashViews', () => {
  it('prefers an explicit limit', () => {
    assert.equal(resolveMaxFlashViews({ maxFlashViews: 3, allowRepeatFlash: true }), 3);
    assert.equal(resolveMaxFlashViews({ maxFlashViews: 0 }), 0);
  });

  it('maps legacy allowRepeatFlash when no limit is set', () => {
    assert.equal(resolveMaxFlashViews({ allowRepeatFlash: false }), 1);
    assert.equal(resolveMaxFlashViews({ allowRepeatFlash: true }), 0);
  });

  it('defaults to one view for new content', () => {
    assert.equal(resolveMaxFlashViews({}), DEFAULT_MAX_FLASH_VIEWS);
    assert.equal(resolveMaxFlashViews(null), DEFAULT_MAX_FLASH_VIEWS);
  });
});

describe('migrateMaxFlashViews', () => {
  it('maps the 0.1 repeat toggle', () => {
    assert.equal(migrateMaxFlashViews({ allowRepeatFlash: false }), 1);
    assert.equal(migrateMaxFlashViews({ allowRepeatFlash: true }), 0);
    assert.equal(migrateMaxFlashViews({}), 0);
  });

  it('keeps an existing limit', () => {
    assert.equal(migrateMaxFlashViews({ maxFlashViews: 4, allowRepeatFlash: false }), 4);
  });
});

describe('canShowRepeatFlash', () => {
  it('hides the button off the question phase or after submit', () => {
    assert.equal(canShowRepeatFlash({
      phase: 'ready',
      submitted: false,
      flashesUsed: 0,
      maxFlashViews: 0
    }), false);
    assert.equal(canShowRepeatFlash({
      phase: 'question',
      submitted: true,
      flashesUsed: 1,
      maxFlashViews: 0
    }), false);
  });

  it('shows another flash only while views remain', () => {
    assert.equal(canShowRepeatFlash({
      phase: 'question',
      submitted: false,
      flashesUsed: 1,
      maxFlashViews: 1
    }), false);
    assert.equal(canShowRepeatFlash({
      phase: 'question',
      submitted: false,
      flashesUsed: 1,
      maxFlashViews: 2
    }), true);
    assert.equal(hasFlashViewsRemaining(5, 0), true);
    assert.equal(canShowRepeatFlash({
      phase: 'question',
      submitted: false,
      flashesUsed: 5,
      maxFlashViews: 0
    }), true);
  });
});
