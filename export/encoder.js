const FF_VERSION = '0.12.10';
const CORE_VERSION = '0.12.6';
const UTIL_VERSION = '0.12.2';
const LOAD_TIMEOUT_MS = 30000;

const CDN_FFMPEG_MODULE_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@${FF_VERSION}/dist/esm/index.js`;
const CDN_UTIL_MODULE_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/util@${UTIL_VERSION}/dist/esm/index.js`;
const CDN_CORE_BASE_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`;

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

function withTimeout(promise, ms, details, operation = 'load') {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(encoderFailure('ENCODER_TIMEOUT', operation, new Error(`FFmpeg ${operation} timed out after ${ms / 1000}s`), details)), ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

export async function loadEncoder(onStatus) {
    if (encoderPromise) return encoderPromise;
    encoderPromise = (async () => {
        let ffmpeg = null;
        let coreURL = null;
        let wasmURL = null;
        const details = { source: 'official-cdn', ffmpeg: FF_VERSION, core: CORE_VERSION, util: UTIL_VERSION, ffmpegURL: CDN_FFMPEG_MODULE_URL, utilURL: CDN_UTIL_MODULE_URL, coreURL: `${CDN_CORE_BASE_URL}/ffmpeg-core.js`, wasmURL: `${CDN_CORE_BASE_URL}/ffmpeg-core.wasm` };
        try {
            onStatus?.('Loading FFmpeg engine…');
            const [{ FFmpeg }, { toBlobURL }] = await Promise.all([import(CDN_FFMPEG_MODULE_URL), import(CDN_UTIL_MODULE_URL)]);
            ffmpeg = new FFmpeg();
            ffmpeg.on('log', data => console.debug('[KEFE FFmpeg]', data?.message || data));
            ffmpeg.on('error', error => console.error('[KEFE FFmpeg error]', error));
            onStatus?.('Loading FFmpeg core…');
            [coreURL, wasmURL] = await Promise.all([toBlobURL(details.coreURL, 'text/javascript'), toBlobURL(details.wasmURL, 'application/wasm')]);
            onStatus?.('Starting FFmpeg…');
            await withTimeout(ffmpeg.load({ coreURL, wasmURL }), LOAD_TIMEOUT_MS, details, 'load');
            console.info('[KEFE] FFmpeg runtime loaded', details);
            ffmpeg.__kefeRuntimeURLs = { coreURL, wasmURL };
            return ffmpeg;
        } catch (error) {
            encoderPromise = null;
            try { ffmpeg?.terminate?.(); } catch {}
            if (coreURL) URL.revokeObjectURL(coreURL);
            if (wasmURL) URL.revokeObjectURL(wasmURL);
            throw error?.name === 'ExportDiagnosticError' ? error : encoderFailure('ENCODER_LOAD', 'load', error, details);
        }
    })();
    return encoderPromise;
}

export function releaseEncoder(encoder) {
    if (encoderPromise) encoderPromise = null;
    const runtime = encoder?.__kefeRuntimeURLs;
    try { encoder?.terminate?.(); } catch {}
    try { if (runtime?.coreURL) URL.revokeObjectURL(runtime.coreURL); } catch {}
    try { if (runtime?.wasmURL) URL.revokeObjectURL(runtime.wasmURL); } catch {}
    try { delete encoder.__kefeRuntimeURLs; } catch {}
}

export const ENCODER_VERSIONS = Object.freeze({ ffmpeg: FF_VERSION, core: CORE_VERSION, util: UTIL_VERSION });
