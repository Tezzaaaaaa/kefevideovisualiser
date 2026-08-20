const FF_VERSION = '0.12.10';
const CORE_VERSION = '0.12.6';
const LOAD_TIMEOUT_MS = 30000;

const CDN_FFMPEG_MODULE_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@${FF_VERSION}/dist/esm/index.js`;
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

function withTimeout(promise, ms, details, operation) {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(encoderFailure('ENCODER_TIMEOUT', operation, new Error(`FFmpeg ${operation} timed out after ${ms / 1000}s`), details)), ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

async function fetchBlobURL(url, mimeType, details) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);
    try {
        const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status} while fetching ${url}`);
        const blob = await response.blob();
        if (!blob.size) throw new Error(`Empty response while fetching ${url}`);
        return URL.createObjectURL(new Blob([blob], { type: mimeType }));
    } catch (error) {
        if (error?.name === 'AbortError') {
            throw encoderFailure('ENCODER_TIMEOUT', 'fetch', new Error(`Timed out fetching ${url}`), details);
        }
        throw encoderFailure('ENCODER_FETCH', 'fetch', error, { ...details, url });
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
            source: 'official-cdn',
            ffmpeg: FF_VERSION,
            core: CORE_VERSION,
            ffmpegURL: CDN_FFMPEG_MODULE_URL,
            coreURL: `${CDN_CORE_BASE_URL}/ffmpeg-core.js`,
            wasmURL: `${CDN_CORE_BASE_URL}/ffmpeg-core.wasm`
        };
        try {
            onStatus?.('Loading FFmpeg engine…');
            const module = await withTimeout(import(CDN_FFMPEG_MODULE_URL), LOAD_TIMEOUT_MS, details, 'module-load');
            const FFmpeg = module?.FFmpeg;
            if (typeof FFmpeg !== 'function') throw new Error('FFmpeg constructor was not found');

            ffmpeg = new FFmpeg();
            ffmpeg.on('log', data => console.debug('[KEFE FFmpeg]', data?.message || data));
            ffmpeg.on('error', error => console.error('[KEFE FFmpeg error]', error));

            onStatus?.('Downloading FFmpeg core…');
            [coreURL, wasmURL] = await Promise.all([
                fetchBlobURL(details.coreURL, 'text/javascript', details),
                fetchBlobURL(details.wasmURL, 'application/wasm', details)
            ]);

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

export const ENCODER_VERSIONS = Object.freeze({ ffmpeg: FF_VERSION, core: CORE_VERSION });
