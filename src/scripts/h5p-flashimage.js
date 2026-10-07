import FlashStage from './ui/flash-stage.js';
import StateService from './services/state.js';
import {
  canShowRepeatFlash,
  hasFlashViewsRemaining,
  resolveDisplayDurationMs,
  resolveMaxFlashViews
} from './services/scoring.js';
import { buildAdvancedBlanksRunnable, liftNestedTask } from './services/blanks-params.js';

const DEFAULTS = {
  intro: '',
  flashimage: {
    file: null,
    alternativeText: '',
    displayDurationSec: 1
  },
  content: {
    task: '',
    blanksText: '',
    blanksList: []
  },
  behaviour: {
    maxFlashViews: 1,
    mode: 'typing',
    enableCheckButton: true,
    enableSolutionsButton: true,
    enableRetry: true
  },
  l10n: {
    startFlash: 'Start image flash',
    repeatFlash: 'Show image again',
    loading: 'Loading image…',
    checkAnswer: 'Check',
    showSolutions: 'Show solution',
    tryAgain: 'Retry'
  },
  a11y: {
    flashImageLabel: 'Flash image',
    flashStarted: 'Image flash started.',
    flashEnded: 'Image hidden. Answer the question.'
  }
};

const VERB_ANSWERED = 'http://adlnet.gov/expapi/verbs/answered';

/**
 * Deep merge defaults into params (params win).
 *
 * @param {object} target
 * @param {object} source
 * @returns {object}
 */
function mergeDefaults(target, source) {
  if (target === null || target === undefined) {
    return source;
  }
  if (typeof target !== 'object' || Array.isArray(target)) {
    return target;
  }
  const out = Array.isArray(source) ? [...source] : { ...source };
  for (const key of Object.keys(target)) {
    out[key] = mergeDefaults(target[key], source ? source[key] : undefined);
  }
  return out;
}

/**
 * @param {object|undefined} event
 * @returns {boolean}
 */
function isAnsweredEvent(event) {
  if (!event) {
    return false;
  }
  if (typeof event.getVerb === 'function' && event.getVerb() === 'answered') {
    return true;
  }
  const statement = event.data && event.data.statement;
  const verbId = statement && statement.verb && statement.verb.id;
  return verbId === VERB_ANSWERED;
}

/**
 * H5P.FlashImage (Bilderblitzen) question type.
 *
 * Uses the standard H5P constructor + prototype pattern required by
 * H5P.newRunnable's ContentType mixin. ES6 `class extends H5P.Question`
 * breaks that chain.
 *
 * The fill-in task is an H5P.AdvancedBlanks instance. Scoring, check,
 * solutions, retry feedback, and xAPI belong to that child.
 *
 * @param {object} params
 * @param {number} contentId
 * @param {object} [extras]
 */
function FlashImage(params, contentId, extras) {
  const self = this;
  extras = extras || {};
  params = liftNestedTask(params || {});
  // A one-field group is stored as the inner value, including 0 (unlimited).
  const rawBehaviour = Object.prototype.hasOwnProperty.call(params, 'behaviour')
    ? params.behaviour
    : undefined;

  H5P.Question.call(self, 'flashimage');

  self.params = mergeDefaults(params, DEFAULTS);
  if (!self.params.flashimage || typeof self.params.flashimage !== 'object') {
    self.params.flashimage = { ...DEFAULTS.flashimage };
  }
  if (!self.params.behaviour || typeof self.params.behaviour !== 'object') {
    self.params.behaviour = { ...DEFAULTS.behaviour };
  }
  self.maxFlashViews = resolveMaxFlashViews(rawBehaviour);
  self.params.behaviour.maxFlashViews = self.maxFlashViews;

  self.contentId = contentId;
  self.extras = extras;
  self.previousState = extras.previousState || null;

  self.durationMs = resolveDisplayDurationMs(self.params.flashimage);

  const restored = StateService.normalize(self.previousState);
  self.flashesUsed = restored.flashesUsed;
  self.state = {
    phase: 'loading',
    submitted: restored.submitted,
    preloadDone: false
  };
  self.taskState = restored.taskState;

  self.flashStage = null;
  self.taskInstance = null;
  self._taskAttachFailed = false;
  self._suppressChildResetHook = false;

  // Question.attach inserts our DOM after registerDomElements returns.
  // AdvancedBlanks looks up blank nodes by id, so it must be created only
  // once that DOM is in the document.
  const originalAttach = self.attach.bind(self);
  self.attach = function ($container) {
    originalAttach($container);
    if (self.state.phase === 'question') {
      self._ensureTask();
      self._resize();
    }
  };
  self.wrapper = null;
  self.readyPanel = null;
  self.questionPanel = null;
  self.taskContainer = null;
  self.startButton = null;
  self.repeatButton = null;
  self.introEl = null;
}

FlashImage.prototype = Object.create(H5P.Question.prototype);
FlashImage.prototype.constructor = FlashImage;

