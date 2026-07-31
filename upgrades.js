/** @param {object} H5PUpgrades */
var H5PUpgrades = H5PUpgrades || {};

H5PUpgrades['H5P.FlashImage'] = {
  0: {
    /**
     * Move flash settings out of deprecated `media` / interim `flash` group names.
     * MMS marks semantics groups named `media` as deprecated/hidden.
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
    }
  }
};

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
