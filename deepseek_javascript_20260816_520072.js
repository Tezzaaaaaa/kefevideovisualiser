import { $, toast, fmt, linaClamp } from '../core/utils.js';
import { state } from '../state.js';
import { render } from '../core/render.js';
import { wrappedVideoTime } from '../state.js';
import { EXPORT_PRESETS } from '../core/config.js';
import { getExportDimensions } from './preflight.js';
import { buildExportFilename } from '../audio/lyrics.js';
import { ensureEternalFont } from '../effects/eternal.js';

const FFMPEG_VERSION = '0.12.10';
const FFMPEG_CORE_VERSION = '0.12.6';
const FFMPEG_UTIL_VERSION = '0.12.1';

let ffmpegInstance = null;
let ffmpegLoadPromise = null;
let offlineExportActive = false;

export async function loadFFmpegOnce() {
    if (ffmpegInstance) return ffmpegInstance;
    if (!ffmpegLoadPromise) {
        ffmpegLoadPromise = (async () => {
            const localFFmpeg = new URL('./vendor/ffmpeg/index.js', document.baseURI).href;
            let useLocal = false;
            try { 
                useLocal = (await fetch(localFFmpeg, { method: 'HEAD', cache: 'no-store' })).ok; 
            } catch (e) {}
            
            const ffmpegModule = useLocal ? localFFmpeg : `https://unpkg.com/@ffmpeg/ffmpeg@${FFMPEG_VERSION}/dist/esm/index.js`;
            const utilModule = useLocal ? new URL('./vendor/util/index.js', document.baseURI).href : `https://unpkg.com/@ffmpeg/util@${FFMPEG_UTIL_VERSION}/dist/esm/index.js`;
            
            const { FFmpeg } = await import(ffmpegModule);
            const { toBlobURL } = await import(utilModule);
            const ffmpeg = new FFmpeg();
            
            const baseURL = useLocal ? new URL('./vendor/core/', document.baseURI).href.replace(/\/$/, '') : `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`;
            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
            });
            return ffmpeg;
        })();
    }
    try {
        ffmpegInstance = await ffmpegLoadPromise;
        return ffmpegInstance;
    } catch (err) {
        ffmpegLoadPromise = null;
        throw err;
    }
}

export function canvasFrameToUint8Array(cnv, mime, quality) {
    return new Promise((resolve, reject) => {
        cnv.toBlob(blob => {
            if (!blob) { 
                reject(new Error('Could not encode a frame')); 
                return; 
            }
            blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf))).catch(reject);
        }, mime, quality);
    });
}

function guessAudioExtension(file) {
    const nameMatch = /\.([a-z0-9]+)$/i.exec(file?.name || '');
    if (nameMatch) return '.' + nameMatch[1].toLowerCase();
    const type = file?.type || '';
    if (type.includes('mpeg')) return '.mp3';
    if (type.includes('wav')) return '.wav';
    if (type.includes('ogg')) return '.ogg';
    if (type.includes('mp4') || type.includes('m4a') || type.includes('aac')) return '.m4a';
    return '.mp3';
}

function createOffscreenExportCanvas(config) {
    const cnv = document.createElement('canvas');
    cnv.width = config.width;
    cnv.height = config.height;
    cnv.style.position = 'fixed';
    cnv.style.left = '-100000px';
    cnv.style.top = '0';
    cnv.style.width = config.width + 'px';
    cnv.style.height = config.height + 'px';
    cnv.style.maxWidth = 'none';
    cnv.style.maxHeight = 'none';
    cnv.style.minWidth = '0';
    cnv.style.minHeight = '0';
    cnv.style.pointerEvents = 'none';
    cnv.style.opacity = '0';
    cnv.style.border = '0';
    cnv.style.borderRadius = '0';
    cnv.style.boxShadow = 'none';
    document.body.appendChild(cnv);
    return cnv;
}

async function seekVideoForExport(video, targetTime, signal) {
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
    const target = wrappedVideoTime(targetTime, video.duration);
    if (Math.abs(video.currentTime - target) < 0.002 && video.readyState >= 2 && !video.seeking) {
        return;
    }
    await new Promise((resolve, reject) => {
        let settled = false;
        const cleanup = () => {
            video.removeEventListener("seeked", onSeeked);
            video.removeEventListener("error", onError);
            signal?.removeEventListener("abort", onAbort);
        };
        const finish = () => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve();
        };
        const onError = () => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(new Error("Background video seek failed"));
        };
        const onAbort = () => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(new DOMException('Export cancelled', 'AbortError'));
        };
        const onSeeked = () => {
            finish();
        };
        video.addEventListener("seeked", onSeeked, { once: true });
        video.addEventListener("error", onError, { once: true });
        signal?.addEventListener("abort", onAbort, { once: true });
        try {
            video.currentTime = target;
        } catch (error) {
            cleanup();
            reject(error);
        }
    });
}

