# LINA locked UI rules

These are regression requirements, not suggestions. Changes that break them must fail QA and must not be treated as complete.

## Setup
- Every Setup control must remain fully visible, reachable, and clickable.
- Setup must never be clipped by a parent container.
- Back / Next workflow controls must never float over Setup form controls.
- Song-search results must not cover or block Setup fields.
- Desktop Setup width must remain usable (minimum 290px in QA; target 320–360px on wide screens).
- At 900px and below, the workspace must collapse to one full-width column so Setup is never squeezed beside Preview.
- Setup must remain usable in Chromium, Firefox, and WebKit at desktop, compact desktop, tablet, and mobile viewports.

## Regression gate
`qa/setup-layout-lock.mjs` enforces these rules in CI. `.github/workflows/ui-smoke.yml` runs the gate on pull requests and every update to `main`.
