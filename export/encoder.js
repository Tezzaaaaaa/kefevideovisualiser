const FF_VERSION = '0.12.10';
const CORE_VERSION = '0.12.10';
const UTIL_VERSION = '0.12.2';
const LOAD_TIMEOUT_MS = 30000;

// KEFE is a static browser app, so the FFmpeg runtime must be reachable at
// runtime. The old implementation pointed at vendor/, but vendor/ is ignored
// by git and those files were never deployed. Use the pinned official package
// artifacts instead and keep all version numbers locked together here.
const REMOTE = {
    ffmpeg: `https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@${FF_VERSION}/dist/esm/index.js`,
    util: `https://cdn.jsdelivr.net/npm/@ffmpeg/util@${UTIL_VERSION}/dist/esm/index.js`,
    core: `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm/ffmpeg-core.js`,
    wasm: `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm/ffmpeg-core.wasm`,
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
    try {
        const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
            import(REMOTE.ffmpeg),
            import(REMOTE.util)
        ]);
        return { FFmpeg, toBlobURL, source: 'jsdelivr' };
    } catch (error) {
        throw encoderFailure('ENCODER_MODULES', 'loadModules', error, {
            source: 'jsdelivr',
            ffmpeg: FF_VERSION,
            util: UTIL_VERSION,
            ffmpegURL: REMOTE.ffmpeg,
            utilURL: REMOTE.util
        });
    }
}

export async function loadEncoder() {
    if (encoderPromise) return encoderPromise;
    encoderPromise = (async () => {
        const details = {
            ffmpeg: FF_VERSION,
            core: CORE_VERSION,
            util: UTIL_VERSION,
            source: 'jsdelivr',
            ffmpegURL: REMOTE.ffmpeg,
            utilURL: REMOTE.util,
            coreURL: REMOTE.core,
            wasmURL: REMOTE.wasm,
            workerURL: REMOTE.worker
        };
        let logs = [];
        let ffmpeg = null;
        try {
            const { FFmpeg, toBlobURL } = await loadFFmpegModules();
            ffmpeg = new FFmpeg();
            ffmpeg.on('log', ({ message }) => {
                logs.push(message);
                if (logs.length > 100) logs.shift();
                console.debug('[KEFE FFmpeg]', message);
            });
            ffmpeg.on('progress', ({ progress, time }) => console.debug('[KEFE FFmpeg progress]', progress, time));

            // Fetch the core and worker through the pinned CDN URLs and turn
            // them into same-origin blob URLs for the FFmpeg worker.
            const coreURL = await toBlobURL(REMOTE.core, 'text/javascript');
            const wasmURL = await toBlobURL(REMOTE.wasm, 'application/wasm');
            const workerURL = await toBlobURL(REMOTE.worker, 'text/javascript');

            await withTimeout(
                ffmpeg.load({ coreURL, wasmURL, classWorkerURL: workerURL }),
                LOAD_TIMEOUT_MS,
                { ...details, lastLogs: logs.slice(-20) }
            );

            console.info('[KEFE] FFmpeg runtime loaded', {
                ffmpeg: FF_VERSION,
                core: CORE_VERSION,
                util: UTIL_VERSION,
                source: 'jsdelivr'
            });
            return ffmpeg;
        } catch (error) {
            encoderPromise = null;
            try { ffmpeg?.terminate?.(); } catch {}
            const diagnostic = error?.name === 'ExportDiagnosticError'
                ? error
                : encoderFailure('ENCODER_LOAD', 'load', error, { ...details, lastLogs: logs.slice(-20) });
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
