import { loadEncoder, releaseEncoder } from './encoder.js';

function abortError() { return new DOMException('Export cancelled', 'AbortError'); }
function checkAbort(signal) { if (signal?.aborted) throw abortError(); }
function timeout(ms, message) { return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)); }

async function seekVideo(video, time, signal) {
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    checkAbort(signal);
    const duration = video.duration;
    const target = ((time % duration) + duration) % duration;
    if (Math.abs(video.currentTime - target) < 0.002 && video.readyState >= 2 && !video.seeking) return;
    await Promise.race([
        new Promise((resolve, reject) => {
            let settled = false;
            const cleanup = () => { video.removeEventListener('seeked', done); video.removeEventListener('error', failed); signal?.removeEventListener('abort', cancelled); };
            const finish = fn => { if (settled) return; settled = true; cleanup(); fn(); };
            const done = () => finish(resolve);
            const failed = () => finish(() => reject(new Error('Background video seek failed')));
            const cancelled = () => finish(() => reject(abortError()));
            video.addEventListener('seeked', done, { once: true });
            video.addEventListener('error', failed, { once: true });
            signal?.addEventListener('abort', cancelled, { once: true });
            try { video.currentTime = target; } catch (error) { finish(() => reject(error)); }
        }),
        timeout(10000, `Background video seek timed out at ${target.toFixed(3)}s`)
    ]);
}

async function canvasToJpeg(canvas) {
    const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Could not encode rendered frame')), 'image/jpeg', 0.92));
    return new Uint8Array(await blob.arrayBuffer());
}

async function execChecked(ffmpeg, args, label) {
    const code = await ffmpeg.exec(args);
    if (Number(code) !== 0) throw new Error(`FFmpeg ${label} failed with exit code ${code}`);
    return code;
}

function progress(onProgress, value, message) { onProgress?.({ percent: Math.max(0, Math.min(100, value)), message }); }

export function getExportConfig(preset = '720p', aspect = '9:16') {
    const presets = { '1080p': { size: 1080, fps: 30 }, '720p': { size: 720, fps: 30 }, '480p': { size: 480, fps: 24 }, instagram: { size: 1080, fps: 30, forceVertical: true }, tiktok: { size: 1080, fps: 30, forceVertical: true } };
    const selected = presets[preset] || presets['720p'];
    const selectedAspect = selected.forceVertical ? '9:16' : aspect;
    const [a, b] = selectedAspect.split(':').map(Number);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) throw new Error('Invalid export aspect ratio');
    const size = selected.size;
    if (selectedAspect === '16:9') return { width: Math.round(size * 16 / 9), height: size, fps: selected.fps };
    if (selectedAspect === '1:1') return { width: size, height: size, fps: selected.fps };
    return { width: size, height: Math.round(size * b / a), fps: selected.fps };
}

