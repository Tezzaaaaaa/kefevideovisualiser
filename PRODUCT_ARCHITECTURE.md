# Product architecture

## Product surfaces
- Responsive web editor: project creation, lyrics, styling and preview.
- Mac render service: project storage, media analysis and future FFmpeg rendering.
- Future iPhone companion: project edits, render submission and export retrieval.

## Render flow
1. Import user-authorised audio.
2. Parse TXT, LRC or enhanced LRC lyrics.
3. Select template and aspect ratio.
4. Build a deterministic render manifest.
5. Render visual layers and audio through FFmpeg.
6. Save MP4 plus optional subtitle output.

## Planned formats
- Input audio: MP3, WAV, M4A, FLAC.
- Lyrics: TXT, LRC, enhanced LRC, SRT.
- Artwork: PNG, JPEG, WebP.
- Background video: MP4, MOV.
- Output: H.264/AAC MP4 in 16:9, 9:16 and 1:1.
