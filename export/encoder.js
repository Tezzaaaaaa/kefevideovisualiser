const FF_VERSION = '0.12.10';
const CORE_VERSION = '0.12.10';
const UTIL_VERSION = '0.12.2';
const LOAD_TIMEOUT_MS = 30000;

const LOCAL = {
    ffmpeg: new URL('../vendor/ffmpeg/index.js', import.meta.url).href,
    util: new URL('../vendor/util/index.js', import.meta.url).href,
    core: new URL('../vendor/core/ffmpeg-core.js', import.meta.url).href,
    wasm: new URL('../vendor/core/ffmpeg-core.wasm', import.meta.url).href,
    worker: new URL('../vendor/ffmpeg/worker.js', import.meta.url).href
};

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
            import(LOCAL.ffmpeg),
            import(LOCAL.util)
        ]);
        return { FFmpeg, toBlobURL, source: 'local' };
    } catch (error) {
        throw encoderFailure('ENCODER_MODULES', 'loadModules', error, {
            source: 'local',
            ffmpeg: FF_VERSION,
            util: UTIL_VERSION,
            ffmpegURL: LOCAL.ffmpeg,
            utilURL: LOCAL.util
        });
    }
}

export async function loadEncoder({ onProgress = () => {} } = {}) {
    if (encoderPromise) return encoderPromise;
    encoderPromise = (async () => {
        const details = {
            ffmpeg: FF_VERSION,
            core: CORE_VERSION,
            util: UTIL_VERSION,
            source: 'local',
            ffmpegURL: LOCAL.ffmpeg,
            utilURL: LOCAL.util,
            coreURL: LOCAL.core,
            wasmURL: LOCAL.wasm,
            workerURL: LOCAL.worker
        };
        let logs = [];
        let ffmpeg = null;
        try {
            onProgress('Loading encoder modules…', 2);
            const { FFmpeg, toBlobURL } = await loadFFmpegModules();
            ffmpeg = new FFmpeg();
            ffmpeg.on('log', ({ message }) => { logs.push(message); if (logs.length > 100) logs.shift(); console.debug('[KEFE FFmpeg]', message); });
            ffmpeg.on('progress', ({ progress, time }) => console.debug('[KEFE FFmpeg progress]', progress, time));

            onProgress('Loading encoder core…', 5);
            const coreURL = await toBlobURL(LOCAL.core, 'text/javascript');
            onProgress('Loading encoder WASM…', 15);
            const wasmURL = await toBlobURL(LOCAL.wasm, 'application/wasm');
            onProgress('Starting frame-accurate encoder…', 25);
            await withTimeout(ffmpeg.load({ coreURL, wasmURL, classWorkerURL: LOCAL.worker }), LOAD_TIMEOUT_MS, { ...details, lastLogs: logs.slice(-20) });
            onProgress('Encoder ready', 100);
            return ffmpeg;
        } catch (error) {
            encoderPromise = null;
            try { ffmpeg?.terminate?.(); } catch {}
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
