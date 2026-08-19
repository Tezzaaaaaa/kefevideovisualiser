const FF_VERSION = '0.12.10';
const CORE_VERSION = '0.12.10';
const UTIL_VERSION = '0.12.10';
const CDN = 'https://cdn.jsdelivr.net/npm';

let encoderPromise = null;

function encoderFailure(stage, operation, error, details = {}) {
    const e = new Error(`[${stage}] encoder.${operation}: ${error?.message || String(error)}`);
    e.name = 'ExportDiagnosticError';
    e.code = `EXPORT_${stage}`;
    e.stage = stage;
    e.module = 'encoder';
    e.operation = operation;
    e.details = details;
    e.cause = error;
    return e;
}

async function loadFFmpegModules() {
    try {
        const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
            import(`${CDN}/@ffmpeg/ffmpeg@${FF_VERSION}/dist/esm/index.js`),
            import(`${CDN}/@ffmpeg/util@${UTIL_VERSION}/dist/esm/index.js`)
        ]);
        return { FFmpeg, toBlobURL };
    } catch (error) {
        throw encoderFailure('ENCODER_MODULES', 'loadModules', error, { ffmpeg: FF_VERSION, util: UTIL_VERSION });
    }
}

export async function loadEncoder({ onProgress = () => {} } = {}) {
    if (encoderPromise) return encoderPromise;
    encoderPromise = (async () => {
        try {
            onProgress('Loading encoder modules…', 2);
            const { FFmpeg, toBlobURL } = await loadFFmpegModules();
            const ffmpeg = new FFmpeg();
            const logs = [];
            ffmpeg.on('log', ({ message }) => {
                logs.push(message);
                if (logs.length > 100) logs.shift();
                console.debug('[KEFE FFmpeg]', message);
            });
            ffmpeg.on('progress', ({ progress, time }) => console.debug('[KEFE FFmpeg progress]', progress, time));

            const base = `${CDN}/@ffmpeg/core@${CORE_VERSION}/dist/esm`;
            const workerURL = `${CDN}/@ffmpeg/ffmpeg@${FF_VERSION}/dist/esm/worker.js`;

            onProgress('Loading encoder core…', 5);
            const coreURL = await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript');
            onProgress('Loading encoder WASM…', 15);
            const wasmURL = await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm');
            onProgress('Starting frame-accurate encoder…', 25);
            await ffmpeg.load({ coreURL, wasmURL, classWorkerURL: workerURL });
            onProgress('Encoder ready', 100);
            return ffmpeg;
        } catch (error) {
            encoderPromise = null;
            const diagnostic = error?.name === 'ExportDiagnosticError'
                ? error
                : encoderFailure('ENCODER_LOAD', 'load', error, { ffmpeg: FF_VERSION, core: CORE_VERSION, util: UTIL_VERSION });
            diagnostic.details = { ...(diagnostic.details || {}), versions: ENCODER_VERSIONS };
            console.error('[KEFE] FFmpeg initialization failed', diagnostic);
            throw diagnostic;
        }
    })();
    return encoderPromise;
}

export const ENCODER_VERSIONS = Object.freeze({ ffmpeg: FF_VERSION, core: CORE_VERSION, util: UTIL_VERSION });