const FF_VERSION = '0.12.10';
const CORE_VERSION = '0.12.6';
const UTIL_VERSION = '0.12.10';
const LOAD_TIMEOUT_MS = 30000;

const CDN = {
    ffmpeg: `https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@${FF_VERSION}/dist/esm/index.js`,
    util: `https://cdn.jsdelivr.net/npm/@ffmpeg/util@${UTIL_VERSION}/dist/esm/index.js`,
    core: `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd/ffmpeg-core.js`,
    wasm: `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd/ffmpeg-core.wasm`,
    worker: `https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@${FF_VERSION}/dist/esm/worker.js`
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
    const attempts = [];
    const sources = [
        { name: 'cdn', ffmpeg: CDN.ffmpeg, util: CDN.util },
        { name: 'local', ffmpeg: '../vendor/ffmpeg/index.js', util: '../vendor/util/index.js' }
    ];

    for (const source of sources) {
        try {
            const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
                import(source.ffmpeg),
                import(source.util)
            ]);
            return { FFmpeg, toBlobURL, source: source.name };
        } catch (error) {
            attempts.push({ source: source.name, error: error?.message || String(error) });
        }
    }

    throw encoderFailure('ENCODER_MODULES', 'loadModules', new Error('FFmpeg JavaScript modules could not be loaded from the CDN or local vendor bundle'), {
        ffmpeg: FF_VERSION,
        util: UTIL_VERSION,
        attempts
    });
}

export async function loadEncoder({ onProgress = () => {} } = {}) {
    if (encoderPromise) return encoderPromise;
    encoderPromise = (async () => {
        const details = { ffmpeg: FF_VERSION, core: CORE_VERSION, util: UTIL_VERSION, source: 'cdn' };
        let logs = [];
        let ffmpeg = null;
        try {
            onProgress('Loading encoder modules…', 2);
            const { FFmpeg, toBlobURL, source } = await loadFFmpegModules();
            details.source = source;
            ffmpeg = new FFmpeg();
            ffmpeg.on('log', ({ message }) => { logs.push(message); if (logs.length > 100) logs.shift(); console.debug('[KEFE FFmpeg]', message); });
            ffmpeg.on('progress', ({ progress, time }) => console.debug('[KEFE FFmpeg progress]', progress, time));

            const base = source === 'cdn' ? CDN : {
                core: new URL('../vendor/core/ffmpeg-core.js', import.meta.url).href,
                wasm: new URL('../vendor/core/ffmpeg-core.wasm', import.meta.url).href,
                worker: new URL('../vendor/ffmpeg/worker.js', import.meta.url).href
            };
            details.coreURL = base.core;
            details.wasmURL = base.wasm;
            details.workerURL = base.worker;

            onProgress('Loading encoder core…', 5);
            const coreURL = await toBlobURL(details.coreURL, 'text/javascript');
            onProgress('Loading encoder WASM…', 15);
            const wasmURL = await toBlobURL(details.wasmURL, 'application/wasm');
            onProgress('Starting frame-accurate encoder…', 25);
            await withTimeout(ffmpeg.load({ coreURL, wasmURL, classWorkerURL: details.workerURL }), LOAD_TIMEOUT_MS, { ...details, lastLogs: logs.slice(-20) });
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
