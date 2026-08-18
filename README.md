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

## Project structure

```text
kefevideovisualiser/
├── .github/workflows/deploy-kefe.yml
├── effects/                         # Production lyric renderers and effect data
├── fonts/                           # Bundled production fonts and licences
├── preview/                         # Standalone effect preview material
├── app.js                            # Application orchestration
├── index.html                        # Application entry point
├── styles.css                        # UI styles
├── typography.css                    # Typography declarations
├── typography.js                     # Typography contracts/loading
├── kefe-logo.svg                     # Product branding
├── favicon.svg                       # Browser icon
├── CHANGELOG.md                      # Release history
├── CONTRIBUTING.md                   # Contribution guidance
├── DESIGN-SYSTEM-CHECKLIST.md        # Product QA baseline
├── EFFECT_TYPOGRAPHY.md              # Effect typography specification
├── THIRD-PARTY-LICENSES.md            # Third-party licensing record
└── README.md                          # Project overview
```

Production lyric effects are independent modules where appropriate. The production effect registry is the single dispatch point for modular renderers, while shared timing, typography and drawing helpers live in `effects/core.js` and `typography.js`. The effect database, public catalog and preset library remain data-driven rather than being duplicated inside the application UI.

Bundled production fonts live under `fonts/` and are loaded locally; they are not part of the application root.

## Effects

- **Apple** — smooth focus-line lyric movement.
- **Brat** — abrupt album-cover typography.
- **Eternal** — handwritten lyric reveal.
- **Aurora** — atmospheric marker typography and colour flow.
- **Typewriter** — restrained character-by-character reveal.
- **Instagram Lyrics** — bold stacked Story lyrics with a dominant active line and smooth handoff.
- **Fade Up** — kinetic word-by-word rise and settle.

The old Stroke effect and its production file are removed. Star Wars is also no longer part of the production effect set.

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

Audio, backgrounds and project files remain in the browser during editing and export. Automatic lyric lookup sends song metadata to the configured lyrics service. Bundled fonts are loaded locally from the repository.

## Development

Keep production application logic in the root entry files and `effects/`. Keep bundled fonts in `fonts/`, preview material in `preview/`, and historical or experimental material outside the production runtime. Keep documentation limited to project-level guidance and specifications that are still actively maintained.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the basic change and testing process.
