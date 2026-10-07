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

Upload `H5P.FlashImage.h5p` into an H5P-capable host that already provides `H5P.Question` 1.5, `H5P.Image` 1.1, `H5P.AdvancedBlanks` 1.2, and `H5P.Components` 1.0. The editor also needs `H5PEditor.RangeList` 1.0 and `H5PEditor.ShowWhen` 1.0.

## Authoring checklist

1. Under **Flash image**, select an image (required) and set alternative text (strongly recommended).
2. Set display duration in **seconds** (0.1–10).
3. Under **Question**, write the task description and the text with blanks (`___` for each gap). Add one correct answer per gap, in the same order. Separate alternative answers with `/`.
4. Under **Behaviour**, set **Maximum flash views** and the fill-in switches (answer mode, spelling, check, show solution, retry, confirmation dialogs). `1` is the first flash only. `0` is unlimited. The repeat button appears only while views remain and the task is not submitted.
5. Optional overall feedback and button labels live on this same form.

Content saved as 0.2 keeps its blanks text, answers, and view limit when opened in 0.3. Content saved with 0.1.x choice questions is not converted into blanks. A previous “allow repeat” setting becomes unlimited views (`0`); “do not allow repeat” becomes one view (`1`).

## Learner flow

Ready (image preloaded) → **Start image flash** → image only for N seconds → blanks task (image hidden, focus moves to the task) → optional **Show image again** while views remain → the blanks task’s own Check / Show solution / Retry. Retry returns to the start screen and resets the view count.

## Manual QA matrix

- [ ] Fill-in task scores, shows solutions, and retries through the buttons configured on FlashImage
- [ ] Retry returns to the start screen and clears the view count
- [ ] Maximum views `1` hides **Show image again** after the first flash
- [ ] Maximum views `2` allows one repeat; `0` allows repeats until submit
- [ ] Repeat is hidden after the blanks task is checked
- [ ] Short (0.1s) vs long (10s) duration
- [ ] Image required in the editor
- [ ] Iframe resize: the blanks task is fully visible after the flash
- [ ] Keyboard: Start → flash → focus lands in the blanks task
