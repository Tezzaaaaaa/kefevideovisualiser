<p align="center">
  <img src="./kefe-logo.svg" width="320" alt="KEFE Visualiser">
</p>

<p align="center">
  A browser-based tool for creating synced lyric videos.
</p>

<p align="center">
  <a href="https://tezzaaaaaa.github.io/kefevideovisualiser/">Open the live site</a>
</p>

## Overview

KEFE Visualiser combines audio, synced lyrics and an optional background into an exportable MP4 lyric video. It runs in the browser and supports image, video and built-in solid-colour backgrounds.

## Features

- LRC and enhanced LRC lyric timing
- Automatic synced-lyrics lookup
- Apple, Brat, Eternal, Aurora, Pulse, Stroke and Fade Up effects
- Song title, artist and album title cards
- Embedded album-artwork extraction when available
- Image, video or solid-colour backgrounds
- 9:16, 1:1 and 16:9 layouts
- 480p, 720p and 1080p output presets
- Frame-accurate H.264/AAC MP4 export
- Lyric timing validation before export
- Portable `.kefe` project settings
- Open Sans interface with Homemade Apple reserved for the Eternal effect

## Project structure

```text
kefevideovisualiser/
├── .github/workflows/deploy-kefe.yml
├── archive/
│   └── deepseek/
│       ├── modules/
│       └── segments/          # exactly 25 preserved DeepSeek segments
├── effects/
│   ├── core.js                # shared effect helpers
│   ├── registry.js            # production effect dispatcher
│   ├── apple.js
│   ├── brat.js
│   ├── eternal-sunshine.js
│   ├── aurora.js
│   ├── pulse.js
│   ├── starfield.js
│   ├── stroke.js
│   └── story-fade.js
├── app.js                     # application state, media, UI and export orchestration
├── fast-export.js             # fast/native export support
├── index.html                 # application shell and script loading order
├── styles.css                 # interface and responsive layout
├── HomemadeApple-Regular.woff2
├── kefe-logo.svg
├── favicon.svg
├── CHANGELOG.md
├── CONTRIBUTING.md
├── EFFECT_TYPOGRAPHY.md
└── README.md
```

Production effects are independent modules. The DeepSeek material is archival and is not loaded by the live application. Shared effect helpers live in `effects/core.js`, while `effects/registry.js` provides the single production dispatch point.

## Use

1. Add an audio file.
2. Find synced lyrics, upload an LRC file or enter timed lyrics manually.
3. Add an optional image or video background, or keep the default solid background.
4. Choose an effect and output layout.
5. Preview the result.
6. Review the export check and export the MP4.

## Run locally

Keep the repository files together and serve the directory with a static web server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

Opening `index.html` directly is not recommended because browsers restrict some module and media operations on `file://` pages.

## Deployment

The repository currently deploys through the GitHub Pages workflow at `.github/workflows/deploy-kefe.yml`. The workflow validates the production files, packages the `effects/` directory and browser FFmpeg assets, and publishes the resulting site.

## Export

Export uses fixed timeline timestamps and short encoded segments. Rendering speed can affect how long an export takes, but it does not change the intended playback speed of the finished video.

Long 1080p exports remain demanding on mobile devices. For faster processing, use the 720p or 480p preset.

## Browser support

Use a current version of Chrome, Edge, Firefox or Safari with WebAssembly and canvas image encoding enabled.

## Privacy

Audio, backgrounds and project files remain in the browser during editing and export. Automatic lyric lookup sends song metadata to the configured lyrics service. External font or encoder files may be loaded from their configured hosts when local deployment assets are unavailable.

## Development

The production site is intentionally small. Keep production logic in the root application files and `effects/`; keep historical DeepSeek material under `archive/deepseek/` rather than the repository root.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the basic change and testing process.
