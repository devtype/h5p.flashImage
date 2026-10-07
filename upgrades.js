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
      parameters.behaviour = parameters.behaviour || {};
      parameters.behaviour.maxFlashViews = migrateMaxFlashViews(parameters.behaviour);

      delete parameters.behaviour.allowRepeatFlash;
      delete parameters.behaviour.enableCheckButton;
      delete parameters.behaviour.enableSolutionsButton;
      delete parameters.behaviour.enableRetry;
      delete parameters.behaviour.type;
      delete parameters.behaviour.singlePoint;
      delete parameters.behaviour.randomAnswers;
      delete parameters.behaviour.maxScore;
      delete parameters.behaviour.confirmCheckDialog;
      delete parameters.behaviour.confirmRetryDialog;
      delete parameters.question;
      delete parameters.answers;
      delete parameters.overallFeedback;
      delete parameters.confirmCheck;
      delete parameters.confirmRetry;

      finished(null, parameters, extras);
    }
  }
};

/**
 * Keep in sync with migrateMaxFlashViews() in src/scripts/services/scoring.js.
 *
 * @param {object} behaviour
 * @returns {number}
 */
function migrateMaxFlashViews(behaviour) {
  var source = behaviour || {};
  if (source.maxFlashViews !== undefined && source.maxFlashViews !== null
    && source.maxFlashViews !== '') {
    var existing = Math.floor(Number(source.maxFlashViews));
    if (!isFinite(existing) || existing < 0) {
      return 1;
    }
    return Math.min(20, existing);
  }
  if (source.allowRepeatFlash === false) {
    return 1;
  }
  return 0;
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
