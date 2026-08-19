export class ExportError extends Error {
    constructor(stage, message, cause = null, details = {}) {
        super(message);
        this.name = 'ExportError';
        this.code = `EXPORT_${String(stage).replace(/[^A-Z0-9]+/gi, '_')}`;
        this.stage = stage;
        this.module = 'export';
        this.operation = 'pipeline';
        this.details = details;
        this.cause = cause;
    }
}

export const EXPORT_STAGES = Object.freeze({
    VALIDATING: 'VALIDATING',
    LOADING_ENCODER: 'LOADING_ENCODER',
    RENDERING_FRAMES: 'RENDERING_FRAMES',
    ENCODING_VIDEO: 'ENCODING_VIDEO',
    MUXING_AUDIO: 'MUXING_AUDIO',
    FINALISING: 'FINALISING',
    COMPLETE: 'COMPLETE'
});