<div align="center">

# LINA: LYRIC VIDEO VISUALISER

### BUILD. SYNC. VISUALISE.

**A Helvetica-first, iPhone-first lyric video studio with Apple Music-ready metadata, local lyric parsing, adaptive karaoke motion, and social export.**

![Status](https://img.shields.io/badge/status-active-111111?style=flat-square)
![Platform](https://img.shields.io/badge/platform-iPhone%20%2F%20Web-111111?style=flat-square)
![Typography](https://img.shields.io/badge/type-Helvetica-111111?style=flat-square)
![Lyrics](https://img.shields.io/badge/lyrics-LRC%20%2F%20SRT%20%2F%20TXT-111111?style=flat-square)
![Privacy](https://img.shields.io/badge/media-local--first-111111?style=flat-square)

</div>

---

## 01 / WHAT IS LINA?

**LINA** is a browser-based lyric video visualiser built around one idea: make lyric video creation feel less like a utility and more like a designed creative tool.

The interface uses a restrained **Helvetica / black / white** visual system, while the lyric renderer focuses on smooth, playback-driven motion inspired by the fluidity of modern music interfaces.

No bloated dashboard. No generic template-builder aesthetic. No unnecessary cloud rendering requirement.

---

## 02 / CORE WORKFLOW

```text
AUDIO
  ↓
SONG IDENTIFICATION
  ↓
LRC / SRT / TXT IMPORT OR GENERATION
  ↓
TIMING + ADAPTIVE KARAOKE
  ↓
STYLE + TYPOGRAPHY + COMPOSITION
  ↓
METADATA-RICH EXPORT
```

---

## 03 / FEATURES

### Lyrics

- Local `.lrc`, enhanced LRC, `.srt`, `.vtt`, and `.txt` parsing
- iPhone Files-compatible lyric import
- Built-in LRC collector / generator workflow
- Apple Music link and catalogue-assisted song identification
- LRCLIB lookup with backup lyric-source workflow
- Local tap-sync fallback when synced lyrics cannot be found
- Timing offset, nudging, per-line editing, and recovery safeguards

### Motion

- Adaptive Apple Music-style karaoke progression
- Playback-clock-driven rendering rather than replayed CSS timing
- Smooth per-word interpolation
- Seek-aware and pause/resume-aware lyric state
- Stack, Karaoke, Type, Poster, Words, and Classic effects
- Reduced-motion fallback support

### Typography

- **Helvetica is the official interface and lyric design language**
- Helvetica lyric preset with its own restrained motion treatment
- Uppercase, lowercase, Title Case, or original lyric casing
- Wide lyric-size control range
- Line-spacing and letter-spacing controls
- Preview/export typography parity safeguards

### Media + Composition

- Audio import from Files
- Photo and video backgrounds
- Blur, dimming, gradients, fill/fit controls
- Drag, pinch-scale, rotate, centre, and safe-area guides
- 9:16-first composition with social-video workflow

### Metadata + Sharing

- Track title, artist, album, ISRC, Apple Music URL, and website metadata
- Apple Music-aware sharing context
- Project and export metadata history
- Machine-readable export metadata sidecar
- Local-first media handling where supported

### Reliability

- Recovery checkpoints
- Sync-drift protection
- Font-rendering preflight
- Export preflight and watchdog
- File validation
- Offline/online diagnostics
- Storage diagnostics
- Rollback after failed lyric import

---

## 04 / VISUAL LANGUAGE

```text
TYPE        Helvetica
PALETTE     Black / White / Grey
LAYOUT      Editorial / Minimal / Structured
MOTION      Smooth / Restrained / Continuous
ATTITUDE    Dark / Strong / Precise
```

LINA deliberately avoids glossy gradients, inflated cards, fake neon, and generic AI-dashboard styling. The visual system is intended to feel more like an art-direction document, studio tool, or typographic identity system.

---

## 05 / FILE SUPPORT

| Type | Supported |
|---|---|
| LRC | Yes |
| Enhanced LRC | Yes |
| SRT | Yes |
| VTT | Yes |
| TXT | Yes |
| MP3 | Yes |
| M4A / AAC | Yes |
| WAV | Yes |
| FLAC | Yes |
| OGG / OPUS | Yes |
| Image backgrounds | Yes |
| Video backgrounds | Yes |

---

## 06 / APPLE MUSIC WORKFLOW

LINA can use an Apple Music share URL as a **track-identification and metadata source**. It does not extract or redistribute DRM-protected Apple Music audio.

Typical flow:

1. Paste an Apple Music track URL, upload local audio, or enter part of the song title/artist.
2. LINA attempts to identify the song using Apple catalogue metadata.
3. Confirm the correct track when matches are ambiguous.
4. Search for synced lyrics.
5. If automatic lookup fails, use backup lyric sources or the local LRC maker.
6. Import the validated lyric timing into the visualiser.

---

## 07 / LOCAL-FIRST PRIVACY

Imported audio, lyric files, and backgrounds are intended to stay on-device where the browser permits it.

LINA does **not** exist to bypass DRM, download protected streaming audio, or redistribute Apple Music content. Apple Music integration is limited to identification, metadata, and sharing context.

---

## 08 / DEVELOPMENT

The project is intentionally lightweight and browser-first.

```bash
# clone
git clone https://github.com/Tezzaaaaaa/lyricvideovisualiser.git

# enter
cd lyricvideovisualiser

# serve locally with any static web server
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

The active development work for the current visual/motion overhaul is tracked through the repository pull request workflow.

---

## 09 / PROJECT MAP

```text
lyricvideovisualiser/
├── index.html
├── app.js
├── adaptive_karaoke.js
├── lrc_import_fix.js
├── lyric_collector.js
├── lyric_collector.css
├── control_fixes.js
├── safeguards.js
├── export.js
├── polish.js
├── apple_music_polish.css
├── helvetica_theme.css
├── site_chrome.js
├── media_store.js
└── README.md
```

---

## 10 / DESIGN PRINCIPLES

**One interface.** No duplicate setup screens.

**Clear hierarchy.** Every major area has an obvious section heading.

**Playback is truth.** Lyrics follow the actual audio clock.

**Local-first where possible.** Media should not needlessly leave the device.

**Fallbacks everywhere.** Lyric search, parsing, fonts, sync, storage, and export all need recovery paths.

**Typography matters.** Helvetica is not decoration here; it is the product language.

---

## 11 / LIMITATIONS

- DRM-protected Apple Music subscription files cannot be imported directly as ordinary audio files.
- Browser export capabilities depend on Safari/WebKit support and available device memory.
- Long or high-resolution exports may require more memory on older iPhones.
- Keep the browser active during rendering when required by the device.

---

## 12 / FEEDBACK

Bug reports, ideas, and workflow issues belong in GitHub Issues.

**Repository:** https://github.com/Tezzaaaaaa/lyricvideovisualiser  
**Issues:** https://github.com/Tezzaaaaaa/lyricvideovisualiser/issues

---

<div align="center">

**LINA: LYRIC VIDEO VISUALISER**

HELVETICA / BLACK / WHITE / SYSTEM 01

</div>
