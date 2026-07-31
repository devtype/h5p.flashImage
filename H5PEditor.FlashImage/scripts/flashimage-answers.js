/**
 * List widget that requires at least one answer marked correct.
 */
(function ($, ns) {
  ns.FlashImageAnswers = function (parent, field, params, setValue) {
    this.parent = parent;
    this.field = field;
    this.params = params;
    this.setValue = setValue;

    // Delegate rendering to the default list widget.
    var listField = H5P.cloneObject(field, true);
    delete listField.widget;
    this.list = new ns.List(parent, listField, params, setValue);
  };

  ns.FlashImageAnswers.prototype.appendTo = function ($wrapper) {
    this.$wrapper = $wrapper;
    this.list.appendTo($wrapper);
    this.$errors = $('<div class="h5peditor-flashimage-answers-errors h5p-errors"/>')
      .appendTo($wrapper);
  };

  ns.FlashImageAnswers.prototype.validate = function () {
    var self = this;
    self.$errors.html('');

    if (self.list.validate() === false) {
      return false;
    }

    var items = self.params;
    if (!Array.isArray(items)) {
      items = [];
    }

    var hasCorrect = items.some(function (answer) {
      return answer && answer.correct;
    });

    if (!hasCorrect) {
      var message = (ns.t && ns.t('H5PEditor.FlashImage', 'noCorrectAnswer'))
        || 'At least one answer must be marked as correct.';
      self.$errors.append(ns.createError(message));
      return false;
    }

    return true;
  };

  ns.FlashImageAnswers.prototype.remove = function () {
    if (this.list && typeof this.list.remove === 'function') {
      this.list.remove();
    }
    if (this.$errors) {
      this.$errors.remove();
    }
  };

  ns.widgets.flashImageAnswers = ns.FlashImageAnswers;
})(H5P.jQuery, H5PEditor);
