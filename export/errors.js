export class ExportError extends Error {
    constructor(stage, message, cause = null) {
        super(message);
        this.name = 'ExportError';
        this.stage = stage;
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
