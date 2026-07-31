/**
 * Preloads and displays the flash image for a timed interval.
 */

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
   * Preload the image. Resolves when decode/load completes or fails.
   *
   * @returns {Promise<boolean>} true when an image URL was loaded successfully
   */
  preload() {
    const self = this;
    if (!self.image || !self.image.path) {
      self._ready = true;
      self.statusEl.hidden = true;
      return Promise.resolve(false);
    }

    const src = H5P.getPath(self.image.path, self.contentId);
    self.img.src = src;

    const done = (ok) => {
      self._ready = true;
      self.statusEl.hidden = true;
      return ok;
    };

    if (typeof self.img.decode === 'function') {
      return self.img.decode()
        .then(() => done(true))
        .catch(() => {
          // decode can fail for some formats; fall back to load/error events
          return self._waitForLoad().then(done);
        });
    }
    return self._waitForLoad().then(done);
  }

  /**
   * @returns {Promise<boolean>}
   */
  _waitForLoad() {
    const self = this;
    if (self.img.complete && self.img.naturalWidth > 0) {
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      const onLoad = () => {
        cleanup();
        resolve(true);
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
   *
   * @param {number} durationMs
   * @param {() => void} onComplete
   */
  flash(durationMs, onComplete) {
    const self = this;
    self.clearTimer();
    self.root.hidden = false;
    self.img.hidden = false;
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
