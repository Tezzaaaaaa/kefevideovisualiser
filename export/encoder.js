const FF_VERSION = '0.12.15';
const CORE_VERSION = '0.12.10';
const LOAD_TIMEOUT_MS = 30000;

const BUNDLED_MODULE_URL = new URL('../vendor/ffmpeg/index.js', import.meta.url).href;
const BUNDLED_CORE_URL = new URL('../vendor/core/ffmpeg-core.js', import.meta.url).href;
const BUNDLED_WASM_URL = new URL('../vendor/core/ffmpeg-core.wasm', import.meta.url).href;
const BUNDLED_CLASS_WORKER_URL = new URL('../vendor/ffmpeg/worker.js', import.meta.url).href;

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

async function verifyAsset(url, label) {
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

export async function loadEncoder(onStatus) {
    if (encoderPromise) return encoderPromise;
    encoderPromise = (async () => {
        let ffmpeg = null;
        const details = {
            source: 'bundled',
            ffmpeg: FF_VERSION,
            core: CORE_VERSION,
            ffmpegURL: BUNDLED_MODULE_URL,
            coreURL: BUNDLED_CORE_URL,
            wasmURL: BUNDLED_WASM_URL,
            classWorkerURL: BUNDLED_CLASS_WORKER_URL
        };
        try {
            onStatus?.('Loading bundled FFmpeg engine…');
            await Promise.all([
                verifyAsset(BUNDLED_MODULE_URL, 'ffmpeg-module'),
                verifyAsset(BUNDLED_CORE_URL, 'ffmpeg-core'),
                verifyAsset(BUNDLED_WASM_URL, 'ffmpeg-wasm'),
                verifyAsset(BUNDLED_CLASS_WORKER_URL, 'ffmpeg-worker')
            ]);

            onStatus?.('Loading FFmpeg module…');
            const module = await withTimeout(import(BUNDLED_MODULE_URL), LOAD_TIMEOUT_MS, details, 'module-load');
            const FFmpeg = module?.FFmpeg;
            if (typeof FFmpeg !== 'function') throw new Error('FFmpeg constructor was not found');

            ffmpeg = new FFmpeg();
            ffmpeg.on('log', data => console.debug('[KEFE FFmpeg]', data?.message || data));
            ffmpeg.on('error', error => console.error('[KEFE FFmpeg error]', error));

            onStatus?.('Starting FFmpeg…');
            await withTimeout(ffmpeg.load({
                coreURL: BUNDLED_CORE_URL,
                wasmURL: BUNDLED_WASM_URL,
                classWorkerURL: BUNDLED_CLASS_WORKER_URL
            }), LOAD_TIMEOUT_MS, details, 'load');

            console.info('[KEFE] FFmpeg runtime loaded', details);
            ffmpeg.__kefeRuntimeURLs = {
                coreURL: BUNDLED_CORE_URL,
                wasmURL: BUNDLED_WASM_URL,
                classWorkerURL: BUNDLED_CLASS_WORKER_URL
            };
            return ffmpeg;
        } catch (error) {
            encoderPromise = null;
            try { ffmpeg?.terminate?.(); } catch {}
            throw error?.name === 'ExportDiagnosticError' ? error : encoderFailure('ENCODER_LOAD', 'load', error, details);
        }
    })();
    return encoderPromise;
}

export function releaseEncoder(encoder) {
    if (encoderPromise) encoderPromise = null;
    try { encoder?.terminate?.(); } catch {}
}

export const ENCODER_VERSIONS = Object.freeze({ ffmpeg: FF_VERSION, core: CORE_VERSION });