FlashImage.prototype.registerDomElements = function () {
  const self = this;
  const l10n = self.params.l10n;
  const a11y = self.params.a11y;

  self.wrapper = document.createElement('div');
  self.wrapper.classList.add('h5p-flashimage');

  self.readyPanel = document.createElement('div');
  self.readyPanel.classList.add('h5p-flashimage__ready');

  if (self.params.intro && String(self.params.intro).trim() !== '') {
    self.introEl = document.createElement('div');
    self.introEl.classList.add('h5p-flashimage__intro');
    self.introEl.innerHTML = self.params.intro;
    self.readyPanel.appendChild(self.introEl);
  }

  self.startButton = document.createElement('button');
  self.startButton.type = 'button';
  self.startButton.classList.add('h5p-flashimage__start');
  self.startButton.textContent = l10n.startFlash;
  self.startButton.disabled = true;
  self.startButton.addEventListener('click', () => self._startFlash());
  self.readyPanel.appendChild(self.startButton);

  const loadingNote = document.createElement('p');
  loadingNote.classList.add('h5p-flashimage__preload-status');
  loadingNote.setAttribute('role', 'status');
  loadingNote.textContent = l10n.loading;
  self.readyPanel.appendChild(loadingNote);
  self.loadingNote = loadingNote;

  self.flashStage = new FlashStage({
    contentId: self.contentId,
    image: self.params.flashimage.file,
    alternativeText: self.params.flashimage.alternativeText || '',
    regionLabel: a11y.flashImageLabel,
    loadingLabel: l10n.loading
  });

  self.questionPanel = document.createElement('div');
  self.questionPanel.classList.add('h5p-flashimage__question-panel');
  self.questionPanel.hidden = true;

  self.repeatButton = document.createElement('button');
  self.repeatButton.type = 'button';
  self.repeatButton.classList.add('h5p-flashimage__repeat');
  self.repeatButton.textContent = l10n.repeatFlash;
  self.repeatButton.hidden = true;
  self.repeatButton.addEventListener('click', () => self._startFlash(true));
  self.questionPanel.appendChild(self.repeatButton);

  self.taskContainer = document.createElement('div');
  self.taskContainer.classList.add('h5p-flashimage__task');
  self.questionPanel.appendChild(self.taskContainer);

  self.wrapper.appendChild(self.readyPanel);
  self.wrapper.appendChild(self.flashStage.getElement());
  self.wrapper.appendChild(self.questionPanel);

  // jQuery wrap so H5P.Question.register uses append() for the DOM node.
  self.setContent(H5P.jQuery ? H5P.jQuery(self.wrapper) : self.wrapper);
  self._applyPhaseUi();

  self.flashStage.preload().then(() => {
    self.state.preloadDone = true;
    self.state.phase = self.state.phase === 'loading' ? 'ready' : self.state.phase;
    self.loadingNote.hidden = true;
    if (self.previousState) {
      self._restoreFromPreviousState();
    }
    else {
      self._applyPhaseUi();
    }
  }).catch(() => {
    self.state.preloadDone = true;
    self.state.phase = 'ready';
    self.loadingNote.hidden = true;
    self._applyPhaseUi();
  });
};

FlashImage.prototype._ensureTask = function () {
  const self = this;
  if (self.taskInstance || self._taskAttachFailed) {
    return;
  }
  if (!self.taskContainer || !self.taskContainer.isConnected) {
    return;
  }
  self._attachTask();
};

FlashImage.prototype._attachTask = function () {
  const self = this;
  const taskParams = buildAdvancedBlanksRunnable(self.params);
  if (!taskParams.library || typeof H5P.newRunnable !== 'function') {
    return;
  }

  const $container = H5P.jQuery
    ? H5P.jQuery(self.taskContainer)
    : self.taskContainer;

  try {
    self.taskInstance = H5P.newRunnable(
      taskParams,
      self.contentId,
      $container,
      true,
      { previousState: self.taskState }
    );
  }
  catch {
    self.taskInstance = null;
    self._taskAttachFailed = true;
    return;
  }

  if (!self.taskInstance) {
    self._taskAttachFailed = true;
    return;
  }

  if (typeof self.taskInstance.resetTask === 'function') {
    const originalReset = self.taskInstance.resetTask.bind(self.taskInstance);
    self.taskInstance.resetTask = function () {
      const result = originalReset();
      if (!self._suppressChildResetHook) {
        self._onChildRetry();
      }
      return result;
    };
  }

  if (typeof self.taskInstance.on === 'function') {
    self.taskInstance.on('resize', () => self._resize());
    self.taskInstance.on('xAPI', (event) => {
      if (!isAnsweredEvent(event)) {
        return;
      }
      self.state.submitted = true;
      self._applyPhaseUi();
    });
  }
};

FlashImage.prototype._restoreFromPreviousState = function () {
  const self = this;
  const restored = StateService.normalize(self.previousState);
  self.flashesUsed = restored.flashesUsed;
  self.state.submitted = restored.submitted;
  self.state.phase = restored.phase === 'question' ? 'question' : 'ready';
  self._applyPhaseUi();
};

/**
 * @param {boolean} [fromRepeat]
 */
