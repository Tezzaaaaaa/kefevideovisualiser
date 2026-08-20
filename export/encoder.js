const FF_VERSION = '0.12.15';
const CORE_VERSION = '0.12.10';
const LOAD_TIMEOUT_MS = 30000;

// Use the exact FFmpeg assets packaged by the GitHub Pages build. The exporter
// must not depend on a second, external CDN copy of the runtime.
const FFMPEG_MODULE_URL = new URL('../vendor/ffmpeg/index.js', import.meta.url).href;
const CORE_JS_URL = new URL('../vendor/core/ffmpeg-core.js', import.meta.url).href;
const CORE_WASM_URL = new URL('../vendor/core/ffmpeg-core.wasm', import.meta.url).href;

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

function withTimeout(promise, ms, details, operation) {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(encoderFailure('ENCODER_TIMEOUT', operation, new Error(`FFmpeg ${operation} timed out after ${ms / 1000}s`), details)), ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

async function fetchBlobURL(url, mime, label) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);
    try {
        const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        if (!blob.size) throw new Error('empty response');
        return URL.createObjectURL(new Blob([blob], { type: mime }));
    } catch (error) {
        if (error?.name === 'AbortError') {
            throw encoderFailure('ENCODER_TIMEOUT', label, new Error(`Timed out loading ${label}`), { url });
        }
        throw encoderFailure('ENCODER_ASSET', label, error, { url });
    } finally {
        clearTimeout(timer);
    }
}

export async function loadEncoder(onStatus) {
    if (encoderPromise) return encoderPromise;
    encoderPromise = (async () => {
        let ffmpeg = null;
        let coreURL = null;
        let wasmURL = null;
        const details = {
            source: 'github-pages-bundled-assets',
            ffmpeg: FF_VERSION,
            core: CORE_VERSION,
            ffmpegURL: FFMPEG_MODULE_URL,
            coreURL: CORE_JS_URL,
            wasmURL: CORE_WASM_URL
        };
        try {
            onStatus?.('Loading FFmpeg engine…');
            const module = await withTimeout(import(FFMPEG_MODULE_URL), LOAD_TIMEOUT_MS, details, 'module-load');
            const FFmpeg = module?.FFmpeg;
            if (typeof FFmpeg !== 'function') throw new Error('FFmpeg constructor was not found');

            onStatus?.('Loading FFmpeg core…');
            [coreURL, wasmURL] = await Promise.all([
                fetchBlobURL(CORE_JS_URL, 'text/javascript', 'ffmpeg-core'),
                fetchBlobURL(CORE_WASM_URL, 'application/wasm', 'ffmpeg-wasm')
            ]);

            ffmpeg = new FFmpeg();
            ffmpeg.on('log', data => console.debug('[KEFE FFmpeg]', data?.message || data));
            ffmpeg.on('error', error => console.error('[KEFE FFmpeg error]', error));

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
    try {
        const urls = encoder?.__kefeRuntimeURLs;
        encoder?.terminate?.();
        if (urls?.coreURL) URL.revokeObjectURL(urls.coreURL);
        if (urls?.wasmURL) URL.revokeObjectURL(urls.wasmURL);
    } catch {}
}

export const ENCODER_VERSIONS = Object.freeze({ ffmpeg: FF_VERSION, core: CORE_VERSION });
