# Story Lyrics

An iPhone-first, client-side lyric video generator for creating social-media lyric videos directly in Safari.

## Live website

https://tezzaaaaaa.github.io/-story-lyrics-cloud/

## Features

- Imports audio from the iPhone Files app
- Imports TXT, LRC and SRT lyric files
- Supports MP3, M4A, AAC, WAV, FLAC, OGG and OPUS audio
- Imports photo or video backgrounds
- Includes Stack, Karaoke, Type, Poster, Words and Classic lyric effects
- Shows and scrubs through the full song duration
- Supports 15, 30, 45 and 60-second exports
- Supports 9:16, 4:5, 1:1 and 16:9 framing
- Adjusts lyric size, position, alignment, colour and timing offset
- Processes media locally on the device
- Requires no Render server, Mac, payment card or account

## iPhone use

1. Open the live website in Safari.
2. Tap **Add audio** and choose a song stored in Files.
3. Tap **Add lyrics** and select a TXT, LRC or SRT file.
4. Add an optional photo or video background.
5. Choose a lyric effect and adjust its appearance.
6. Select an export duration, aspect ratio and quality.
7. Tap **Export** and keep Safari open while the video renders.
8. Use **Share → Add to Home Screen** for app-like access.

## Repository structure

```text
-story-lyrics-cloud/
├── .github/
│   ├── SECURITY.md            # Security and privacy policy
│   └── workflows/
│       └── pages-simple.yml   # Active GitHub Pages deployment
├── docs/
│   ├── CHANGELOG.md           # Release history
│   └── index.html             # Complete client-side application
├── .gitignore                 # Local and generated-file exclusions
└── README.md                  # Project overview and instructions
```

Only the conventional `README.md` and hidden `.gitignore` remain at the repository root. Project files are organised into `docs/` and `.github/`.

## Development

The site has no build-system requirement. To test locally, open `docs/index.html` in a modern browser. GitHub Pages deployment occurs automatically after changes to `docs/` or `.github/workflows/pages-simple.yml` are pushed to `main`.

## Limitations

- Apple Music subscription tracks cannot be imported because iOS does not expose DRM-protected streaming files as ordinary files.
- Audio must be available through Files, iCloud Drive, Downloads or another Files provider.
- Safari determines whether an exported recording is delivered as MP4 or WebM.
- 1080p and long-duration exports require more memory and may fail on older devices.
- Keep Safari open and the screen awake during export.

## Privacy

Imported audio, lyrics and backgrounds are processed locally in the browser. They are not uploaded to this repository or to a rendering server.

## Copyright

Use only audio, lyrics, images and video that you own or have permission to use. This project does not provide access to Apple Music files or bypass DRM.
