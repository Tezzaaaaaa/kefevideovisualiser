export const EXPORT_DEFAULTS = Object.freeze({
    fps: 30,
    crf: 20,
    preset: 'veryfast',
    audioBitrate: '192k'
});

export function getExportConfig(preset, getDimensions) {
    const dimensions = getDimensions(preset);
    return { ...EXPORT_DEFAULTS, ...dimensions };
}
