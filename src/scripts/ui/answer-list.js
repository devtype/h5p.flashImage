/**
 * Built-in single/multi choice answer list for FlashImage.
 */

export default class AnswerList {
  /**
   * @param {object} options
   * @param {Array<{text?: string, correct?: boolean}>} options.answers
   * @param {number[]} options.order - Display order of original indexes
   * @param {boolean} options.singleChoice
   * @param {string} options.groupLabel
   * @param {string} options.correctLabel
   * @param {string} options.wrongLabel
   * @param {(indexes: number[]) => void} options.onChange
   */
  constructor(options) {
    this.answers = options.answers || [];
    this.order = options.order || this.answers.map((_, i) => i);
    this.singleChoice = !!options.singleChoice;
    this.groupLabel = options.groupLabel || 'Answer options';
    this.correctLabel = options.correctLabel || 'Correct answer';
    this.wrongLabel = options.wrongLabel || 'Wrong answer';
    this.onChange = options.onChange || (() => {});

    this._selected = new Set();
    this._disabled = false;
    this._solutionsShown = false;

    this.root = document.createElement('div');
    this.root.classList.add('h5p-flashimage__answers');
    this.root.setAttribute('role', 'group');
    this.root.setAttribute('aria-label', this.groupLabel);

    this._inputs = [];
    this._rows = [];
    this._build();
  }

  _build() {
    const self = this;
    const name = `h5p-flashimage-${Math.random().toString(36).slice(2)}`;

    self.order.forEach((originalIndex) => {
      const answer = self.answers[originalIndex];
      if (!answer) {
        return;
      }

      const row = document.createElement('label');
      row.classList.add('h5p-flashimage__answer');
      row.dataset.index = String(originalIndex);

      const input = document.createElement('input');
      input.type = self.singleChoice ? 'radio' : 'checkbox';
      input.name = name;
      input.value = String(originalIndex);
      input.classList.add('h5p-flashimage__answer-input');
      input.addEventListener('change', () => self._onInputChange(originalIndex, input));

      // Use a div: editor HTML often includes block tags (<p>) that are invalid in span.
      const text = document.createElement('div');
      text.classList.add('h5p-flashimage__answer-text');
      text.innerHTML = answer.text || '';

      const marker = document.createElement('span');
      marker.classList.add('h5p-flashimage__answer-marker');
      marker.hidden = true;

      row.appendChild(input);
      row.appendChild(text);
      row.appendChild(marker);
      self.root.appendChild(row);

      self._inputs.push(input);
      self._rows.push(row);
    });
  }

  _onInputChange(originalIndex, input) {
    if (this._disabled) {
      return;
    }
    if (this.singleChoice) {
      this._selected.clear();
      if (input.checked) {
        this._selected.add(originalIndex);
      }
    }
    else if (input.checked) {
      this._selected.add(originalIndex);
    }
    else {
      this._selected.delete(originalIndex);
    }
    this.onChange(this.getSelectedIndexes());
  }

  /**
   * @returns {HTMLElement}
   */
  getElement() {
    return this.root;
  }

  /**
   * @returns {number[]}
   */
  getSelectedIndexes() {
    return Array.from(this._selected).sort((a, b) => a - b);
  }

  /**
   * @param {number[]} indexes
   */
  setSelectedIndexes(indexes) {
    const self = this;
    self._selected = new Set((indexes || []).map((i) => Number(i)));
    self._inputs.forEach((input) => {
      const idx = Number(input.value);
      input.checked = self._selected.has(idx);
    });
  }

  /**
   * @param {boolean} disabled
   */
  setDisabled(disabled) {
    this._disabled = !!disabled;
    this._inputs.forEach((input) => {
      input.disabled = this._disabled;
    });
    this.root.classList.toggle('is-disabled', this._disabled);
  }

  /**
   * Mark correct/incorrect after check or showSolutions.
   *
   * @param {boolean} show
   */
  showSolutions(show) {
    const self = this;
    self._solutionsShown = !!show;
    self._rows.forEach((row) => {
      const index = Number(row.dataset.index);
      const answer = self.answers[index];
      const marker = row.querySelector('.h5p-flashimage__answer-marker');
      const selected = self._selected.has(index);
      row.classList.remove('is-correct', 'is-wrong', 'is-solution');

      if (!show) {
        if (marker) {
          marker.hidden = true;
          marker.textContent = '';
        }
        return;
      }

      if (answer && answer.correct) {
        row.classList.add('is-solution');
        if (selected) {
          row.classList.add('is-correct');
        }
        if (marker) {
          marker.hidden = false;
          marker.textContent = self.correctLabel;
        }
      }
      else if (selected) {
        row.classList.add('is-wrong');
        if (marker) {
          marker.hidden = false;
          marker.textContent = self.wrongLabel;
        }
      }
      else if (marker) {
        marker.hidden = true;
        marker.textContent = '';
      }
    });
  }

  reset() {
    this._selected.clear();
    this._inputs.forEach((input) => {
      input.checked = false;
    });
    this.showSolutions(false);
    this.setDisabled(false);
  }
}
