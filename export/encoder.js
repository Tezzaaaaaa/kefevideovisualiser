const FF_VERSION = '0.12.10';
const CORE_VERSION = '0.12.10';
const UTIL_VERSION = '0.12.2';
const LOAD_TIMEOUT_MS = 30000;

// Prefer the self-hosted FFmpeg runtime produced by the deployment workflow.
// Fall back to the pinned official CDN packages for local development when the
// generated vendor files do not exist yet.
const LOCAL_FFMPEG_MODULE_URL = new URL('../vendor/ffmpeg/index.js', import.meta.url).href;
const LOCAL_UTIL_MODULE_URL = new URL('../vendor/util/index.js', import.meta.url).href;
const LOCAL_CORE_BASE_URL = new URL('../vendor/core/', import.meta.url).href.replace(/\/$/, '');
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

async function localRuntimeAvailable() {
    try {
        const response = await fetch(LOCAL_FFMPEG_MODULE_URL, { method: 'HEAD', cache: 'no-store' });
        return response.ok;
    } catch {
        return false;
    }
}

export async function loadEncoder() {
    if (encoderPromise) return encoderPromise;

    encoderPromise = (async () => {
        let ffmpeg = null;
        let coreURL = null;
        let wasmURL = null;
        const useLocal = await localRuntimeAvailable();
        const ffmpegModuleURL = useLocal ? LOCAL_FFMPEG_MODULE_URL : CDN_FFMPEG_MODULE_URL;
        const utilModuleURL = useLocal ? LOCAL_UTIL_MODULE_URL : CDN_UTIL_MODULE_URL;
        const coreBaseURL = useLocal ? LOCAL_CORE_BASE_URL : CDN_CORE_BASE_URL;
        const source = useLocal ? 'self-hosted' : 'cdn-fallback';
        const details = {
            source,
            ffmpeg: FF_VERSION,
            core: CORE_VERSION,
            util: UTIL_VERSION,
            ffmpegURL: ffmpegModuleURL,
            utilURL: utilModuleURL,
            coreURL: `${coreBaseURL}/ffmpeg-core.js`,
            wasmURL: `${coreBaseURL}/ffmpeg-core.wasm`
        };

        try {
            const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
                import(ffmpegModuleURL),
                import(utilModuleURL)
            ]);

            ffmpeg = new FFmpeg();
            ffmpeg.on('log', data => console.debug('[KEFE FFmpeg]', data?.message || data));
            ffmpeg.on('error', error => console.error('[KEFE FFmpeg error]', error));

            // Blob URLs keep the core assets same-origin from the worker's point
            // of view and avoid the cross-origin loading failures that caused the
            // previous custom worker implementation to be unreliable.
            [coreURL, wasmURL] = await Promise.all([
                toBlobURL(`${coreBaseURL}/ffmpeg-core.js`, 'text/javascript'),
                toBlobURL(`${coreBaseURL}/ffmpeg-core.wasm`, 'application/wasm')
            ]);

            await withTimeout(
                ffmpeg.load({ coreURL, wasmURL }),
                LOAD_TIMEOUT_MS,
                details,
                'load'
            );

            console.info('[KEFE] FFmpeg runtime loaded', details);
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
