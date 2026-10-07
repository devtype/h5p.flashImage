# H5P.FlashImage (Bilderblitzen)

Timed image-flash question type for H5P. Learners deliberately start a flash of an authored image for a configured duration; the image then hides and a Complex fill in the blanks task (`H5P.AdvancedBlanks`) appears.

## Features

- Editorial image, alternative text, and display duration (0.1–10 seconds)
- Optional introduction text before start
- Image preloaded before **Start image flash** is enabled
- During the flash, only the image is shown
- Nested Complex fill in the blanks task for the question, score, solutions, retry, and xAPI
- Configurable maximum flash views (`0` = unlimited), including the first flash
- Keyboard-focusable controls; focus moves to the task after the flash
- Locales: `en`, `de`, `fr`, `es`, `nl`

## Requirements

- H5P core with `H5P.Question` 1.5, `H5P.Image` 1.1, and `H5P.AdvancedBlanks` 1.2 available on the host

## Develop

```bash
npm install
npm run build    # production bundle → dist/
npm run watch    # rebuild on change
npm run lint
npm test
npm run pack     # build + zip → H5P.FlashImage.h5p
```

Node.js 20+ recommended.

## Package contents

The `.h5p` zip includes `library.json`, `semantics.json`, `upgrades.js`, `icon.svg`, `LICENSE`, `dist/*`, and `language/*`.

## Machine name

| Layer | Value |
|--------|--------|
| Library | `H5P.FlashImage` |
| Title | Bilderblitzen |
| npm | `h5p-flashimage` |
| GitHub | `devtype/h5p.flashImage` |

## License

MIT — see [LICENSE](LICENSE).
