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
- Apple, Brat, Eternal, Aurora, Typewriter, Instagram Lyrics and Fade Up effects
- Instagram Lyrics is the canonical replacement for the removed Stroke effect
- Song title, artist and album title cards
- Embedded album-artwork extraction when available
- Image, video or solid-colour backgrounds
- 9:16, 1:1 and 16:9 layouts
- 480p, 720p and 1080p output presets
- Frame-accurate H.264/AAC MP4 export
- Lyric timing validation before export
- Portable `.kefe` project settings
- Open Sans interface with effect-specific typography contracts
- Effect.app-inspired public effect catalogue and preset library
- Canonical effect database loaded at runtime for future native renderer integration

## Project structure

```text
kefevideovisualiser/
├── .github/workflows/deploy-kefe.yml
├── effects/
│   ├── core.js
│   ├── database.js
│   ├── effect-database.json
│   ├── effect-app-public-catalog.json
│   ├── presets.json
│   ├── effect-app-fx.js
│   ├── registry.js
│   ├── brat.js
│   ├── eternal-sunshine.js
│   ├── aurora.js
│   ├── typewriter.js
│   ├── instagram-lyrics.js
│   ├── story-fade.js
│   ├── EFFECT-APP-IMPLEMENTATION.md
│   └── README.md
├── app.js
├── index.html
├── styles.css
├── typography.css
├── typography.js
├── fonts/homemade-apple/HomemadeApple-Regular.woff2
├── kefe-logo.svg
├── favicon.svg
├── preview/brat.html
├── CHANGELOG.md
├── CONTRIBUTING.md
├── DESIGN-SYSTEM-CHECKLIST.md
├── EFFECT_TYPOGRAPHY.md
└── README.md
```

The effect system has three distinct layers:

1. **Catalogue data** — `effect-app-public-catalog.json` records the public Effect.app-inspired names without copying proprietary renderer code.
2. **Canonical database** — `effect-database.json` gives every catalogue effect a stable ID, category, implementation status and preset family. `database.js` validates and exposes it at runtime.
3. **Renderers** — KEFE-native implementations live separately from the catalogue. Implemented effects are marked `implemented`; catalogue-only effects remain explicitly `catalogued` until their native renderer exists.

The production lyric-effect registry remains the dispatch point for modular lyric renderers, while `effect-app-fx.js` handles the existing whole-frame Visual FX pipeline.

## Effects

- **Apple** — smooth focus-line lyric movement.
- **Brat** — abrupt album-cover typography.
- **Eternal** — handwritten lyric reveal.
- **Aurora** — atmospheric marker typography and colour flow.
- **Typewriter** — restrained character-by-character reveal.
- **Instagram Lyrics** — bold stacked Story lyrics with a dominant active line and smooth handoff.
- **Fade Up** — kinetic word-by-word rise and settle.

The old Stroke effect and its production file are removed. Star Wars is also no longer part of the production effect set.

## Effect catalogue

The canonical database currently represents the full public catalogue as **64 effect records** across Blur, Color, Distort, Effects, Generate, Custom and Film. Existing KEFE-native whole-frame implementations are identified separately from catalogue-only effects; no proprietary Effect.app defaults or renderer code are claimed.

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

The repository deploys through the GitHub Pages workflow at `.github/workflows/deploy-kefe.yml`.

## Export

Export uses fixed timeline timestamps and short encoded segments. Rendering speed can affect how long an export takes, but it does not change the intended playback speed of the finished video.

Long 1080p exports remain demanding on mobile devices. For faster processing, use the 720p or 480p preset.

## Browser support

Use a current version of Chrome, Edge, Firefox or Safari with WebAssembly and canvas image encoding enabled.

## Privacy

Audio, backgrounds and project files remain in the browser during editing and export. Automatic lyric lookup sends song metadata to the configured lyrics service. External font or encoder files may be loaded from their configured hosts when local deployment assets are unavailable.

## Development

Keep production logic in the root application files and `effects/`. Keep historical or experimental material separate from the production runtime and document it accurately.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the basic change and testing process.
