/** @param {object} H5PUpgrades */
var H5PUpgrades = H5PUpgrades || {};

H5PUpgrades['H5P.FlashImage'] = {
  0: {
    /**
     * Move flash settings out of deprecated `media` / interim `flash` group names.
     * MMS marks semantics groups named `media` as deprecated/hidden.
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

      finished(null, parameters, extras);
    }
  }
};