FlashImage.prototype._startFlash = function (fromRepeat) {
  const self = this;
  if (!self.state.preloadDone || self.state.phase === 'flashing' || self.state.submitted) {
    return;
  }
  if (fromRepeat && !canShowRepeatFlash({
    phase: 'question',
    submitted: false,
    flashesUsed: self.flashesUsed,
    maxFlashViews: self.maxFlashViews
  })) {
    return;
  }
  if (!hasFlashViewsRemaining(self.flashesUsed, self.maxFlashViews)) {
    return;
  }

  self.flashesUsed += 1;
  self.state.phase = 'flashing';
  self._applyPhaseUi();
  self._announce(self.params.a11y.flashStarted);

  self.flashStage.flash(self.durationMs, () => {
    self.state.phase = 'question';
    self._applyPhaseUi();
    self._announce(self.params.a11y.flashEnded);
    self._focusTask();
  });
  self._resize();
};

FlashImage.prototype._onChildRetry = function () {
  const self = this;
  if (self.flashStage) {
    self.flashStage.clearTimer();
    self.flashStage.hide();
  }
  self.flashesUsed = 0;
  self.state.submitted = false;
  self.state.phase = 'ready';
  self._applyPhaseUi();
};

FlashImage.prototype._resize = function () {
  const self = this;
  self.trigger('resize');
  window.requestAnimationFrame(() => {
    self.trigger('resize');
  });
};

FlashImage.prototype._focusTask = function () {
  const self = this;
  if (!self.taskContainer || self.questionPanel.hidden) {
    return;
  }
  const target = self.taskContainer.querySelector(
    'input:not([disabled]), textarea:not([disabled]), [contenteditable="true"]'
  ) || self.taskContainer;
  if (target === self.taskContainer && !self.taskContainer.hasAttribute('tabindex')) {
    self.taskContainer.setAttribute('tabindex', '-1');
  }
  window.requestAnimationFrame(() => {
    try {
      target.focus({ preventScroll: true });
    }
    catch {
      target.focus();
    }
  });
};

FlashImage.prototype._applyPhaseUi = function () {
  const self = this;
  const phase = self.state.phase;
  const isReady = phase === 'ready' || phase === 'loading';
  const isFlashing = phase === 'flashing';
  const isQuestion = phase === 'question';

  self.readyPanel.hidden = !isReady;
  self.questionPanel.hidden = !isQuestion;
  if (isQuestion) {
    // Mount only after the panel is visible and in the document.
    self._ensureTask();
  }
  if (!isFlashing && self.flashStage) {
    self.flashStage.hide();
  }

  if (self.startButton) {
    self.startButton.disabled = !self.state.preloadDone
      || !hasFlashViewsRemaining(self.flashesUsed, self.maxFlashViews);
  }

  if (self.repeatButton) {
    self.repeatButton.hidden = !canShowRepeatFlash({
      phase,
      submitted: self.state.submitted,
      flashesUsed: self.flashesUsed,
      maxFlashViews: self.maxFlashViews
    });
  }

  self._resize();
};

FlashImage.prototype._announce = function (message) {
  if (typeof this.read === 'function') {
    this.read(message);
  }
};

FlashImage.prototype._childCall = function (method, fallback) {
  const task = this.taskInstance;
  if (task && typeof task[method] === 'function') {
    return task[method]();
  }
  return fallback;
};

FlashImage.prototype.getAnswerGiven = function () {
  const given = this._childCall('getAnswerGiven', false);
  return !!given;
};

FlashImage.prototype.getScore = function () {
  const score = Number(this._childCall('getScore', 0));
  return Number.isFinite(score) ? score : 0;
};

FlashImage.prototype.getMaxScore = function () {
  const max = Number(this._childCall('getMaxScore', 0));
  return Number.isFinite(max) ? max : 0;
};

FlashImage.prototype.showSolutions = function () {
  const self = this;
  if (self.state.phase !== 'question') {
    self.state.phase = 'question';
    self._applyPhaseUi();
  }
  if (self.taskInstance && typeof self.taskInstance.showSolutions === 'function') {
    self.taskInstance.showSolutions();
  }
};

FlashImage.prototype.resetTask = function () {
  const self = this;
  self._suppressChildResetHook = true;
  if (self.taskInstance && typeof self.taskInstance.resetTask === 'function') {
    self.taskInstance.resetTask();
  }
  self._suppressChildResetHook = false;
  self._onChildRetry();
};

FlashImage.prototype.getCurrentState = function () {
  let taskState;
  if (this.taskInstance && typeof this.taskInstance.getCurrentState === 'function') {
    taskState = this.taskInstance.getCurrentState();
  }
  return StateService.serialize({
    phase: this.state.phase,
    flashesUsed: this.flashesUsed,
    submitted: this.state.submitted,
    taskState
  });
};

FlashImage.prototype.getXAPIData = function () {
  if (this.taskInstance && typeof this.taskInstance.getXAPIData === 'function') {
    return this.taskInstance.getXAPIData();
  }
  return {};
};

FlashImage.prototype.getTitle = function () {
  const extras = this.extras || {};
  const meta = extras.metadata || {};
  return meta.title || 'Bilderblitzen';
};

export default FlashImage;
