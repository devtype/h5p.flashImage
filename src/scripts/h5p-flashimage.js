import FlashStage from './ui/flash-stage.js';
import AnswerList from './ui/answer-list.js';
import StateService from './services/state.js';
import XapiService from './services/xapi.js';
import {
  clampDurationMs,
  hasAnswerGiven,
  isSingleChoice,
  resolveMaxScore,
  resolveScore,
  shouldIncludeScoreInXapi,
  shuffledIndexes
} from './services/scoring.js';

const DEFAULTS = {
  intro: '',
  flashimage: {
    file: null,
    alternativeText: '',
    displayDurationMs: 1000
  },
  question: '<p>What did you see?</p>',
  answers: [],
  behaviour: {
    allowRepeatFlash: true,
    enableCheckButton: true,
    enableSolutionsButton: true,
    enableRetry: true,
    type: 'auto',
    singlePoint: true,
    randomAnswers: false,
    maxScore: 1
  },
  l10n: {
    startFlash: 'Start image flash',
    repeatFlash: 'Show image again',
    loading: 'Loading image…',
    checkAnswer: 'Check',
    showSolution: 'Show solution',
    retry: 'Retry',
    scoreBarLabel: 'You got :num out of :total points',
    noAnswer: 'Please select an answer before checking.'
  },
  a11y: {
    flashImageLabel: 'Flash image',
    answersLabel: 'Answer options',
    correctAnswer: 'Correct answer',
    wrongAnswer: 'Wrong answer',
    flashStarted: 'Image flash started.',
    flashEnded: 'Image hidden. Answer the question.'
  }
};

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
 * H5P.FlashImage (Bilderblitzen) question type.
 *
 * Uses the standard H5P constructor + prototype pattern required by
 * H5P.newRunnable's ContentType mixin. ES6 `class extends H5P.Question`
 * breaks that chain.
 *
 * @param {object} params
 * @param {number} contentId
 * @param {object} [extras]
 */
function FlashImage(params, contentId, extras) {
  const self = this;
  extras = extras || {};

  H5P.Question.call(self, 'flashimage');

  self.params = mergeDefaults(params || {}, DEFAULTS);
  if (!Array.isArray(self.params.answers)) {
    self.params.answers = [];
  }
  self.contentId = contentId;
  self.extras = extras;
  self.previousState = extras.previousState || null;

  self.durationMs = clampDurationMs(self.params.flashimage.displayDurationMs);
  self.singleChoice = isSingleChoice({
    type: self.params.behaviour.type,
    answers: self.params.answers
  });

  const restored = StateService.normalize(self.previousState);
  self.order = restored.order;
  if (!self.order) {
    const length = self.params.answers.length;
    self.order = self.params.behaviour.randomAnswers
      ? shuffledIndexes(length)
      : Array.from({ length }, (_, i) => i);
  }

  self.state = {
    phase: 'loading',
    selectedIndexes: restored.selectedIndexes,
    submitted: restored.submitted,
    solutionsShown: restored.solutionsShown,
    imageReady: false
  };

  self.flashStage = null;
  self.answerList = null;
  self.wrapper = null;
  self.readyPanel = null;
  self.questionPanel = null;
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

  const questionEl = document.createElement('div');
  questionEl.classList.add('h5p-flashimage__question');
  questionEl.innerHTML = self.params.question || '';
  self.questionPanel.appendChild(questionEl);

  if (self.params.behaviour.allowRepeatFlash) {
    self.repeatButton = document.createElement('button');
    self.repeatButton.type = 'button';
    self.repeatButton.classList.add('h5p-flashimage__repeat');
    self.repeatButton.textContent = l10n.repeatFlash;
    self.repeatButton.addEventListener('click', () => self._startFlash(true));
    self.questionPanel.appendChild(self.repeatButton);
  }

  self.answerList = new AnswerList({
    answers: self.params.answers,
    order: self.order,
    singleChoice: self.singleChoice,
    groupLabel: a11y.answersLabel,
    correctLabel: a11y.correctAnswer,
    wrongLabel: a11y.wrongAnswer,
    onChange: (indexes) => {
      self.state.selectedIndexes = indexes;
      self._updateButtonAvailability();
    }
  });
  self.questionPanel.appendChild(self.answerList.getElement());

  self.wrapper.appendChild(self.readyPanel);
  self.wrapper.appendChild(self.flashStage.getElement());
  self.wrapper.appendChild(self.questionPanel);

  self.setContent(self.wrapper);
  self._registerButtons();

  self.flashStage.preload().then((ok) => {
    self.state.imageReady = !!ok || !self.params.flashimage.file;
    self.startButton.disabled = false;
    self.loadingNote.hidden = true;
    if (self.previousState) {
      self._restoreFromPreviousState();
    }
    else {
      self.state.phase = 'ready';
      self._applyPhaseUi();
    }
    self._updateButtonAvailability();
  });
};

