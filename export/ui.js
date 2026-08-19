import { exportVideo } from './index.js';

const $ = id => document.getElementById(id);
const PRESETS = Object.freeze({
    '1080p': { width: 1080, height: 1920, fps: 30 },
    '720p': { width: 720, height: 1280, fps: 30 },
    '480p': { width: 480, height: 854, fps: 30 },
    instagram: { width: 1080, height: 1920, fps: 30 },
    tiktok: { width: 1080, height: 1920, fps: 30 }
});

function getConfig(preset) { return PRESETS[preset] || PRESETS['720p']; }
function buildFilename(ext) {
    const clean = value => String(value || '').trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ');
    return `${clean(window.state.audio.metadata.title) || 'Untitled'} - ${clean(window.state.audio.metadata.artist) || 'Unknown Artist'} - KEFE Visualiser.${ext}`;
}
function updateUI(stage, percent, message) {
    const status = $('exportStatus');
    const pct = $('exportPct');
    const progress = $('exportProgress');
    if (status) status.textContent = message || stage;
    if (pct) pct.textContent = `${Math.round(percent)}%`;
    if (progress) progress.value = percent;
}
function seekVideo(video, time, signal) {
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return Promise.resolve();
    if (signal?.aborted) return Promise.reject(new DOMException('Export cancelled', 'AbortError'));
    const target = Math.max(0, Math.min(video.duration, time));
    if (Math.abs(video.currentTime - target) < 0.001) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const cleanup = () => { video.removeEventListener('seeked', done); video.removeEventListener('error', fail); signal?.removeEventListener('abort', cancel); };
        const done = () => { cleanup(); resolve(); };
        const fail = () => { cleanup(); reject(new Error('Background video seek failed')); };
        const cancel = () => { cleanup(); reject(new DOMException('Export cancelled', 'AbortError')); };
        video.addEventListener('seeked', done, { once: true });
        video.addEventListener('error', fail, { once: true });
        signal?.addEventListener('abort', cancel, { once: true });
        try { video.currentTime = target; } catch (error) { cleanup(); reject(error); }
    });
}

async function runExport() {
    const state = window.state;
    const previewCanvas = window.canvas;
    const redraw = window.redrawCurrentPreviewFrame;
    if (!state || !previewCanvas || typeof redraw !== 'function') throw new Error('KEFE export bridge is not available');

    const config = getConfig($('exportPreset')?.value);
    const target = document.createElement('canvas');
    target.width = config.width;
    target.height = config.height;
    const media = window.kefeMedia || {};
    const signal = window.kefeExportAbort?.signal;

    const renderFrame = async (ctx, width, height, time) => {
        await seekVideo(media.video, time, signal);
        state.playback.currentTime = time;
        redraw();
        ctx.drawImage(previewCanvas, 0, 0, width, height);
    };

    const result = await exportVideo({
        state,
        media,
        config,
        createCanvas: () => target,
        renderFrame,
        buildFilename,
        signal,
        onProgress: ({ stage, percent, message }) => updateUI(stage, percent, message)
    });

    const url = URL.createObjectURL(result.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
}

window.startOfflineExport = async () => {
    if (window.isExporting) return;
    window.isExporting = true;
    $('exportOverlay')?.classList.remove('hidden');
    window.kefeExportAbort = new AbortController();
    try {
        await runExport();
        updateUI('COMPLETE', 100, 'Export complete');
    } catch (error) {
        console.error('[KEFE] Export failed:', error);
        updateUI(error.stage || 'EXPORT_ERROR', Number($('exportProgress')?.value || 0), `Export failed: ${error.message || error}`);
    } finally {
        window.isExporting = false;
        window.kefeExportAbort = null;
        setTimeout(() => $('exportOverlay')?.classList.add('hidden'), 1200);
    }
};

$('cancelExport')?.addEventListener('click', () => window.kefeCancelExport?.());
window.kefeCancelExport = () => window.kefeExportAbort?.abort();
console.info('[KEFE] Modular export loaded');
