/** @param {object} H5PUpgrades */
var H5PUpgrades = H5PUpgrades || {};

H5PUpgrades['H5P.FlashImage'] = {
  0: {
    /**
     * Move flash settings out of deprecated `media` / interim `flash` group names.
     * Also migrate displayDurationMs → displayDurationSec when present.
     *
     * @param {object} parameters
     * @param {function} finished
     * @param {object} extras
     */
    1: function (parameters, finished, extras) {
      parameters = parameters || {};
      var source = null;
      if (parameters.flashimage) {
        source = parameters.flashimage;
      }
      else if (parameters.flash) {
        source = parameters.flash;
        delete parameters.flash;
      }
      else if (parameters.media) {
        source = parameters.media;
        delete parameters.media;
      }

      if (source) {
        if (source.flashImage && !source.file) {
          source.file = source.flashImage;
          delete source.flashImage;
        }
        parameters.flashimage = source;
      }

      if (parameters.flashimage) {
        migrateDurationToSeconds(parameters.flashimage);
      }

      finished(null, parameters, extras);
    },

    /**
     * Drop the built-in choice question. Authors must add an AdvancedBlanks task.
     * Map allowRepeatFlash to maxFlashViews (false → 1, true or missing → 0).
     *
     * @param {object} parameters
     * @param {function} finished
     * @param {object} extras
     */
    2: function (parameters, finished, extras) {
      parameters = parameters || {};
      // One-field groups are stored as the inner value, so behaviour is a number.
      parameters.behaviour = migrateMaxFlashViews(parameters.behaviour);

      delete parameters.question;
      delete parameters.answers;
      delete parameters.overallFeedback;
      delete parameters.confirmCheck;
      delete parameters.confirmRetry;

      finished(null, parameters, extras);
    },

    /**
     * Fold the nested AdvancedBlanks library into FlashImage's own fields.
     * A bare behaviour number becomes { maxFlashViews }.
     *
     * @param {object} parameters
     * @param {function} finished
     * @param {object} extras
     */
    3: function (parameters, finished, extras) {
      finished(null, liftNestedTask(parameters), extras);
    }
  }
};

/**
 * Keep in sync with migrateMaxFlashViews() in src/scripts/services/scoring.js.
 * Accepts the bare number H5P stores for a one-field group.
 *
 * @param {number|string|object|null|undefined} behaviour
 * @returns {number}
 */
function migrateMaxFlashViews(behaviour) {
  if (typeof behaviour === 'number' || (typeof behaviour === 'string' && behaviour !== '')) {
    return clampFlashViews(behaviour);
  }
  var source = behaviour || {};
  if (source.maxFlashViews !== undefined && source.maxFlashViews !== null
    && source.maxFlashViews !== '') {
    return clampFlashViews(source.maxFlashViews);
  }
  if (source.allowRepeatFlash === false) {
    return 1;
  }
  return 0;
}

/**
 * @param {number|string} value
 * @returns {number}
 */
function clampFlashViews(value) {
  var existing = Math.floor(Number(value));
  if (!isFinite(existing) || existing < 0) {
    return 1;
  }
  return Math.min(20, existing);
}

/**
 * @param {object} flashimage
 */
/**
 * Keep in sync with liftNestedTask() in src/scripts/services/blanks-params.js.
 * Copies a nested AdvancedBlanks task onto FlashImage fields and removes task.
 *
 * @param {object|null|undefined} parameters
 * @returns {object}
 */
function liftNestedTask(parameters) {
  var params = parameters && typeof parameters === 'object' ? parameters : {};
  var task = params.task;
  var child = task && task.params && typeof task.params === 'object' ? task.params : null;
  var maxFlashViews = readUpgradeMaxFlashViews(params.behaviour);
  var childBehaviour;
  var labelKeys;
  var i;

  if (!child) {
    if (typeof params.behaviour === 'number' || typeof params.behaviour === 'string') {
      params.behaviour = { maxFlashViews: maxFlashViews };
    }
    if (params.task) {
      delete params.task;
    }
    return params;
  }

  childBehaviour = {};
  if (child.behaviour && typeof child.behaviour === 'object') {
    for (var key in child.behaviour) {
      if (Object.prototype.hasOwnProperty.call(child.behaviour, key) && key !== 'maxFlashViews') {
        childBehaviour[key] = child.behaviour[key];
      }
    }
  }
  childBehaviour.maxFlashViews = maxFlashViews;
  params.behaviour = childBehaviour;

  if (child.content) {
    params.content = child.content;
  }
  if (child.overallFeedback) {
    params.overallFeedback = child.overallFeedback;
  }

  params.l10n = params.l10n && typeof params.l10n === 'object' ? params.l10n : {};
  labelKeys = [
    'showSolutions',
    'tryAgain',
    'checkAnswer',
    'submitAnswer',
    'notFilledOut',
    'tipLabel',
    'spellingMistakeWarning',
    'scoreBarLabel'
  ];
  for (i = 0; i < labelKeys.length; i++) {
    if (child[labelKeys[i]]) {
      params.l10n[labelKeys[i]] = child[labelKeys[i]];
    }
  }

  if (child.confirmCheck) {
    params.confirmCheck = child.confirmCheck;
  }
  if (child.confirmRetry) {
    params.confirmRetry = child.confirmRetry;
  }

  params.a11y = params.a11y && typeof params.a11y === 'object' ? params.a11y : {};
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
 * View limit used while lifting 0.2 params. A bare number wins, including 0.
 *
 * @param {number|string|object|null|undefined} behaviour
 * @returns {number}
 */
function readUpgradeMaxFlashViews(behaviour) {
  if (typeof behaviour === 'number' || (typeof behaviour === 'string' && behaviour !== '')) {
    return clampFlashViews(behaviour);
  }
  var source = behaviour && typeof behaviour === 'object' ? behaviour : {};
  if (source.maxFlashViews !== undefined && source.maxFlashViews !== null
    && source.maxFlashViews !== '') {
    return clampFlashViews(source.maxFlashViews);
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
 * @param {object} flashimage
 */
function migrateDurationToSeconds(flashimage) {
  if (!flashimage || typeof flashimage !== 'object') {
    return;
  }
  if (flashimage.displayDurationSec !== undefined && flashimage.displayDurationSec !== null) {
    if (flashimage.displayDurationMs !== undefined) {
      delete flashimage.displayDurationMs;
    }
    return;
  }
  if (flashimage.displayDurationMs !== undefined && flashimage.displayDurationMs !== null
    && flashimage.displayDurationMs !== '') {
    var ms = Number(flashimage.displayDurationMs);
    if (isFinite(ms)) {
      flashimage.displayDurationSec = Math.round((ms / 1000) * 10) / 10;
    }
    delete flashimage.displayDurationMs;
  }
}
