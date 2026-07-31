import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveImageSrc } from '../src/scripts/ui/flash-stage.js';

describe('resolveImageSrc', () => {
  it('returns empty string without image path', () => {
    assert.equal(resolveImageSrc(null, 1), '');
    assert.equal(resolveImageSrc({}, 1), '');
  });

  it('keeps absolute and data URLs', () => {
    assert.equal(
      resolveImageSrc({ path: 'https://cdn.example/a.png' }, 1),
      'https://cdn.example/a.png'
    );
    assert.equal(
      resolveImageSrc({ path: '//cdn.example/a.png' }, 1),
      '//cdn.example/a.png'
    );
    assert.equal(
      resolveImageSrc({ path: 'data:image/png;base64,xx' }, 1),
      'data:image/png;base64,xx'
    );
  });

  it('falls back to relative path when H5P.getPath is unavailable', () => {
    assert.equal(resolveImageSrc({ path: 'images/a.png' }, 1), 'images/a.png');
  });
});
