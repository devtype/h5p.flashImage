# H5P.FlashImage (Bilderblitzen)

Timed image-flash question type for H5P. Learners deliberately start a flash of an authored image for a configured duration; the image then hides and a built-in choice question appears.

## Features

- Editorial image, alternative text, and display duration (0.1–10 seconds)
- Optional introduction text before start
- Image preloaded before **Start image flash** is enabled
- During the flash, only the image is shown
- Built-in single- or multiple-choice answers (no nested MultiChoice library)
- Editor requires at least one correct answer
- Optional overall feedback by score range; optional Check/Retry confirm dialogs
- Optional **Show image again** control while answering
- Check / show solution / retry via `H5P.Question` (enabled by default)
- Keyboard-focusable controls; focus moves to answers after the flash
- xAPI `answered` statements with `interactionType: choice`
- Locales: `en`, `de`, `fr`, `es`, `nl`

## Requirements

- H5P core with `H5P.Question` 1.5 and `H5P.Image` 1.1 available on the host

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
