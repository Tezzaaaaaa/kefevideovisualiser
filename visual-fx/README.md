# KEFE Visual FX

Reference and preset data for the visual-effects layer of KEFE.

These files describe visual effects KEFE may implement as native renderers. They are intentionally separate from the production lyric-effect renderers in `effects/`.

## Sources

- `catalog.json` — public Effect.app effect catalogue and documented controls.
- `presets.json` — KEFE preset metadata for visual-effect recipes.

The catalogue is a planning/reference source. KEFE should implement its own renderers and should not reproduce proprietary/private Effect.app shader code or undisclosed defaults.
