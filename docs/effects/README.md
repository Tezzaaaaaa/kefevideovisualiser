# KEFE Visual Effects

Production lyric effects are maintained as independent modules under `effects/`. Each renderer receives the common arguments `(ctx, width, height, style, lines, time)` and registers through `window.kefeEffects`.

## Production lyric effects

- `effects/brat.js` — Brat typography
- `effects/eternal-sunshine.js` — Eternal Sunshine handwritten treatment
- `effects/aurora.js` — Aurora marker/colour treatment
- `effects/typewriter.js` — character-by-character reveal
- `effects/instagram-lyrics.js` — Instagram Stories Music lyric treatment
- `effects/story-fade.js` — Fade Up lyric treatment

`effects/core.js` contains shared timing, typography and drawing helpers. `effects/registry.js` is the single dispatch point for modular lyric renderers.

## Instagram Lyrics

`effects/instagram-lyrics.js` is the production replacement for the removed Stroke effect. It follows the shared KEFE typography contract and uses synced line timing from the application rather than maintaining a separate lyric-timing implementation.

The renderer is deliberately restrained: bold uppercase text, a dominant active line, quieter neighbouring lines, compact spacing, automatic width fitting and smooth handoff between lyric states. It does not use a stroke, outline, glow, typewriter cursor or destructive canvas compositing.

The effect-specific controls and defaults are registered through `effects/registry.js`, while reusable preset names are maintained in `effects/presets.json`.

The effect registry is intentionally separate from the DeepSeek development archive.
