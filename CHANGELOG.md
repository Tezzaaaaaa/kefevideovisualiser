# Changelog

## Unreleased

- Added 9:16, 4:5, 1:1 and 16:9 project framing controls
- Corrected export duration handling for 15, 30, 45 and 60-second videos
- Removed obsolete Render and Docker deployment files
- Removed the duplicate malformed GitHub Pages workflow
- Simplified the repository to one client application and one active deployment workflow
- Added repository ignore rules and refreshed project documentation

## 1.2.1 — iPhone import and duration fixes

- Allowed LRC selection even when iOS reports an unknown file type
- Added extension validation for TXT, LRC and SRT after selection
- Expanded audio support for MP3, M4A, AAC, WAV, FLAC, OGG and OPUS
- Changed the transport scrubber to show the complete song duration
- Added current-time and total-duration display
- Kept Story export duration separate from song playback duration
- Fixed LRC fractional timestamp parsing and lyric progression

## 1.2.0 — Client-side iPhone edition

- Removed the requirement for Render, a Mac and server-side FFmpeg
- Added GitHub Pages deployment
- Added on-device canvas and MediaRecorder export
- Added six lyric behaviours
- Added local audio, lyric and background import

## 1.1.0 — Cloud edition

- Added the original Docker and Render deployment configuration
- Added the original password-protected Go backend and FFmpeg conversion

## 1.0.0 — Initial completed website

- Added lyric parsing, timing controls, backgrounds, project workflow and MP4 export pipeline
