# LINA locked UI rules

These are regression requirements, not suggestions. Changes that break them must fail QA and must not be treated as complete.

## Editor shell
- Desktop uses an editor hierarchy, not three equal competing webpages.
- Setup / Style / Background use a dedicated source inspector (target 320px) plus the flexible Preview canvas. The lyric-only right inspector must not steal width when those tools are active.
- Lyrics may add a dedicated right inspector (target 340px) for timeline and selected-line editing.
- The Preview/canvas remains the visual priority and must never be starved by oversized sidebars.
- Transport actions stay compact. Previous / Edit / Sync / Next must not stretch into oversized full-width buttons.
- Preview controls remain a shallow live-control strip rather than a tall settings panel.
- Output settings remain compact. The top-right Export button is the single visible export action; a second bottom Export button must not return.
- Direct tool tabs replace visible Back / Next workflow controls. Back / Next must not return as a floating or duplicated control bar.
- Optional word-emphasis editing starts collapsed and expands only when requested.

## Setup
- Every active Setup control must remain fully visible, reachable, and clickable.
- Setup must never be clipped by a parent container.
- Retired song-search UI must not reappear in the active Setup workflow.
- Desktop Setup width must remain usable (minimum 290px in QA; target 320px on wide screens).
- No overlay may cover artwork, release, title, artist, or audio controls.

## Responsive behaviour
- At 1280px and below, the lyric inspector may move below Preview instead of squeezing the canvas.
- At 900px and below, the workspace becomes one full-width column.
- Mobile order is Preview first, then the active tool inspector, then lyric-detail tools where relevant.
- Mobile tool navigation is a fixed bottom tab bar with reserved page space so it cannot cover content.
- The page must not develop horizontal overflow at supported QA viewports.
- Layout rules must hold in Chromium, Firefox, and WebKit at desktop, compact desktop, tablet, and mobile sizes.

## Regression gates
- `qa/setup-layout-lock.mjs` locks active Setup accessibility.
- `qa/editor-shell-layout-lock.mjs` locks the overall adaptive editor hierarchy, density, single export action, contextual sidebars, mobile order, and overflow behaviour.
- `.github/workflows/ui-smoke.yml` runs these gates on pull requests and every update to `main`, followed by the WebKit FFmpeg probe and full control/export matrix.