export async function exportVideo({ state, media, config, renderFrame, buildFilename, signal, onProgress }) {
    if (!state?.audio?.file) throw new Error('No audio loaded');
    const duration = Number(state.audio.duration);
    if (!Number.isFinite(duration) || duration <= 0) throw new Error('Audio duration is unavailable');
    if (!config?.width || !config?.height || !config?.fps) throw new Error('Export configuration is invalid');
    if (typeof renderFrame !== 'function') throw new Error('Export renderer is not connected');

    const target = document.createElement('canvas');
    target.width = config.width;
    target.height = config.height;
    const ctx = target.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not create export canvas');

    const totalFrames = Math.max(1, Math.ceil(duration * config.fps));
    const framesPerSegment = Math.max(config.fps * 2, Math.round(config.fps * 4));
    const segmentChunks = [];
    let combinedSegmentBytes = 0;
    let ffmpeg = null;
    let progressHandler = null;

    try {
        const segmentCount = Math.ceil(totalFrames / framesPerSegment);
        for (let segment = 0; segment < segmentCount; segment++) {
            checkAbort(signal);
            progress(onProgress, 4 + (segment / segmentCount) * 66, `Loading encoder for segment ${segment + 1} of ${segmentCount}…`);
            ffmpeg = await loadEncoder(message => progress(onProgress, 4 + (segment / segmentCount) * 66, message));

            const firstFrame = segment * framesPerSegment;
            const frameCount = Math.min(framesPerSegment, totalFrames - firstFrame);
            const frameNames = [];
            try {
                for (let local = 0; local < frameCount; local++) {
                    checkAbort(signal);
                    const frameIndex = firstFrame + local;
                    const time = frameIndex / config.fps;
                    await seekVideo(media?.video, time, signal);
                    await renderFrame(ctx, config.width, config.height, time);
                    const frameName = `kefe-frame-${String(local).padStart(5, '0')}.jpg`;
                    await ffmpeg.writeFile(frameName, await canvasToJpeg(target));
                    frameNames.push(frameName);
                    progress(onProgress, 5 + ((frameIndex + 1) / totalFrames) * 65, `Rendering frame ${frameIndex + 1} of ${totalFrames}`);
                }

                const segmentName = `kefe-segment-${String(segment).padStart(4, '0')}.ts`;
                progress(onProgress, 5 + ((firstFrame + frameCount) / totalFrames) * 65, `Encoding segment ${segment + 1} of ${segmentCount}…`);
                await execChecked(ffmpeg, ['-framerate', String(config.fps), '-start_number', '0', '-i', 'kefe-frame-%05d.jpg', '-frames:v', String(frameCount), '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(config.fps), '-g', String(config.fps * 2), '-keyint_min', String(config.fps * 2), '-sc_threshold', '0', '-f', 'mpegts', '-y', segmentName], `segment ${segment + 1}`);
                const segmentData = new Uint8Array(await ffmpeg.readFile(segmentName));
                if (!segmentData.byteLength) throw new Error(`FFmpeg produced an empty segment ${segment + 1}`);
                segmentChunks.push(segmentData);
                combinedSegmentBytes += segmentData.byteLength;
                progress(onProgress, 70 + ((segment + 1) / segmentCount) * 10, `Encoded segment ${segment + 1} of ${segmentCount}`);
            } finally {
                for (const frameName of frameNames) { try { await ffmpeg.deleteFile(frameName); } catch {} }
                try { await ffmpeg.deleteFile(`kefe-segment-${String(segment).padStart(4, '0')}.ts`); } catch {}
                releaseEncoder(ffmpeg);
                ffmpeg = null;
            }
        }

        checkAbort(signal);
        if (!combinedSegmentBytes) throw new Error('No video segments were produced');

        progress(onProgress, 81, 'Loading final muxer…');
        ffmpeg = await loadEncoder(message => progress(onProgress, 81, message));
        const audioExt = /\.([a-z0-9]+)$/i.exec(state.audio.file.name || '')?.[1]?.toLowerCase() || 'audio';
        const audioName = `kefe-audio.${audioExt}`;
        await ffmpeg.writeFile(audioName, new Uint8Array(await state.audio.file.arrayBuffer()));

        const combinedTs = new Uint8Array(combinedSegmentBytes);
        let offset = 0;
        for (const chunk of segmentChunks) { combinedTs.set(chunk, offset); offset += chunk.byteLength; }
        segmentChunks.length = 0;
        const concatInputName = 'kefe-video.ts';
        await ffmpeg.writeFile(concatInputName, combinedTs);

        progress(onProgress, 82, 'Joining rendered video');
        const outputName = 'kefe-final.mp4';
        progressHandler = ({ progress: ffProgress }) => { if (Number.isFinite(ffProgress)) progress(onProgress, 82 + Math.max(0, Math.min(1, ffProgress)) * 18, 'Finalising MP4'); };
        ffmpeg.on('progress', progressHandler);
        try {
            await execChecked(ffmpeg, ['-i', concatInputName, '-i', audioName, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-af', 'aresample=async=1:first_pts=0', '-t', duration.toFixed(3), '-movflags', '+faststart', '-y', outputName], 'final MP4');
        } finally {
            ffmpeg.off('progress', progressHandler);
            progressHandler = null;
        }

        checkAbort(signal);
        const data = await ffmpeg.readFile(outputName);
        if (!data?.byteLength || data.byteLength < 1024) throw new Error('FFmpeg produced an empty MP4');
        progress(onProgress, 100, 'Export complete');
        return { blob: new Blob([data], { type: 'video/mp4' }), filename: buildFilename?.() || 'KEFE Visualiser.mp4' };
    } finally {
        if (progressHandler && ffmpeg) { try { ffmpeg.off('progress', progressHandler); } catch {} }
        if (ffmpeg) releaseEncoder(ffmpeg);
        segmentChunks.length = 0;
    }
}
