import { exportVideo, getExportConfig } from './index.js';

const $ = id => document.getElementById(id);

function replaceButton(id) {
    const current = $(id);
    if (!current) return null;
    const replacement = current.cloneNode(true);
    current.replaceWith(replacement);
    return replacement;
}

// app.js historically owned the export buttons. Replace the DOM nodes before
// attaching the new exporter so the old listeners cannot fire alongside it.
const exportTop = replaceButton('exportBtn');
const exportBottom = replaceButton('exportBottom');
const cancelButton = replaceButton('cancelExport');
const confirmExport = replaceButton('confirmExport');
const closePreflight = replaceButton('closePreflight');
const cancelPreflight = replaceButton('cancelPreflight');

function cleanPart(value) {
    return String(value || '')
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/[. ]+$/g, '')
        .trim();
}

function buildFilename() {
    const audio = window.state?.audio || {};
    const metadata = audio.metadata || {};
    const filename = String(audio.file?.name || '').replace(/\.[^.]+$/, '');
    const fallback = filename.replace(/[_]+/g, ' ').trim();
    const titleInput = cleanPart($('metaTitle')?.value);
    const artistInput = cleanPart($('metaArtist')?.value);
    const title = titleInput || cleanPart(metadata.title) || fallback || 'Lyric Video';
    const artist = artistInput || cleanPart(metadata.artist);
    return `${title}${artist && artist.toLowerCase() !== title.toLowerCase() ? ` - ${artist}` : ''} - KEFE Visualiser.mp4`;
}

function setExportUI(percent, message) {
    const status = $('exportStatus');
    const pct = $('exportPct');
    const progress = $('exportProgress');
    if (status) status.textContent = message || 'Exporting…';
    if (pct) pct.textContent = `${Math.round(percent)}%`;
    if (progress) progress.value = percent;
}

function showOverlay() {
    $('exportOverlay')?.classList.remove('hidden');
}

function hideOverlay(delay = 1200) {
    setTimeout(() => $('exportOverlay')?.classList.add('hidden'), delay);
}

async function seekAndRender(ctx, width, height, time, signal) {
    if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
    const state = window.state;
    const previewCanvas = window.canvas;
    const redraw = window.redrawCurrentPreviewFrame;
    const video = window.kefeMedia?.video;

    if (video && Number.isFinite(video.duration) && video.duration > 0) {
        const target = ((time % video.duration) + video.duration) % video.duration;
        if (Math.abs(video.currentTime - target) > 0.002 || video.seeking || video.readyState < 2) {
            await new Promise((resolve, reject) => {
                let settled = false;
                const cleanup = () => {
                    video.removeEventListener('seeked', done);
                    video.removeEventListener('error', failed);
                    signal?.removeEventListener('abort', cancelled);
                };
                const finish = fn => {
                    if (settled) return;
                    settled = true;
                    cleanup();
                    fn();
                };
                const done = () => finish(resolve);
                const failed = () => finish(() => reject(new Error('Background video seek failed')));
                const cancelled = () => finish(() => reject(new DOMException('Export cancelled', 'AbortError')));
                video.addEventListener('seeked', done, { once: true });
                video.addEventListener('error', failed, { once: true });
                signal?.addEventListener('abort', cancelled, { once: true });
                try { video.currentTime = target; }
                catch (error) { finish(() => reject(error)); }
            });
        }
    }

    if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
    state.playback.currentTime = time;
    redraw();
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(previewCanvas, 0, 0, width, height);
}

async function runExport() {
    const state = window.state;
    if (!state?.audio?.file) throw new Error('No audio loaded');
    if (!Number.isFinite(Number(state.audio.duration)) || Number(state.audio.duration) <= 0) throw new Error('Audio duration is unavailable');
    if (!Array.isArray(state.lyrics?.lines) || !state.lyrics.lines.length) throw new Error('No synced lyrics loaded');
    if (typeof window.redrawCurrentPreviewFrame !== 'function') throw new Error('KEFE preview renderer is not connected');

    const preset = $('exportPreset')?.value || '720p';
    const config = getExportConfig(preset, state.aspect || '9:16');
    const target = document.createElement('canvas');
    target.width = config.width;
    target.height = config.height;

    const result = await exportVideo({
        state,
        media: window.kefeMedia || {},
        config,
        signal: window.kefeExportAbort?.signal,
        buildFilename,
        onProgress: ({ percent, message }) => setExportUI(percent, message),
        renderFrame: async (ctx, width, height, time) => {
            await seekAndRender(ctx, width, height, time, window.kefeExportAbort?.signal);
        }
    });
    return result;
}

async function startExport() {
    if (window.isExporting) return;
    window.isExporting = true;
    window.kefeExportAbort = new AbortController();
    const previewTime = Number(window.state?.playback?.currentTime) || 0;
    const audio = window.state?.audio;
    showOverlay();
    setExportUI(0, 'Preparing FFmpeg export…');
    if (cancelButton) cancelButton.textContent = 'Cancel';

    try {
        const result = await runExport();
        const url = URL.createObjectURL(result.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        setExportUI(100, 'Export complete');
    } catch (error) {
        if (error?.name === 'AbortError') {
            setExportUI(0, 'Export cancelled');
        } else {
            console.error('[KEFE] FFmpeg export failed:', error);
            setExportUI(0, `Export failed: ${error?.message || error}`);
        }
    } finally {
        if (audio && Number.isFinite(audio.duration)) {
            window.state.playback.currentTime = Math.min(previewTime, audio.duration);
        }
        if (window.kefeMedia?.video && Number.isFinite(window.kefeMedia.video.duration)) {
            try {
                const video = window.kefeMedia.video;
                video.pause();
                if (video.duration > 0) video.currentTime = ((previewTime % video.duration) + video.duration) % video.duration;
            } catch {}
        }
        window.kefeExportAbort = null;
        window.isExporting = false;
        if (cancelButton) cancelButton.textContent = 'Close';
        hideOverlay();
        try { window.redrawCurrentPreviewFrame?.(); } catch {}
    }
}

function closePreflightModal() {
    $('exportPreflight')?.classList.add('hidden');
}

exportTop?.addEventListener('click', startExport);
exportBottom?.addEventListener('click', startExport);
cancelButton?.addEventListener('click', () => {
    if (window.isExporting) window.kefeExportAbort?.abort();
    else $('exportOverlay')?.classList.add('hidden');
});
confirmExport?.addEventListener('click', () => {
    closePreflightModal();
    startExport();
});
closePreflight?.addEventListener('click', closePreflightModal);
cancelPreflight?.addEventListener('click', closePreflightModal);

// Prevent the legacy app.js keyboard shortcut from starting its old exporter.
document.addEventListener('keydown', event => {
    if ((event.key === 'e' || event.key === 'E') && !['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        startExport();
    }
}, true);

window.startOfflineExport = startExport;
window.kefeCancelExport = () => window.kefeExportAbort?.abort();
console.info('[KEFE] Integrated FFmpeg exporter loaded');
