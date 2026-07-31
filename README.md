# Story Lyrics

An iPhone-first, client-side lyric video generator inspired by social Story lyric effects.

## Live website

https://tezzaaaaaa.github.io/-story-lyrics-cloud/

## What it does

- Imports audio from the iPhone Files app
- Imports TXT, LRC and SRT lyric files
- Supports MP3, M4A, AAC, WAV, FLAC, OGG and OPUS audio
- Imports photo or video backgrounds
- Provides six lyric styles: Stack, Karaoke, Type, Poster, Words and Classic
- Shows the full song duration and lets you scrub through the complete track
- Adjusts lyric size, position, alignment, colour and global timing offset
- Exports 9:16 video directly on the device
- Runs without Render, a Mac, a paid server or a credit card

## iPhone use

1. Open the live website in Safari.
2. Tap **Add audio** and select a file from Files.
3. Tap **Add lyrics** and select TXT, LRC or SRT.
4. Add an optional photo or video background.
5. Choose an effect and adjust timing.
6. Select 15, 30, 45 or 60 seconds and export.
7. Use **Share → Add to Home Screen** for app-like access.

## Important limitations

- Apple Music subscription tracks cannot be imported directly because iOS does not expose protected streaming files to websites.
- Files must be stored in Files, iCloud Drive, Downloads or another Files provider.
- Safari determines whether the result is MP4 or WebM.
- 1080p export uses more memory than 720p and may fail on older devices.
- Keep Safari open and the screen awake during export.

## Project structure

- `docs/index.html` — live client-side website
- `.github/workflows/deploy-pages.yml` — GitHub Pages deployment
- `backend/` and `web/` — earlier server-hosted edition retained for reference
- `Dockerfile` and `render.yaml` — optional legacy cloud deployment files

## Privacy

The GitHub Pages edition processes imported media locally in the browser. Audio, lyrics and backgrounds are not uploaded to this repository or a rendering server.

## Status

The current build is an active iPhone-focused beta. File import, lyric parsing and export behaviour should be tested after each iOS/Safari update.

## Copyright

Use only audio, lyrics, images and video that you own or have permission to use. This project does not provide access to Apple Music files or bypass DRM.