FlashImage.prototype._registerButtons = function () {
  const self = this;
  const l10n = self.params.l10n;
  const behaviour = self.params.behaviour;

  if (behaviour.enableCheckButton !== false) {
    self.addButton(
      'check-answer',
      l10n.checkAnswer,
      () => self._onCheck(),
      false,
      { 'aria-label': l10n.checkAnswer },
      {}
    );
  }

  if (behaviour.enableSolutionsButton !== false) {
    self.addButton(
      'show-solution',
      l10n.showSolution,
      () => self.showSolutions(),
      false,
      { 'aria-label': l10n.showSolution },
      {}
    );
  }

  if (behaviour.enableRetry !== false) {
    self.addButton(
      'try-again',
      l10n.retry,
      () => self.resetTask(),
      false,
      { 'aria-label': l10n.retry },
      {}
    );
  }
};

FlashImage.prototype._restoreFromPreviousState = function () {
  const self = this;
  const restored = StateService.normalize(self.previousState);

  self.state.selectedIndexes = restored.selectedIndexes;
  self.state.submitted = restored.submitted;
  self.state.solutionsShown = restored.solutionsShown;
  self.answerList.setSelectedIndexes(restored.selectedIndexes);

  if (restored.phase === 'question' || restored.submitted) {
    self.state.phase = 'question';
  }
  else {
    self.state.phase = 'ready';
  }

  self._applyPhaseUi();

  if (self.state.submitted) {
    self.answerList.setDisabled(true);
    if (self.state.solutionsShown) {
      self.answerList.showSolutions(true);
    }
    self._toggleButtonsForSubmitted();
    self.setFeedback(
      self._scoreLabel(self.getScore(), self.getMaxScore()),
      self.getScore(),
      self.getMaxScore(),
      self.params.l10n.scoreBarLabel
    );
  }
};

/**
 * @param {boolean} [fromRepeat]
 */
