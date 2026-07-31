/**
 * State serialization helpers for H5P.FlashImage.
 *
 * Flash media lives in params and is not stored in state.
 * Answer shuffle order is stored as `answerOrder` (never touch H5P.Question's
 * instance `order`, which is the section layout order).
 */

const STATE_VERSION = 2;

/** @typedef {'loading'|'ready'|'flashing'|'question'} Phase */

const StateService = {
  /**
   * @param {object} extra
   * @param {Phase} extra.phase
   * @param {number[]} extra.selectedIndexes
   * @param {boolean} extra.submitted
   * @param {boolean} extra.solutionsShown
   * @param {number[]} [extra.answerOrder]
   * @returns {object}
   */
  serialize(extra = {}) {
    return {
      v: STATE_VERSION,
      phase: extra.phase === 'flashing' ? 'question' : (extra.phase || 'ready'),
      selectedIndexes: Array.isArray(extra.selectedIndexes)
        ? extra.selectedIndexes.slice()
        : [],
      submitted: !!extra.submitted,
      solutionsShown: !!extra.solutionsShown,
      answerOrder: Array.isArray(extra.answerOrder)
        ? extra.answerOrder.slice()
        : undefined
    };
  },

  /**
   * @param {object|null|undefined} state
   * @returns {{
   *   phase: Phase,
   *   selectedIndexes: number[],
   *   submitted: boolean,
   *   solutionsShown: boolean,
   *   answerOrder: number[]|undefined
   * }}
   */
  normalize(state) {
    if (!state || typeof state !== 'object') {
      return {
        phase: 'ready',
        selectedIndexes: [],
        submitted: false,
        solutionsShown: false,
        answerOrder: undefined
      };
    }
    let phase = state.phase || 'ready';
    if (phase === 'flashing' || phase === 'loading') {
      phase = state.submitted ? 'question' : 'ready';
    }
    // Prefer answerOrder; accept legacy `order` from 0.1.x saved state.
    const rawOrder = Array.isArray(state.answerOrder)
      ? state.answerOrder
      : (Array.isArray(state.order) ? state.order : undefined);
    return {
      phase,
      selectedIndexes: Array.isArray(state.selectedIndexes)
        ? state.selectedIndexes.map((i) => Number(i)).filter((i) => Number.isFinite(i))
        : [],
      submitted: !!state.submitted,
      solutionsShown: !!state.solutionsShown,
      answerOrder: rawOrder
        ? rawOrder.map((i) => Number(i)).filter((i) => Number.isFinite(i))
        : undefined
    };
  }
};

export default StateService;
