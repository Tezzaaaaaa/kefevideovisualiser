# Effect.app integration — KEFE

## Purpose

This document defines how the public Effect.app catalogue is represented inside KEFE without copying proprietary renderer/source code.

## Data architecture

- `effect-app-public-catalog.json` is the source-of-truth catalogue for the publicly listed effect and preset names.
- `effect-database.json` is the canonical KEFE effect registry for that catalogue. Every public effect has a stable ID, category, implementation status and preset family.
- `presets.json` remains the reusable preset-name library and reference source for effect-specific and master presets.
- `database.js` validates and exposes the canonical database at runtime through `window.kefeEffectDatabase` and `window.kefeEffectsCatalog`.
- `effect-app-fx.js` contains KEFE-native Canvas implementations of selected visual treatments.
- `registry.js` contains the lyric-effect renderer registry.
- `validate-database.mjs` checks catalogue/database coverage, stable IDs, renderer status and preset structure during deployment.

## Effect record

Each catalogue effect resolves to a record of this form:

```json
{
  "id": "stable-slug",
  "name": "Display Name",
  "category": "Blur",
  "status": "catalogued",
  "renderer": null,
  "parameters": {},
  "presets": [],
  "animatable": true,
  "supportsImage": true,
  "supportsVideo": true
}
```

`status` is either `implemented` or `catalogued`. An implemented record must name its KEFE-native renderer. A catalogue-only record deliberately has `renderer: null`; it is not presented as implemented.

Parameter records should eventually declare type, default, minimum, maximum, step, UI control and animation support. Do not invent exact Effect.app defaults when they are not publicly exposed.

## Preset record

The canonical preset schema remains:

```json
{
  "id": "preset-slug",
  "name": "Preset Name",
  "effects": [
    {
      "effect": "stable-slug",
      "enabled": true,
      "parameters": {}
    }
  ],
  "keyframes": {},
  "version": 1
}
```

The current `presets.json` contains preset families and names. Complete parameter recipes are added as each native renderer is implemented; names alone are not treated as fabricated Effect.app parameter defaults.

## Rendering pipeline

Input media -> decode -> source texture/canvas -> ordered effect stack -> compositing/layer mix -> colour/output stage -> preview/export.

Preview and export should use the same renderer and parameter state so an effect does not change appearance between the editor and exported video.

## Animation

Animatable values should use per-parameter keyframe tracks. Supported public interpolation names represented in the catalogue are linear, sine, ease in-out, cubic and elastic bounce.

## Current KEFE-native FX

`effect-app-fx.js` currently provides independent Canvas implementations for VHS, CRT, RGB Shift, Bloom, Motion Blur, Camera Shake, Glitch, Halftone, Vignette and Mixed Media. These are KEFE implementations inspired by the visual category, not copied Effect.app source.

## Integration rule

The catalogue is comprehensive at the public-name level. Renderer implementation is a separate engineering layer. Where Effect.app exposes only a name or visual description, KEFE should implement the closest high-quality native equivalent rather than pretending to possess undisclosed Effect.app internals.
