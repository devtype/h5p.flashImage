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

Upload `H5P.FlashImage.h5p` into an H5P-capable host (Drupal H5P library admin, or Moodle) that already provides `H5P.Question` and `H5P.Image`.

## Authoring checklist

1. Under **Flash image**, upload/select an image and set alternative text.
2. Set display duration (100–10000 ms).
3. Write the follow-up question and at least two answer options; mark correct ones.
4. Decide whether learners may repeat the flash (`allowRepeatFlash`).

## Learner flow

Ready (image preloaded) → **Start image flash** → image only for N ms → question + answers (image hidden) → optional **Show image again** → Check / Show solution / Retry.
