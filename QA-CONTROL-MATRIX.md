# LINA Control & Feature QA Matrix

This file is the persistent completion gate for LINA. A control is not considered finished because code exists; it is finished only when its behaviour is exercised by runtime/browser QA.

## Workflow / project
- Setup / Lyrics / Style / Background navigation
- Back / Next / Preview workflow controls
- Save progress / autosave
- Reset project

## Media / identity
- Audio upload
- User artwork upload
- Background image upload
- Background video upload
- Title / artist / album-release fields
- Show title + artist intro
- Show artwork on intro
- Intro duration
- Use uploaded artwork as backdrop

## Lyrics
- Paste timestamped lyrics
- Import LRC / Enhanced LRC / SRT / VTT
- Plain lyrics manual mode
- Review hide / restore / delete / confirm
- Manual stamp current line
- Grouping
- Visible line count
- Lyrics entrance
- Clear lyrics

## Preview / transport
- Play / pause
- Stop
- Seek
- Elapsed / total / remaining time
- Previous line / Edit line / Sync now / Next line
- Text size / vertical position / colour / case / glow / global offset

## Signature effects
- Apple Music
- Charli xcx · Apple
- Eternal Sunshine
- Effect switching while paused
- Effect switching while playing
- Letter-case parity in preview and export
- Background image/video remains visible under every effect

## Placement / style
- Typeface
- Alignment / weight / line height / letter spacing
- Backdrop
- Direct drag
- Scale / pinch / mouse wheel
- Rotation / Shift+wheel
- Centre lyrics
- Reset transform
- Gradient treatment

## Timing editor
- Timeline line selection
- -100 ms / Set now / +100 ms
- Previous / next line
- Edit text / start / duration / apply
- Add / duplicate / delete line
- Word emphasis / hold / apply

## Background
- Crop X / crop Y / zoom
- Cover / contain
- Reset framing
- Video natural playback
- Video trim + loop
- Dim / blur
- Remove background

## Export
- Rights confirmation required
- Aspect 9:16 / 4:5 / 1:1 / 16:9
- 720p / 1080p
- Safe-area guides
- Cancel render
- Preview/export timing parity
- Apple Music export
- Charli export
- Eternal Sunshine export
- Firefox / Chromium / WebKit browser path

## Automated gate
`qa/ui-smoke.mjs` is run by `.github/workflows/ui-smoke.yml` in Chromium, Firefox and WebKit. Any failed runtime audit or interaction blocks completion.
