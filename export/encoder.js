const FF_VERSION = '0.12.10';
const CORE_VERSION = '0.12.10';
const LOAD_TIMEOUT_MS = 30000;

const BUNDLED_MODULE_URL = new URL('../vendor/ffmpeg/index.js', import.meta.url).href;
const BUNDLED_CORE_URL = new URL('../vendor/core/ffmpeg-core.js', import.meta.url).href;
const BUNDLED_WASM_URL = new URL('../vendor/core/ffmpeg-core.wasm', import.meta.url).href;
const BUNDLED_CLASS_WORKER_URL = new URL('../vendor/ffmpeg/worker.js', import.meta.url).href;

const CDN_BASE = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`;
const CDN_MODULE_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@${FF_VERSION}/dist/esm/index.js`;

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
        if (error?.name === 'AbortError') throw encoderFailure('ENCODER_TIMEOUT', label, new Error(`Timed out loading ${label}`), { url });
        throw encoderFailure('ENCODER_ASSET', label, error, { url });
    } finally {
        clearTimeout(timer);
    }
}

async function assetExists(url, label) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);
    try {
        const response = await fetch(url, { method: 'GET', signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        if (!blob.size) throw new Error('empty response');
        return true;
    } catch (error) {
        if (error?.name === 'AbortError') throw encoderFailure('ENCODER_TIMEOUT', label, new Error(`Timed out loading ${label}`), { url });
        throw encoderFailure('ENCODER_ASSET', label, error, { url });
    } finally {
        clearTimeout(timer);
    }
}

async function loadBundled() {
    await assetExists(BUNDLED_MODULE_URL, 'bundled-ffmpeg-module');
    await assetExists(BUNDLED_CORE_URL, 'bundled-ffmpeg-core');
    await assetExists(BUNDLED_WASM_URL, 'bundled-ffmpeg-wasm');
    await assetExists(BUNDLED_CLASS_WORKER_URL, 'bundled-ffmpeg-worker');
    const module = await withTimeout(import(BUNDLED_MODULE_URL), LOAD_TIMEOUT_MS, { source: 'bundled' }, 'bundled-module-load');
    return { module, coreURL: BUNDLED_CORE_URL, wasmURL: BUNDLED_WASM_URL, classWorkerURL: BUNDLED_CLASS_WORKER_URL, source: 'bundled' };
}

async function loadCDN() {
    const module = await withTimeout(import(CDN_MODULE_URL), LOAD_TIMEOUT_MS, { source: 'cdn', moduleURL: CDN_MODULE_URL }, 'cdn-module-load');
    // Fetching these assets into same-origin blob URLs avoids CORS and worker URL problems.
    const [coreURL, wasmURL] = await Promise.all([
        fetchBlobURL(`${CDN_BASE}/ffmpeg-core.js`, 'text/javascript', 'cdn-ffmpeg-core'),
        fetchBlobURL(`${CDN_BASE}/ffmpeg-core.wasm`, 'application/wasm', 'cdn-ffmpeg-wasm')
    ]);
    return { module, coreURL, wasmURL, classWorkerURL: undefined, source: 'cdn' };
}

export async function loadEncoder(onStatus) {
    if (encoderPromise) return encoderPromise;
    encoderPromise = (async () => {
        let ffmpeg = null;
        let runtime = null;
        try {
            onStatus?.('Loading FFmpeg engine…');
            try {
                runtime = await loadBundled();
                onStatus?.('Using bundled FFmpeg runtime…');
            } catch (bundledError) {
                console.warn('[KEFE] Bundled FFmpeg runtime unavailable; falling back to CDN.', bundledError);
                onStatus?.('Bundled runtime unavailable — loading FFmpeg fallback…');
                runtime = await loadCDN();
            }

            const FFmpeg = runtime.module?.FFmpeg;
            if (typeof FFmpeg !== 'function') throw new Error('FFmpeg constructor was not found');

            ffmpeg = new FFmpeg();
            ffmpeg.on('log', data => console.debug('[KEFE FFmpeg]', data?.message || data));
            ffmpeg.on('error', error => console.error('[KEFE FFmpeg error]', error));

            onStatus?.('Starting FFmpeg…');
            const config = {
                coreURL: runtime.coreURL,
                wasmURL: runtime.wasmURL
            };
            if (runtime.classWorkerURL) config.classWorkerURL = runtime.classWorkerURL;
            await withTimeout(ffmpeg.load(config), LOAD_TIMEOUT_MS, { source: runtime.source, coreURL: runtime.coreURL, wasmURL: runtime.wasmURL }, 'load');
            console.info('[KEFE] FFmpeg runtime loaded', { source: runtime.source, ffmpeg: FF_VERSION, core: CORE_VERSION });
            ffmpeg.__kefeRuntimeURLs = runtime;
            return ffmpeg;
        } catch (error) {
            encoderPromise = null;
            try { ffmpeg?.terminate?.(); } catch {}
            throw error?.name === 'ExportDiagnosticError' ? error : encoderFailure('ENCODER_LOAD', 'load', error, { ffmpeg: FF_VERSION, core: CORE_VERSION });
        }
    })();
    return encoderPromise;
}

export function releaseEncoder(encoder) {
    if (encoderPromise) encoderPromise = null;
    try { encoder?.terminate?.(); } catch {}
}

export const ENCODER_VERSIONS = Object.freeze({ ffmpeg: FF_VERSION, core: CORE_VERSION });
