const FF_VERSION = '0.12.10';
const CORE_VERSION = '0.12.10';
const UTIL_VERSION = '0.12.2';
const LOAD_TIMEOUT_MS = 30000;

// Use the official ffmpeg.wasm browser controller. It owns the worker
// lifecycle and is the supported API for @ffmpeg/core 0.12.x.
const FFMPEG_MODULE_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@${FF_VERSION}/dist/esm/index.js`;
const UTIL_MODULE_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/util@${UTIL_VERSION}/dist/esm/index.js`;
const CORE_BASE_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`;

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
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(encoderFailure(
            'ENCODER_TIMEOUT',
            operation,
            new Error(`FFmpeg ${operation} timed out after ${ms / 1000}s`),
            details
        )), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function loadEncoder() {
    if (encoderPromise) return encoderPromise;

    encoderPromise = (async () => {
        let ffmpeg = null;
        let coreURL = null;
        let wasmURL = null;
        const details = {
            ffmpeg: FF_VERSION,
            core: CORE_VERSION,
            util: UTIL_VERSION,
            ffmpegURL: FFMPEG_MODULE_URL,
            utilURL: UTIL_MODULE_URL,
            coreURL: `${CORE_BASE_URL}/ffmpeg-core.js`,
            wasmURL: `${CORE_BASE_URL}/ffmpeg-core.wasm`
        };

        try {
            const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
                import(FFMPEG_MODULE_URL),
                import(UTIL_MODULE_URL)
            ]);

            ffmpeg = new FFmpeg();
            ffmpeg.on('log', data => console.debug('[KEFE FFmpeg]', data?.message || data));
            ffmpeg.on('error', error => console.error('[KEFE FFmpeg error]', error));

            // Convert the cross-origin core assets into blob URLs before passing
            // them to ffmpeg.wasm. This is the supported way to avoid worker/CORS
            // loading failures when the app itself is hosted on GitHub Pages.
            [coreURL, wasmURL] = await Promise.all([
                toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
                toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, 'application/wasm')
            ]);

            await withTimeout(
                ffmpeg.load({ coreURL, wasmURL }),
                LOAD_TIMEOUT_MS,
                details,
                'load'
            );

            console.info('[KEFE] FFmpeg runtime loaded', {
                ffmpeg: FF_VERSION,
                core: CORE_VERSION,
                util: UTIL_VERSION
            });

            ffmpeg.__kefeRuntimeURLs = { coreURL, wasmURL };
            return ffmpeg;
        } catch (error) {
            encoderPromise = null;
            try { ffmpeg?.terminate?.(); } catch {}
            if (coreURL) URL.revokeObjectURL(coreURL);
            if (wasmURL) URL.revokeObjectURL(wasmURL);
            throw error?.name === 'ExportDiagnosticError'
                ? error
                : encoderFailure('ENCODER_LOAD', 'load', error, details);
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

export const ENCODER_VERSIONS = Object.freeze({
    ffmpeg: FF_VERSION,
    core: CORE_VERSION,
    util: UTIL_VERSION
});
