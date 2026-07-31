/**
 * Preloads and displays the flash image for a timed interval.
 */

const PRELOAD_TIMEOUT_MS = 8000;

/**
 * Resolve a usable image URL from H5P / Drupal media image params.
 *
 * @param {object|null} image
 * @param {number} contentId
 * @returns {string}
 */
export function resolveImageSrc(image, contentId) {
  if (!image || !image.path) {
    return '';
  }
  const path = String(image.path);
  if (/^[a-z]+:\/\//i.test(path) || path.startsWith('//') || path.startsWith('data:')) {
    return path;
  }
  if (typeof H5P !== 'undefined' && typeof H5P.getPath === 'function') {
    return H5P.getPath(path, contentId) || path;
  }
  return path;
}

export default class FlashStage {
  /**
   * @param {object} options
   * @param {number} options.contentId
   * @param {object|null} options.image - H5P image params
   * @param {string} options.alternativeText
   * @param {string} options.regionLabel
   * @param {string} options.loadingLabel
   */
  constructor(options) {
    this.contentId = options.contentId;
    this.image = options.image || null;
    this.alternativeText = options.alternativeText || '';
    this.regionLabel = options.regionLabel || 'Flash image';
    this.loadingLabel = options.loadingLabel || 'Loading image…';

    this._timerId = null;
    this._ready = false;
    this._visible = false;
    this._src = '';

    this.root = document.createElement('div');
    this.root.classList.add('h5p-flashimage__stage');
    this.root.setAttribute('role', 'region');
    this.root.setAttribute('aria-label', this.regionLabel);
    this.root.hidden = true;

    this.statusEl = document.createElement('p');
    this.statusEl.classList.add('h5p-flashimage__loading');
    this.statusEl.textContent = this.loadingLabel;
    this.root.appendChild(this.statusEl);

    this.img = document.createElement('img');
    this.img.classList.add('h5p-flashimage__image');
    this.img.alt = this.alternativeText;
    this.img.decoding = 'async';
    this.img.hidden = true;
    this.root.appendChild(this.img);
  }

  /**
   * @returns {HTMLElement}
   */
  getElement() {
    return this.root;
  }

  /**
   * @returns {boolean}
   */
  isReady() {
    return this._ready;
  }

  /**
   * Whether an image source is configured.
   *
   * @returns {boolean}
   */
  hasImage() {
    return !!resolveImageSrc(this.image, this.contentId);
  }

  /**
   * Preload the image. Always settles (success, failure, or timeout).
   *
   * @returns {Promise<boolean>} true when an image URL was loaded successfully
   */
  preload() {
    const self = this;
    self._src = resolveImageSrc(self.image, self.contentId);

    if (!self._src) {
      self._ready = true;
      self.statusEl.hidden = true;
      return Promise.resolve(false);
    }

    self.img.src = self._src;

    return Promise.race([
      self._waitForLoad(),
      new Promise((resolve) => {
        window.setTimeout(() => resolve(false), PRELOAD_TIMEOUT_MS);
      })
    ]).then((ok) => {
      self._ready = true;
      self.statusEl.hidden = true;
      return !!ok;
    });
  }

  /**
   * @returns {Promise<boolean>}
   */
  _waitForLoad() {
    const self = this;

    // Cached success or failure: complete is true and events will not re-fire.
    if (self.img.complete) {
      return Promise.resolve(self.img.naturalWidth > 0);
    }

    return new Promise((resolve) => {
      const onLoad = () => {
        cleanup();
        resolve(self.img.naturalWidth > 0);
      };
      const onError = () => {
        cleanup();
        resolve(false);
      };
      const cleanup = () => {
        self.img.removeEventListener('load', onLoad);
        self.img.removeEventListener('error', onError);
      };
      self.img.addEventListener('load', onLoad);
      self.img.addEventListener('error', onError);
    });
  }

  /**
   * Show the image for durationMs, then hide and invoke onComplete.
   * If the image is missing/broken, still waits the duration so the flow continues.
   *
   * @param {number} durationMs
   * @param {() => void} onComplete
   */
  flash(durationMs, onComplete) {
    const self = this;
    self.clearTimer();
    self.root.hidden = false;

    const showImage = self._src && self.img.naturalWidth > 0;
    self.img.hidden = !showImage;
    self._visible = true;

    self._timerId = window.setTimeout(() => {
      self._timerId = null;
      self.hide();
      if (typeof onComplete === 'function') {
        onComplete();
      }
    }, durationMs);
  }

  hide() {
    this.clearTimer();
    this.root.hidden = true;
    this.img.hidden = true;
    this._visible = false;
  }

  clearTimer() {
    if (this._timerId !== null) {
      window.clearTimeout(this._timerId);
      this._timerId = null;
    }
  }

  destroy() {
    this.clearTimer();
  }
}