function restorePreviewAfterExport() {
    if (state.previewRestored) return;
    state.previewRestored = true;
    const audio = $('audio');
    if (audio) {
        audio.currentTime = Math.min(state.previewTimeBeforeExport, audio.duration || 0);
        state.state.playback.currentTime = audio.currentTime || 0;
    }
    if (state.media.video) {
        state.media.video.pause();
        state.media.video.muted = true;
        state.media.video.playbackRate = 1;
        if (Number.isFinite(state.media.video.duration) && state.media.video.duration > 0) {
            state.media.video.currentTime = wrappedVideoTime(audio?.currentTime || 0, state.media.video.duration);
        }
    }
    redrawCurrentPreviewFrame();
}

export async function startOfflineExport() {
    if (state.isExporting || $('exportBtn').disabled) return;

    const audio = $('audio');
    const duration = Number.isFinite(state.state.audio.duration) && state.state.audio.duration > 0
        ? state.state.audio.duration
        : (Number.isFinite(audio?.duration) ? audio.duration : 0);
    if (!duration) { 
        toast('Could not determine audio duration', 'error'); 
        return; 
    }
    if (!state.state.audio.file) { 
        toast('Audio file is needed for frame-accurate export', 'error'); 
        return; 
    }

    const preset = $('exportPreset').value;
    const config = getExportDimensions(preset);
    const totalFrames = Math.max(1, Math.ceil(duration * config.fps));
    const pixelsPerFrame = config.width * config.height;
    const segmentSeconds = pixelsPerFrame > 1500000 ? 2 : 4;
    const framesPerSegment = Math.max(config.fps, Math.floor(config.fps * segmentSeconds));

    state.isExporting = true;
    offlineExportActive = true;
    state.exportCancelled = false;
    state.previewRestored = false;
    state.previewTimeBeforeExport = audio?.currentTime || 0;
    
    if (audio) audio.pause();
    state.exportAbortController = new AbortController();
    
    $('exportPreset').disabled = true;
    $('exportOverlay').classList.remove('hidden');
    $('exportPct').textContent = '0%';
    $('exportProgress').value = 0;
    $('exportStatus').textContent = 'Loading frame-accurate encoder…';

    const exportFiles = new Set();
    const segmentNames = [];
    let ffmpeg = null;
    
    try {
        if (state.state.style.effect === 'eternal') {
            const ready = await ensureEternalFont();
            if (!ready) throw new Error('Homemade Apple font could not be loaded');
        }

        try {
            ffmpeg = await loadFFmpegOnce();
        } catch (loadErr) {
            console.error('ffmpeg.wasm load failed:', loadErr);
            throw new Error('Frame-accurate encoder could not load. Check your connection and browser support, then try again.');
        }
        if (state.exportCancelled || state.exportAbortController.signal.aborted) {
            throw new DOMException('Export cancelled', 'AbortError');
        }

        state.exportCanvas = createOffscreenExportCanvas(config);
        state.exportCtx = state.exportCanvas.getContext('2d', { alpha: false });

        if (state.media.video) { 
            state.media.video.pause(); 
            state.media.video.muted = true; 
            state.media.video.loop = true; 
        }

        const segmentCount = Math.ceil(totalFrames / framesPerSegment);
        for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex++) {
            const firstFrame = segmentIndex * framesPerSegment;
            const segmentFrameCount = Math.min(framesPerSegment, totalFrames - firstFrame);
            const rawFrameNames = [];
            $('exportStatus').textContent = `Rendering segment ${segmentIndex + 1} of ${segmentCount}…`;

            for (let localIndex = 0; localIndex < segmentFrameCount; localIndex++) {
                if (state.exportCancelled || state.exportAbortController.signal.aborted) {
                    throw new DOMException('Export cancelled', 'AbortError');
                }
                const frameIndex = firstFrame + localIndex;
                const frameTime = frameIndex / config.fps;

                if (state.media.video && Number.isFinite(state.media.video.duration) && state.media.video.duration > 0) {
                    await seekVideoForExport(state.media.video, wrappedVideoTime(frameTime, state.media.video.duration), state.exportAbortController.signal);
                }

                state.exportClockTime = frameTime;
                state.state.playback.currentTime = frameTime;
                render(state.exportCtx, config.width, config.height, state.state, state.media);

                const frameName = 'segframe' + String(localIndex).padStart(5, '0') + '.jpg';
                const bytes = await canvasFrameToUint8Array(state.exportCanvas, 'image/jpeg', 0.92);
                await ffmpeg.writeFile(frameName, bytes);
                rawFrameNames.push(frameName);
                exportFiles.add(frameName);

                const renderProgress = (frameIndex + 1) / totalFrames;
                const overall = renderProgress * 75;
                $('exportPct').textContent = Math.round(overall) + '%';
                $('exportProgress').value = overall;
                if (localIndex % 4 === 0) await new Promise(resolve => setTimeout(resolve, 0));
            }

            if (state.exportCancelled || state.exportAbortController.signal.aborted) {
                throw new DOMException('Export cancelled', 'AbortError');
            }
            $('exportStatus').textContent = `Encoding segment ${segmentIndex + 1} of ${segmentCount}…`;
            const segmentName = 'segment' + String(segmentIndex).padStart(4, '0') + '.mp4';
            await ffmpeg.exec([
                '-framerate', String(config.fps),
                '-start_number', '0',
                '-i', 'segframe%05d.jpg',
                '-frames:v', String(segmentFrameCount),
                '-an',
                '-c:v', 'libx264',
                '-pix_fmt', 'yuv420p',
                '-preset', 'veryfast',
                '-crf', '20',
                '-g', String(config.fps * 2),
                segmentName
            ]);
            segmentNames.push(segmentName);
            exportFiles.add(segmentName);

            for (const frameName of rawFrameNames) {
                try { await ffmpeg.deleteFile(frameName); } catch (e) {}
                exportFiles.delete(frameName);
            }
        }

        if (state.exportCancelled || state.exportAbortController.signal.aborted) {
            throw new DOMException('Export cancelled', 'AbortError');
        }

        $('exportStatus').textContent = 'Adding audio and finishing MP4…';
        const audioExt = guessAudioExtension(state.state.audio.file);
        const audioInputName = 'audio_input' + audioExt;
        const audioBytes = new Uint8Array(await state.state.audio.file.arrayBuffer());
        await ffmpeg.writeFile(audioInputName, audioBytes);
        exportFiles.add(audioInputName);

        const concatName = 'segments.txt';
        const concatText = segmentNames.map(name => `file '${name}'`).join('\n') + '\n';
        await ffmpeg.writeFile(concatName, new TextEncoder().encode(concatText));
        exportFiles.add(concatName);

        const outputName = 'output.mp4';
        exportFiles.add(outputName);
        const progressHandler = ({ progress }) => {
            if (!Number.isFinite(progress)) return;
            const overall = 75 + linaClamp(progress) * 25;
            $('exportPct').textContent = Math.round(overall) + '%';
            $('exportProgress').value = overall;
        };
        ffmpeg.on('progress', progressHandler);
        try {
            await ffmpeg.exec([
                '-f', 'concat',
                '-safe', '0',
                '-i', concatName,
                '-i', audioInputName,
                '-map', '0:v:0',
                '-map', '1:a:0',
                '-c:v', 'copy',
                '-c:a', 'aac',
                '-b:a', '192k',
                '-shortest',
                '-movflags', '+faststart',
                outputName
            ]);
        } finally {
            ffmpeg.off('progress', progressHandler);
        }

        if (state.exportCancelled || state.exportAbortController.signal.aborted) {
            throw new DOMException('Export cancelled', 'AbortError');
        }

        const data = await ffmpeg.readFile(outputName);
        if (!data || data.byteLength < 1024) throw new Error('Encoder produced an empty video file');
        const blob = new Blob([data.buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = buildExportFilename('mp4');
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);

        toast('Export complete', 'success');
        $('exportStatus').textContent = 'Done';

    } catch (error) {
        if (error?.name === 'AbortError' || error?.message === 'Export cancelled' || state.exportCancelled) {
            toast('Export cancelled');
        } else {
            console.error('Offline export error:', error);
            toast('Export failed: ' + (error?.message || 'unknown error'), 'error');
            $('exportStatus').textContent = 'Failed: ' + (error?.message || 'unknown error');
        }
    } finally {
        if (ffmpeg) {
            for (const name of exportFiles) {
                try { await ffmpeg.deleteFile(name); } catch (e) {}
            }
            try { await ffmpeg.terminate(); } catch (e) {}
        }
        ffmpegInstance = null;
        ffmpegLoadPromise = null;
        if (state.exportCanvas && state.exportCanvas.isConnected) { 
            try { state.exportCanvas.remove(); } catch(e) {} 
        }
        state.exportCanvas = null;
        state.exportCtx = null;
        state.exportAbortController = null;
        state.isExporting = false;
        offlineExportActive = false;
        state.exportClockTime = null;
        state.exportCancelled = false;
        $('exportPreset').disabled = false;
        setTimeout(() => $('exportOverlay').classList.add('hidden'), 1200);
        restorePreviewAfterExport();
    }
}

export function checkExportCapability() {
    const missing = [];
    if (typeof WebAssembly === 'undefined') missing.push('WebAssembly');
    if (typeof HTMLCanvasElement === 'undefined' || typeof HTMLCanvasElement.prototype.toBlob !== 'function') {
        missing.push('canvas image encoding');
    }
    if (typeof TextEncoder === 'undefined') missing.push('text encoding');
    if (missing.length) {
        toast('This browser is missing: ' + missing.join(', ') + '. MP4 export is unavailable — try a current Chrome, Edge, Firefox, or Safari release.', 'error');
        $('exportBtn').disabled = true;
        $('exportBottom').disabled = true;
        return false;
    }
    return true;
}

import { redrawCurrentPreviewFrame } from '../core/render.js';