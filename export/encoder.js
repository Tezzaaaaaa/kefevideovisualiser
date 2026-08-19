const FF_VERSION = '0.12.10';
const CORE_VERSION = '0.12.6';
const UTIL_VERSION = '0.12.2';

export async function loadEncoder({ onProgress = () => {} } = {}) {
    const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
        import(`https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@${FF_VERSION}/dist/esm/index.js`),
        import(`https://cdn.jsdelivr.net/npm/@ffmpeg/util@${UTIL_VERSION}/dist/esm/index.js`)
    ]);
    const ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => console.debug('[KEFE FFmpeg]', message));
    const base = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`;
    onProgress('Loading encoder core…', 5);
    const coreURL = await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript');
    onProgress('Loading encoder WASM…', 15);
    const wasmURL = await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm');
    try {
        onProgress('Starting frame-accurate encoder…', 25);
        await ffmpeg.load({ coreURL, wasmURL });
    } finally {
        URL.revokeObjectURL(coreURL);
        URL.revokeObjectURL(wasmURL);
    }
    return ffmpeg;
}

export const ENCODER_VERSIONS = Object.freeze({ ffmpeg: FF_VERSION, core: CORE_VERSION, util: UTIL_VERSION });
