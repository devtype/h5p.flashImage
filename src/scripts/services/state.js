/**
 * State serialization helpers for H5P.FlashImage.
 *
 * Flash media and the AdvancedBlanks task params live in content params.
 * Learner progress stores the phase, how many flashes were used, and the
 * child task state.
 */

const STATE_VERSION = 3;

/** @typedef {'loading'|'ready'|'flashing'|'question'} Phase */

const StateService = {
  /**
   * @param {object} extra
   * @param {Phase} extra.phase
   * @param {number} extra.flashesUsed
   * @param {boolean} extra.submitted
   * @param {object|undefined} extra.taskState
   * @returns {object}
   */
  serialize(extra = {}) {
    const used = Math.max(0, Math.floor(Number(extra.flashesUsed) || 0));
    return {
      v: STATE_VERSION,
      phase: extra.phase === 'flashing' ? 'question' : (extra.phase || 'ready'),
      flashesUsed: used,
      submitted: !!extra.submitted,
      taskState: extra.taskState && typeof extra.taskState === 'object'
        ? extra.taskState
        : undefined
    };
  },

  /**
   * @param {object|null|undefined} state
   * @returns {{
   *   phase: Phase,
   *   flashesUsed: number,
   *   submitted: boolean,
   *   taskState: object|undefined
   * }}
   */
  normalize(state) {
    if (!state || typeof state !== 'object') {
      return {
        phase: 'ready',
        flashesUsed: 0,
        submitted: false,
        taskState: undefined
      };
    }
    let phase = state.phase || 'ready';
    if (phase === 'loading') {
      phase = 'ready';
    }
    else if (phase === 'flashing') {
      phase = 'question';
    }
    const used = Math.floor(Number(state.flashesUsed));
    return {
      phase,
      flashesUsed: Number.isFinite(used) && used > 0 ? used : 0,
      submitted: !!state.submitted,
      taskState: state.taskState && typeof state.taskState === 'object'
        ? state.taskState
        : undefined
    };
  }
};

export default StateService;
