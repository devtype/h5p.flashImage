/**
 * State serialization helpers for H5P.FlashImage.
 *
 * Flash media lives in params and is not stored in state.
 */

const STATE_VERSION = 1;

/** @typedef {'loading'|'ready'|'flashing'|'question'} Phase */

const StateService = {
  /**
   * @param {object} extra
   * @param {Phase} extra.phase
   * @param {number[]} extra.selectedIndexes
   * @param {boolean} extra.submitted
   * @param {boolean} extra.solutionsShown
   * @param {number[]} [extra.order]
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
      order: Array.isArray(extra.order) ? extra.order.slice() : undefined
    };
  },

  /**
   * @param {object|null|undefined} state
   * @returns {{
   *   phase: Phase,
   *   selectedIndexes: number[],
   *   submitted: boolean,
   *   solutionsShown: boolean,
   *   order: number[]|undefined
   * }}
   */
  normalize(state) {
    if (!state || typeof state !== 'object') {
      return {
        phase: 'ready',
        selectedIndexes: [],
        submitted: false,
        solutionsShown: false,
        order: undefined
      };
    }
    let phase = state.phase || 'ready';
    if (phase === 'flashing' || phase === 'loading') {
      phase = state.submitted ? 'question' : 'ready';
    }
    return {
      phase,
      selectedIndexes: Array.isArray(state.selectedIndexes)
        ? state.selectedIndexes.map((i) => Number(i)).filter((i) => Number.isFinite(i))
        : [],
      submitted: !!state.submitted,
      solutionsShown: !!state.solutionsShown,
      order: Array.isArray(state.order) ? state.order.map((i) => Number(i)) : undefined
    };
  }
};

export default StateService;
