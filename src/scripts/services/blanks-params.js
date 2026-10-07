/**
 * Map FlashImage authoring params onto one H5P.AdvancedBlanks instance.
 * The editor does not embed AdvancedBlanks as its own content type.
 */

export const ADVANCED_BLANKS_LIBRARY = 'H5P.AdvancedBlanks 1.2';

const LABEL_DEFAULTS = {
  showSolutions: 'Show solution',
  tryAgain: 'Retry',
  checkAnswer: 'Check',
  submitAnswer: 'Submit',
  notFilledOut: 'Please fill in all blanks to view solution',
  tipLabel: 'Tip',
  spellingMistakeWarning: 'Check your spelling: @mistake',
  scoreBarLabel: 'You got :num out of :total points'
};

const A11Y_DEFAULTS = {
  check: 'Check the answers. The responses will be marked as correct, incorrect, or unanswered.',
  showSolution: 'Show the solution. The task will be marked with its correct solution.',
  retry: 'Retry the task. Reset all responses and start the task over again.',
  checkingMode: 'Checking mode'
};

/**
 * Read the flash view limit from a bare number or a behaviour object.
 *
 * @param {number|string|object|null|undefined} behaviour
 * @returns {number}
 */
function readMaxFlashViews(behaviour) {
  if (typeof behaviour === 'number' || (typeof behaviour === 'string' && behaviour !== '')) {
    const n = Math.floor(Number(behaviour));
    return Number.isFinite(n) && n >= 0 ? Math.min(20, n) : 1;
  }
  const source = behaviour && typeof behaviour === 'object' ? behaviour : {};
  if (source.maxFlashViews !== undefined && source.maxFlashViews !== null
    && source.maxFlashViews !== '') {
    const n = Math.floor(Number(source.maxFlashViews));
    return Number.isFinite(n) && n >= 0 ? Math.min(20, n) : 1;
  }
  if (source.allowRepeatFlash === false) {
    return 1;
  }
  if (source.allowRepeatFlash === true) {
    return 0;
  }
  return 1;
}

/**
 * Copy a nested 0.2 AdvancedBlanks task onto FlashImage's own fields.
 * Mutates and returns parameters.
 *
 * @param {object|null|undefined} parameters
 * @returns {object}
 */
export function liftNestedTask(parameters) {
  const params = parameters && typeof parameters === 'object' ? parameters : {};
  const task = params.task;
  const child = task && task.params && typeof task.params === 'object' ? task.params : null;
  const maxFlashViews = readMaxFlashViews(params.behaviour);

  if (!child) {
    if (typeof params.behaviour === 'number' || typeof params.behaviour === 'string') {
      params.behaviour = { maxFlashViews };
    }
    if (params.task) {
      delete params.task;
    }
    return params;
  }

  const childBehaviour = Object.assign({}, child.behaviour || {});
  delete childBehaviour.maxFlashViews;
  params.behaviour = Object.assign({}, childBehaviour, { maxFlashViews });

  if (child.content) {
    params.content = child.content;
  }
  if (child.overallFeedback) {
    params.overallFeedback = child.overallFeedback;
  }

  params.l10n = Object.assign({}, params.l10n || {});
  const labelMap = {
    showSolutions: 'showSolutions',
    tryAgain: 'tryAgain',
    checkAnswer: 'checkAnswer',
    submitAnswer: 'submitAnswer',
    notFilledOut: 'notFilledOut',
    tipLabel: 'tipLabel',
    spellingMistakeWarning: 'spellingMistakeWarning',
    scoreBarLabel: 'scoreBarLabel'
  };
  Object.keys(labelMap).forEach((key) => {
    if (child[key]) {
      params.l10n[labelMap[key]] = child[key];
    }
  });

  if (child.confirmCheck) {
    params.confirmCheck = child.confirmCheck;
  }
  if (child.confirmRetry) {
    params.confirmRetry = child.confirmRetry;
  }

  params.a11y = Object.assign({}, params.a11y || {});
  if (child.a11yCheck) {
    params.a11y.check = child.a11yCheck;
  }
  if (child.a11yShowSolution) {
    params.a11y.showSolution = child.a11yShowSolution;
  }
  if (child.a11yRetry) {
    params.a11y.retry = child.a11yRetry;
  }
  if (child.a11yCheckingModeHeader) {
    params.a11y.checkingMode = child.a11yCheckingModeHeader;
  }

  if (task.subContentId) {
    params.subContentId = task.subContentId;
  }
  delete params.task;
  return params;
}

/**
 * A one-field blank group is stored as the answer string, not an object.
 * AdvancedBlanks only creates an input when correctAnswerText is set.
 *
 * @param {unknown} list
 * @returns {object[]}
 */
function normalizeBlanksList(list) {
  if (!Array.isArray(list)) {
    return [];
  }
  return list.map((entry) => {
    if (typeof entry === 'string' || typeof entry === 'number') {
      return { correctAnswerText: String(entry) };
    }
    if (entry && typeof entry === 'object') {
      return entry;
    }
    return { correctAnswerText: '' };
  });
}

/**
 * Build the library object passed to H5P.newRunnable.
 *
 * @param {object|null|undefined} params FlashImage params after lift
 * @returns {object}
 */
export function buildAdvancedBlanksRunnable(params) {
  const source = params || {};
  const content = source.content || {};
  const behaviour = source.behaviour && typeof source.behaviour === 'object'
    ? source.behaviour
    : {};
  const l10n = Object.assign({}, LABEL_DEFAULTS, source.l10n || {});
  const a11y = Object.assign({}, A11Y_DEFAULTS, source.a11y || {});
  const blanksList = normalizeBlanksList(content.blanksList);

  const library = {
    library: ADVANCED_BLANKS_LIBRARY,
    params: {
      content: {
        task: content.task || '',
        blanksText: content.blanksText || '',
        blanksList
      },
      overallFeedback: source.overallFeedback || { overallFeedback: [] },
      behaviour: {
        mode: behaviour.mode || 'typing',
        selectAlternatives: behaviour.selectAlternatives || 'alternatives',
        selectAlternativeRestriction: behaviour.selectAlternativeRestriction != null
          ? behaviour.selectAlternativeRestriction
          : 5,
        spellingErrorBehaviour: behaviour.spellingErrorBehaviour || 'mistake',
        caseSensitive: !!behaviour.caseSensitive,
        autoCheck: !!behaviour.autoCheck,
        enableSolutionsButton: behaviour.enableSolutionsButton !== false,
        showSolutionsRequiresInput: behaviour.showSolutionsRequiresInput !== false,
        enableRetry: behaviour.enableRetry !== false,
        enableCheckButton: behaviour.enableCheckButton !== false,
        confirmCheckDialog: !!behaviour.confirmCheckDialog,
        confirmRetryDialog: !!behaviour.confirmRetryDialog
      },
      showSolutions: l10n.showSolutions,
      tryAgain: l10n.tryAgain,
      checkAnswer: l10n.checkAnswer,
      submitAnswer: l10n.submitAnswer,
      notFilledOut: l10n.notFilledOut,
      tipLabel: l10n.tipLabel,
      spellingMistakeWarning: l10n.spellingMistakeWarning,
      scoreBarLabel: l10n.scoreBarLabel,
      confirmCheck: source.confirmCheck,
      confirmRetry: source.confirmRetry,
      a11yCheck: a11y.check,
      a11yShowSolution: a11y.showSolution,
      a11yRetry: a11y.retry,
      a11yCheckingModeHeader: a11y.checkingMode
    }
  };

  if (source.subContentId) {
    library.subContentId = source.subContentId;
  }
  return library;
}
