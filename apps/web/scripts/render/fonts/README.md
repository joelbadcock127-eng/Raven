# Brand fonts for the reel renderer

TTFs burned into reels/stories by `render-reel.mjs` (the render workflow
checks out this repo, so these load from disk on the Actions runner).
Selected per property via the brand kit — see `src/lib/brandKit.ts`.

All faces are from [Google Fonts](https://fonts.google.com) and licensed
under the [SIL Open Font License 1.1](https://openfontlicense.org), which
permits bundling and redistribution:

| File | Family | Use |
|---|---|---|
| `Marcellus-Regular.ttf` | Marcellus | Annie May display serif |
| `CormorantGaramond.ttf` | Cormorant Garamond (variable) | fine editorial serif |
| `PlayfairDisplay.ttf` | Playfair Display (variable) | classic high-contrast serif |
| `DidactGothic-Regular.ttf` | Didact Gothic | light modern sans (used on anniemay.com.au) |
| `Quicksand.ttf` | Quicksand (variable) | soft rounded sans |
