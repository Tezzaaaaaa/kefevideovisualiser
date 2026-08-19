const FF_VERSION = '0.12.10';
const CORE_VERSION = '0.12.10';
const UTIL_VERSION = '0.12.2';
const CDN = 'https://cdn.jsdelivr.net/npm';

let encoderPromise = null;

export async function loadEncoder({ onProgress = () => {} } = {}) {
    if (encoderPromise) return encoderPromise;
    encoderPromise = (async () => {
        try {
            onProgress('Loading encoder…', 2);
            const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
                import(`${CDN}/@ffmpeg/ffmpeg@${FF_VERSION}/dist/esm/index.js`),
                import(`${CDN}/@ffmpeg/util@${UTIL_VERSION}/dist/esm/index.js`)
            ]);
            const ffmpeg = new FFmpeg();
            ffmpeg.on('log', ({ message }) => console.debug('[KEFE FFmpeg]', message));
            ffmpeg.on('progress', ({ progress, time }) => console.debug('[KEFE FFmpeg progress]', progress, time));
            const base = `${CDN}/@ffmpeg/core@${CORE_VERSION}/dist/esm`;
            onProgress('Loading encoder core…', 5);
            const coreURL = await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript');
            onProgress('Loading encoder WASM…', 15);
            const wasmURL = await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm');
            onProgress('Starting frame-accurate encoder…', 25);
            await ffmpeg.load({ coreURL, wasmURL });
            onProgress('Encoder ready', 100);
            return ffmpeg;
        } catch (error) {
            encoderPromise = null;
            console.error('[KEFE] FFmpeg initialization failed', error);
            throw new Error(`FFmpeg initialization failed: ${error?.message || String(error)}`);
        }
    })();
    return encoderPromise;
}

export const ENCODER_VERSIONS = Object.freeze({ ffmpeg: FF_VERSION, core: CORE_VERSION, util: UTIL_VERSION });
