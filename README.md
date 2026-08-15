# KEFE

A browser-based lyric video visualiser.

Load audio, add synced lyrics and a background, choose an effect, then preview and export the result.

## Run

Keep `index.html` and `HomemadeApple-Regular.woff2` together and serve the repository with any static web server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Files

```text
lyricvideovisualiser/
├── index.html
├── styles.css
├── app.js
├── HomemadeApple-Regular.woff2
├── kefe-logo.svg
├── kefe-logo-light.svg
├── favicon.svg
└── README.md
```

## Effects

| Effect | Style |
|---|---|
| Apple | Flowing karaoke lines |
| Brat | Condensed typewriter layout |
| Eternal | Handwritten reveal |
| Aurora | Moving colour gradient |
| Pulse | Rhythmic scale and glow |

## Notes

- Supports LRC and enhanced LRC timing.
- Supports image and video backgrounds.
- Includes 9:16, 1:1, and 16:9 layouts.
- Saves and restores portable `.kefe` project settings.
- Uses a built-in solid background when no image or video is supplied.
- Validates lyric timestamps before export.
- Export performance depends on browser support, device memory, resolution, and duration.
