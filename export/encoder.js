const FF_VERSION = '0.12.10';
const CORE_VERSION = '0.12.10';
const UTIL_VERSION = '0.12.10';
const CDN = 'https://cdn.jsdelivr.net/npm';
const LOAD_TIMEOUT_MS = 30000;

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

function withTimeout(promise, ms, details) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(encoderFailure('ENCODER_TIMEOUT', 'load', new Error(`FFmpeg did not finish loading within ${ms / 1000}s`), details)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
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
        const details = { ffmpeg: FF_VERSION, core: CORE_VERSION, util: UTIL_VERSION, cdn: CDN };
        let logs = [];
        try {
            onProgress('Loading encoder modules…', 2);
            const { FFmpeg, toBlobURL } = await loadFFmpegModules();
            const ffmpeg = new FFmpeg();
            ffmpeg.on('log', ({ message }) => { logs.push(message); if (logs.length > 100) logs.shift(); console.debug('[KEFE FFmpeg]', message); });
            ffmpeg.on('progress', ({ progress, time }) => console.debug('[KEFE FFmpeg progress]', progress, time));
            const base = `${CDN}/@ffmpeg/core@${CORE_VERSION}/dist/esm`;
            details.coreURL = `${base}/ffmpeg-core.js`;
            details.wasmURL = `${base}/ffmpeg-core.wasm`;
            details.workerURL = `${CDN}/@ffmpeg/ffmpeg@${FF_VERSION}/dist/esm/worker.js`;
            onProgress('Loading encoder core…', 5);
            const coreURL = await toBlobURL(details.coreURL, 'text/javascript');
            onProgress('Loading encoder WASM…', 15);
            const wasmURL = await toBlobURL(details.wasmURL, 'application/wasm');
            onProgress('Loading encoder worker…', 20);
            const workerURL = await toBlobURL(details.workerURL, 'text/javascript');
            onProgress('Starting frame-accurate encoder…', 25);
            await withTimeout(ffmpeg.load({ coreURL, wasmURL, classWorkerURL: workerURL }), LOAD_TIMEOUT_MS, { ...details, lastLogs: logs.slice(-20) });
            onProgress('Encoder ready', 100);
            return ffmpeg;
        } catch (error) {
            encoderPromise = null;
            const diagnostic = error?.name === 'ExportDiagnosticError' ? error : encoderFailure('ENCODER_LOAD', 'load', error, { ...details, lastLogs: logs.slice(-20) });
            diagnostic.details = { ...(diagnostic.details || {}), versions: ENCODER_VERSIONS };
            console.error('[KEFE] FFmpeg initialization failed', diagnostic);
            throw diagnostic;
        }
    })();
    return encoderPromise;
}

export function releaseEncoder(encoder) {
    if (encoderPromise) encoderPromise = null;
    try { encoder?.terminate?.(); } catch {}
}

export const ENCODER_VERSIONS = Object.freeze({ ffmpeg: FF_VERSION, core: CORE_VERSION, util: UTIL_VERSION });
