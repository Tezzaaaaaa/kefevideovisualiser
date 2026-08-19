# KEFE Export Module

The export system is intentionally isolated from the application UI.

## Pipeline

`index.js` → validation → encoder → frame renderer → segment encoder → audio muxer → final MP4 → cleanup.

## Rules

- Export-specific code belongs in this directory.
- `app.js` should orchestrate the UI and call the public export API only.
- FFmpeg loading and lifecycle belong to the export module.
- Export errors must identify their stage.
- Temporary files and encoder resources must always be cleaned up.
- Do not add export workarounds to unrelated application files.