FlashImage.prototype._startFlash = function (fromRepeat) {
  const self = this;
  if (!self.state.imageReady && self.params.flashimage.file) {
    return;
  }
  if (self.state.phase === 'flashing') {
    return;
  }
  if (self.state.submitted && fromRepeat) {
    return;
  }

  self.state.phase = 'flashing';
  self._applyPhaseUi();
  self._announce(self.params.a11y.flashStarted);

  self.flashStage.flash(self.durationMs, () => {
    self.state.phase = 'question';
    self._applyPhaseUi();
    self._announce(self.params.a11y.flashEnded);
    self._updateButtonAvailability();
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
  if (!isFlashing) {
    self.flashStage.hide();
  }

  if (self.repeatButton) {
    self.repeatButton.hidden = !isQuestion || self.state.submitted
      || !self.params.behaviour.allowRepeatFlash;
    self.repeatButton.disabled = self.state.submitted || isFlashing;
  }

  if (isReady) {
    self.hideButton('check-answer');
    self.hideButton('show-solution');
    self.hideButton('try-again');
  }
};

FlashImage.prototype._updateButtonAvailability = function () {
  const self = this;
  if (self.state.phase !== 'question' || self.state.submitted) {
    return;
  }
  if (self.params.behaviour.enableCheckButton !== false) {
    if (hasAnswerGiven(self.state.selectedIndexes)) {
      self.showButton('check-answer');
    }
    else {
      self.hideButton('check-answer');
    }
  }
};

FlashImage.prototype._onCheck = function () {
  const self = this;
  if (self.state.phase !== 'question' || self.state.submitted) {
    return;
  }
  if (!hasAnswerGiven(self.state.selectedIndexes)) {
    self._announce(self.params.l10n.noAnswer);
    return;
  }

  self.state.submitted = true;
  self.answerList.setDisabled(true);
  if (self.repeatButton) {
    self.repeatButton.hidden = true;
  }

  const score = self.getScore();
  const maxScore = self.getMaxScore();
  self.setFeedback(
    self._scoreLabel(score, maxScore),
    score,
    maxScore,
    self.params.l10n.scoreBarLabel
  );

  self._toggleButtonsForSubmitted();
  self.triggerXAPIAnswered();
};

FlashImage.prototype._toggleButtonsForSubmitted = function () {
  const self = this;
  self.hideButton('check-answer');
  if (self.params.behaviour.enableSolutionsButton !== false) {
    self.showButton('show-solution');
  }
  if (self.params.behaviour.enableRetry !== false) {
    self.showButton('try-again');
  }
};

FlashImage.prototype._scoreLabel = function (score, max) {
  return String(this.params.l10n.scoreBarLabel || '')
    .replace(':num', String(score))
    .replace(':total', String(max));
};

FlashImage.prototype._announce = function (message) {
  if (typeof this.read === 'function') {
    this.read(message);
  }
};

FlashImage.prototype._scoreContext = function () {
  return {
    submitted: this.state.submitted,
    selectedIndexes: this.state.selectedIndexes,
    answers: this.params.answers,
    singlePoint: this.params.behaviour.singlePoint !== false,
    maxScore: this.params.behaviour.maxScore
  };
};

FlashImage.prototype.getAnswerGiven = function () {
  return hasAnswerGiven(this.state.selectedIndexes);
};

FlashImage.prototype.getScore = function () {
  return resolveScore(this._scoreContext());
};

FlashImage.prototype.getMaxScore = function () {
  return resolveMaxScore(this._scoreContext());
};

FlashImage.prototype.showSolutions = function () {
  const self = this;
  if (self.state.phase !== 'question') {
    self.state.phase = 'question';
    self._applyPhaseUi();
  }
  self.state.solutionsShown = true;
  self.answerList.showSolutions(true);
  self.hideButton('show-solution');
};

FlashImage.prototype.resetTask = function () {
  const self = this;
  self.flashStage.clearTimer();
  self.flashStage.hide();
  self.state.phase = 'ready';
  self.state.selectedIndexes = [];
  self.state.submitted = false;
  self.state.solutionsShown = false;
  self.answerList.reset();
  if (typeof self.removeFeedback === 'function') {
    self.removeFeedback();
  }
  self.hideButton('check-answer');
  self.hideButton('show-solution');
  self.hideButton('try-again');
  self._applyPhaseUi();
  self._updateButtonAvailability();
};

FlashImage.prototype.getCurrentState = function () {
  return StateService.serialize({
    phase: this.state.phase,
    selectedIndexes: this.state.selectedIndexes,
    submitted: this.state.submitted,
    solutionsShown: this.state.solutionsShown,
    order: this.order
  });
};

FlashImage.prototype.triggerXAPIAnswered = function () {
  const self = this;
  const xapiEvent = self.createXAPIEventTemplate('answered');
  const score = self.getScore();
  const maxScore = self.getMaxScore();

  XapiService.decorate(xapiEvent, {
    params: self.params,
    selectedIndexes: self.state.selectedIndexes,
    answers: self.params.answers,
    score,
    maxScore,
    includeScore: shouldIncludeScoreInXapi({ submitted: self.state.submitted }),
    success: score >= maxScore && maxScore > 0,
    getTitle: () => self.getTitle()
  });

  self.trigger(xapiEvent);
};

FlashImage.prototype.getXAPIData = function () {
  const self = this;
  const xapiEvent = self.createXAPIEventTemplate('answered');
  const score = self.getScore();
  const maxScore = self.getMaxScore();

  XapiService.decorate(xapiEvent, {
    params: self.params,
    selectedIndexes: self.state.selectedIndexes,
    answers: self.params.answers,
    score,
    maxScore,
    includeScore: shouldIncludeScoreInXapi({ submitted: self.state.submitted }),
    success: self.state.submitted && score >= maxScore && maxScore > 0,
    getTitle: () => self.getTitle()
  });

  return { statement: xapiEvent.data.statement };
};

FlashImage.prototype.getTitle = function () {
  const extras = this.extras || {};
  const meta = extras.metadata || {};
  return meta.title || 'Bilderblitzen';
};

export default FlashImage;
