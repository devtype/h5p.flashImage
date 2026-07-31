# H5P.FlashImage quick start

## Develop

```bash
npm install
npm run watch
```

In another terminal, pack when you want an `.h5p` library zip:

```bash
npm run pack
```

Upload `H5P.FlashImage.h5p` into an H5P-capable host (Drupal H5P library admin, or Moodle) that already provides `H5P.Question`, `H5P.Image`, `H5PEditor.RangeList`, and `H5PEditor.ShowWhen`. The pack also installs `H5PEditor.FlashImage` (answer-list validation).

## Authoring checklist

1. Under **Flash image**, upload/select an image (required) and set alternative text (strongly recommended).
2. Set display duration in **seconds** (0.1–10).
3. Write the follow-up question and at least two answer options; mark **at least one** correct (editor blocks save otherwise).
4. Optionally define **Overall Feedback** score ranges.
5. Under **Behavioural settings**, confirm **Check** / **Show solution** / **Retry** are enabled (library defaults are on). Some hosts override these defaults — re-enable them if Check is missing for learners.
6. Decide whether learners may repeat the flash (`allowRepeatFlash`) and whether Check/Retry need confirmation dialogs.

## Learner flow

Ready (image preloaded) → **Start image flash** → image only for N seconds → question + answers (image hidden, focus moves to answers) → optional **Show image again** → Check → score / overall feedback → Show solution / Retry.

## Manual QA matrix

- [ ] Single correct vs multiple correct; Check → score bar → Retry resets to ready
- [ ] Show solution after check
- [ ] Repeat flash on/off; randomize on/off
- [ ] Short (0.1s) vs long (10s) duration
- [ ] Editor rejects zero correct answers; image required
- [ ] Confirm dialogs on/off for Check and Retry
- [ ] Overall feedback ranges at 0% and 100%
- [ ] Iframe resize: all answer options visible after flash
- [ ] Keyboard: Start → flash → focus lands on first answer
