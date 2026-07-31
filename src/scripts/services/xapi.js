/**
 * xAPI helpers for H5P.FlashImage.
 *
 * - Verb: answered
 * - interactionType: choice
 * - result.response: selected original answer indexes, comma-separated
 */

const VERB_ANSWERED = 'http://adlnet.gov/expapi/verbs/answered';

/**
 * Strip HTML tags for xAPI description text.
 *
 * @param {string} html
 * @returns {string}
 */
function stripHtml(html) {
  return String(html || '').replace(/<[^>]*>/g, '').trim();
}

const XapiService = {
  /**
   * Decorate an H5P xAPI event template with choice interaction data.
   *
   * @param {H5P.XAPIEvent} xapiEvent
   * @param {object} ctx
   * @param {object} ctx.params
   * @param {number[]} ctx.selectedIndexes
   * @param {Array<{text?: string, correct?: boolean}>} ctx.answers
   * @param {number} ctx.score
   * @param {number} ctx.maxScore
   * @param {boolean} ctx.includeScore
   * @param {boolean} ctx.success
   * @param {Function} ctx.getTitle
   */
  decorate(xapiEvent, ctx) {
    const statement = xapiEvent.data.statement;
    const definition = (statement.object.definition = statement.object.definition || {});
    const answers = ctx.answers || [];

    definition.name = definition.name || {};
    definition.name['en-US'] = ctx.getTitle();

    definition.description = definition.description || {};
    definition.description['en-US'] = stripHtml(ctx.params.question) || ctx.getTitle();

    definition.type = 'http://adlnet.gov/expapi/activities/cmi.interaction';
    definition.interactionType = 'choice';
    definition.choices = answers.map((answer, index) => ({
      id: String(index),
      description: {
        'en-US': stripHtml(answer && answer.text) || `Option ${index + 1}`
      }
    }));
    definition.correctResponsesPattern = [
      answers
        .map((answer, index) => (answer && answer.correct ? String(index) : null))
        .filter((id) => id !== null)
        .join('[,]')
    ];

    statement.verb = {
      id: VERB_ANSWERED,
      display: { 'en-US': 'answered' }
    };

    statement.result = statement.result || {};
    statement.result.completion = true;
    statement.result.success = !!ctx.success;
    statement.result.response = (ctx.selectedIndexes || [])
      .map((i) => String(i))
      .join('[,]');

    if (ctx.includeScore && ctx.maxScore !== undefined && ctx.maxScore > 0) {
      const raw = Math.max(0, Math.min(ctx.maxScore, Number(ctx.score) || 0));
      statement.result.score = {
        raw,
        max: ctx.maxScore,
        scaled: raw / ctx.maxScore
      };
    }
  }
};

export default XapiService;
