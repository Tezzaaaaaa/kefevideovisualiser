const FF_VERSION = '0.12.10';
const CORE_VERSION = '0.12.10';
const UTIL_VERSION = '0.12.2';
const LOAD_TIMEOUT_MS = 30000;

// KEFE owns the FFmpeg controller and worker. The browser worker is served
// from this repository; only the pinned single-thread FFmpeg core/wasm are
// fetched at runtime. This avoids the unsupported direct CDN import of
// @ffmpeg/ffmpeg while keeping the large wasm binary out of the repository.
const RUNTIME = {
    worker: new URL('./ffmpeg-worker.js', import.meta.url).href,
    core: `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm/ffmpeg-core.js`,
    wasm: `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm/ffmpeg-core.wasm`
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

function withTimeout(promise, ms, details, operation = 'load') {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(encoderFailure('ENCODER_TIMEOUT', operation, new Error(`FFmpeg ${operation} timed out after ${ms / 1000}s`), details)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function blobURL(url, type) {
    const response = await fetch(url, { mode: 'cors', cache: 'force-cache' });
    if (!response.ok) throw new Error(`FFmpeg runtime request failed: ${response.status} ${response.statusText}`);
    return URL.createObjectURL(new Blob([await response.arrayBuffer()], { type }));
}

class BrowserFFmpeg {
    constructor(runtime) {
        this.runtime = runtime;
        this.worker = new Worker(RUNTIME.worker, { type: 'module' });
        this.nextId = 1;
        this.pending = new Map();
        this.listeners = new Map();
        this.loaded = false;
        this.worker.onmessage = event => this.handleMessage(event.data);
        this.worker.onerror = event => {
            const error = new Error(event.message || 'FFmpeg worker failed');
            for (const pending of this.pending.values()) pending.reject(error);
            this.pending.clear();
            this.emit('error', error);
        };
    }

    on(type, listener) {
        if (!this.listeners.has(type)) this.listeners.set(type, new Set());
        this.listeners.get(type).add(listener);
    }

    off(type, listener) { this.listeners.get(type)?.delete(listener); }

    emit(type, data) {
        for (const listener of this.listeners.get(type) || []) {
            try { listener(data); } catch (error) { console.error('[KEFE FFmpeg listener]', error); }
        }
    }

    handleMessage(message) {
        if (message.type === 'LOG') { this.emit('log', message.data); return; }
        if (message.type === 'PROGRESS') { this.emit('progress', message.data); return; }
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.type === 'ERROR') pending.reject(new Error(message.data || 'FFmpeg worker error'));
        else pending.resolve(message.data);
    }

    request(type, data = {}, timeoutMs = 120000) {
        const id = this.nextId++;
        const promise = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
        this.worker.postMessage({ id, type, data });
        return withTimeout(promise, timeoutMs, { type }, type.toLowerCase());
    }

    async load() {
        if (this.loaded) return;
        await this.request('LOAD', this.runtime, LOAD_TIMEOUT_MS);
        this.loaded = true;
    }

    writeFile(path, data) { return this.request('WRITE_FILE', { path, data }); }
    readFile(path, encoding) { return this.request('READ_FILE', { path, encoding }); }
    deleteFile(path) { return this.request('DELETE_FILE', { path }); }
    rename(oldPath, newPath) { return this.request('RENAME', { oldPath, newPath }); }
    createDir(path) { return this.request('CREATE_DIR', { path }); }
    listDir(path) { return this.request('LIST_DIR', { path }); }
    deleteDir(path) { return this.request('DELETE_DIR', { path }); }
    mount(fsType, options, mountPoint) { return this.request('MOUNT', { fsType, options, mountPoint }); }
    unmount(mountPoint) { return this.request('UNMOUNT', { mountPoint }); }
    exec(args, timeout = 120000) { return this.request('EXEC', { args, timeout }, timeout > 0 ? timeout + 10000 : 120000); }

    terminate() {
        for (const pending of this.pending.values()) pending.reject(new Error('FFmpeg worker terminated'));
        this.pending.clear();
        this.worker.terminate();
        this.listeners.clear();
        this.loaded = false;
    }
}

export async function loadEncoder() {
    if (encoderPromise) return encoderPromise;
    encoderPromise = (async () => {
        let encoder = null;
        let coreURL = null;
        let wasmURL = null;
        const details = { ffmpeg: FF_VERSION, core: CORE_VERSION, util: UTIL_VERSION, workerURL: RUNTIME.worker, coreURL: RUNTIME.core, wasmURL: RUNTIME.wasm };
        try {
            // Make same-origin blob URLs before the worker starts. This avoids
            // cross-origin module/wasm loading problems inside the worker.
            [coreURL, wasmURL] = await Promise.all([
                blobURL(RUNTIME.core, 'text/javascript'),
                blobURL(RUNTIME.wasm, 'application/wasm')
            ]);
            encoder = new BrowserFFmpeg({ coreURL, wasmURL });
            await encoder.load();
            console.info('[KEFE] FFmpeg runtime loaded', details);
            return encoder;
        } catch (error) {
            encoderPromise = null;
            try { encoder?.terminate(); } catch {}
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
    const runtime = encoder?.runtime;
    try { encoder?.terminate?.(); } catch {}
    try { if (runtime?.coreURL) URL.revokeObjectURL(runtime.coreURL); } catch {}
    try { if (runtime?.wasmURL) URL.revokeObjectURL(runtime.wasmURL); } catch {}
}

export const ENCODER_VERSIONS = Object.freeze({ ffmpeg: FF_VERSION, core: CORE_VERSION, util: UTIL_VERSION });
