import { loadEncoder, ENCODER_VERSIONS } from './encoder.js';
import { createFrameRenderer } from './renderer.js';
import { encodeSegment } from './segments.js';
import { muxAudio } from './muxer.js';
import { createExportProgress } from './progress.js';
import { cleanupEncoder } from './cleanup.js';
import { ExportError, EXPORT_STAGES } from './errors.js';

export async function exportVideo({ state, media, config, createCanvas, renderFrame, buildFilename, onProgress, signal }) {
    const progress = createExportProgress(onProgress);
    let encoder;
    const files = new Set();
    try {
        progress.update(EXPORT_STAGES.VALIDATING, 0, 'Validating export…');
        if (!state?.audio?.file) throw new ExportError(EXPORT_STAGES.VALIDATING, 'Audio file is required');
        const duration = Number(state.audio.duration || media?.audio?.duration || 0);
        if (!duration) throw new ExportError(EXPORT_STAGES.VALIDATING, 'Could not determine audio duration');

        progress.update(EXPORT_STAGES.LOADING_ENCODER, 5, 'Loading frame-accurate encoder…');
        encoder = await loadEncoder({ onProgress: (message, percent) => progress.update(EXPORT_STAGES.LOADING_ENCODER, percent, message) });

        if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
        const canvas = createCanvas(config.width, config.height);
        const renderer = createFrameRenderer({ canvas, renderFrame: (ctx, w, h, time) => renderFrame(ctx, w, h, time), width: config.width, height: config.height });
        const totalFrames = Math.max(1, Math.ceil(duration * config.fps));
        const framesPerSegment = Math.max(config.fps, Math.floor(config.fps * 4));
        const segmentCount = Math.ceil(totalFrames / framesPerSegment);
        const segments = [];

        for (let segment = 0; segment < segmentCount; segment++) {
            const first = segment * framesPerSegment;
            const count = Math.min(framesPerSegment, totalFrames - first);
            const frameNames = [];
            progress.update(EXPORT_STAGES.RENDERING_FRAMES, 25 + (first / totalFrames) * 50, `Rendering segment ${segment + 1} of ${segmentCount}…`);
            for (let local = 0; local < count; local++) {
                if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
                const frameName = `frame_${String(local).padStart(5, '0')}.jpg`;
                const bytes = await renderer.render((first + local) / config.fps);
                await encoder.writeFile(frameName, bytes);
                files.add(frameName);
                frameNames.push(frameName);
                progress.update(EXPORT_STAGES.RENDERING_FRAMES, 25 + ((first + local + 1) / totalFrames) * 50, `Rendering segment ${segment + 1} of ${segmentCount}…`);
            }
            const segmentName = `segment_${String(segment).padStart(4, '0')}.mp4`;
            await encodeSegment(encoder, { frames: count, outputName: segmentName, fps: config.fps, timeoutMs: Math.max(120000, count * 2500), onProgress: message => progress.update(EXPORT_STAGES.ENCODING_VIDEO, 75, message) });
            files.add(segmentName);
            segments.push(segmentName);
            for (const file of frameNames) { try { await encoder.deleteFile(file); } catch {} files.delete(file); }
        }

        const ext = /\.([a-z0-9]+)$/i.exec(state.audio.file.name || '')?.[1] || 'mp3';
        const audioName = `audio_input.${ext.toLowerCase()}`;
        const outputName = 'kefe-output.mp4';
        await encoder.writeFile(audioName, new Uint8Array(await state.audio.file.arrayBuffer()));
        files.add(audioName);
        files.add('segments.txt');
        files.add(outputName);
        await muxAudio(encoder, { segments, audioName, outputName, timeoutMs: Math.max(120000, duration * 10000), onProgress: message => progress.update(EXPORT_STAGES.MUXING_AUDIO, 90, message) });
        const data = await encoder.readFile(outputName);
        if (!data?.byteLength) throw new ExportError(EXPORT_STAGES.FINALISING, 'Encoder produced an empty MP4');
        progress.update(EXPORT_STAGES.COMPLETE, 100, 'Export complete');
        return { blob: new Blob([data.buffer], { type: 'video/mp4' }), filename: buildFilename('mp4'), versions: ENCODER_VERSIONS };
    } catch (error) {
        if (error instanceof ExportError) throw error;
        if (error?.name === 'AbortError') throw error;
        throw new ExportError(EXPORT_STAGES.ENCODING_VIDEO, error?.message || 'Export failed', error);
    } finally {
        await cleanupEncoder(encoder, [...files]);
    }
}
