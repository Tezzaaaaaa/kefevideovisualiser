import { loadEncoder, ENCODER_VERSIONS } from './encoder.js';
import { createFrameRenderer } from './renderer.js';
import { encodeSegment } from './segments.js';
import { muxAudio } from './muxer.js';
import { createExportProgress } from './progress.js';
import { cleanupEncoder } from './cleanup.js';
import { ExportError, EXPORT_STAGES } from './errors.js';
import { runExportPreflight, diagnosticError } from './diagnostics.js';
import { createExportReport } from './report.js';

function preflightFailure(stage, result) {
    return diagnosticError(stage, 'preflight', result.failed.name, new Error(result.failed.error || `Preflight check failed: ${result.failed.name}`), { checks: result.results });
}

export async function exportVideo({ state, media, config, createCanvas, renderFrame, buildFilename, onProgress, onDiagnostic, signal }) {
    const progress = createExportProgress(onProgress);
    const startedAt = Date.now();
    let encoder;
    let preflight = null;
    let failure = null;
    const files = new Set();
    let stage = EXPORT_STAGES.VALIDATING;
    const report = () => createExportReport({ preflight, diagnostic: failure, versions: ENCODER_VERSIONS, startedAt, finishedAt: Date.now() });

    try {
        progress.update(stage, 0, 'Running export preflight…');
        preflight = await runExportPreflight({ state, audio: state?.audio?.file, canvas: createCanvas?.(1, 1), skipEncoder: true });
        if (!preflight.ok) throw preflightFailure(stage, preflight);
        const duration = Number(state.audio.duration || media?.audio?.duration || 0);
        if (!duration) throw diagnosticError(stage, 'preflight', 'AUDIO_DURATION', new Error('Could not determine audio duration'));

        stage = EXPORT_STAGES.LOADING_ENCODER;
        progress.update(stage, 5, 'Loading frame-accurate encoder…');
        encoder = await loadEncoder({
            onProgress: (message, percent) => {
                // Keep encoder loading inside the single overall export progress bar.
                progress.update(stage, 5 + Math.max(0, Math.min(100, percent)) * 0.20, message);
            }
        });
        const encoderCheck = await runExportPreflight({ state, audio: state.audio.file, canvas: createCanvas(config.width, config.height), encoder });
        if (!encoderCheck.ok) throw preflightFailure(stage, encoderCheck);

        if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
        const canvas = createCanvas(config.width, config.height);
        const renderer = createFrameRenderer({ canvas, renderFrame, width: config.width, height: config.height });
        const totalFrames = Math.max(1, Math.ceil(duration * config.fps));
        // Longer segments reduce repeated FFmpeg startup/teardown overhead while keeping browser memory bounded.
        const framesPerSegment = Math.max(config.fps, Math.floor(config.fps * 8));
        const segmentCount = Math.ceil(totalFrames / framesPerSegment);
        const segments = [];

        for (let segment = 0; segment < segmentCount; segment++) {
            stage = EXPORT_STAGES.RENDERING_FRAMES;
            const first = segment * framesPerSegment;
            const count = Math.min(framesPerSegment, totalFrames - first);
            const frameNames = [];
            for (let local = 0; local < count; local++) {
                if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
                const frameName = `frame_${String(local).padStart(5, '0')}.jpg`;
                try {
                    const bytes = await renderer.render((first + local) / config.fps);
                    await encoder.writeFile(frameName, bytes);
                } catch (error) {
                    throw diagnosticError(stage, 'renderer', 'renderFrame', error, { segment: segment + 1, segmentCount, frame: first + local + 1, totalFrames });
                }
                files.add(frameName); frameNames.push(frameName);
                progress.update(stage, 25 + ((first + local + 1) / totalFrames) * 50, `Rendering segment ${segment + 1} of ${segmentCount}…`);
            }
            stage = EXPORT_STAGES.ENCODING_VIDEO;
            const segmentName = `segment_${String(segment).padStart(4, '0')}.mp4`;
            await encodeSegment(encoder, {
                frames: count,
                outputName: segmentName,
                fps: config.fps,
                timeoutMs: Math.max(120000, count * 2500),
                segment: segment + 1,
                onProgress: message => progress.update(stage, 75, message)
            });
            files.add(segmentName); segments.push(segmentName);
            for (const file of frameNames) { try { await encoder.deleteFile(file); } catch {} files.delete(file); }
        }

        stage = EXPORT_STAGES.MUXING_AUDIO;
        const ext = /\.([a-z0-9]+)$/i.exec(state.audio.file.name || '')?.[1] || 'mp3';
        const audioName = `audio_input.${ext.toLowerCase()}`;
        const outputName = 'kefe-output.mp4';
        try { await encoder.writeFile(audioName, new Uint8Array(await state.audio.file.arrayBuffer())); }
        catch (error) { throw diagnosticError(stage, 'audio', 'writeFile', error, { audioName }); }
        files.add(audioName); files.add('segments.txt'); files.add(outputName);
        await muxAudio(encoder, { segments, audioName, outputName, timeoutMs: Math.max(120000, duration * 10000), onProgress: message => progress.update(stage, 90, message) });

        stage = EXPORT_STAGES.FINALISING;
        let data;
        try { data = await encoder.readFile(outputName); }
        catch (error) { throw diagnosticError(stage, 'encoder', 'readFile', error, { outputName }); }
        if (!data?.byteLength) throw diagnosticError(stage, 'encoder', 'validateOutput', new Error('Encoder produced an empty MP4'), { outputName });
        progress.update(EXPORT_STAGES.COMPLETE, 100, 'Export complete');
        return { blob: new Blob([data.buffer], { type: 'video/mp4' }), filename: buildFilename('mp4'), versions: ENCODER_VERSIONS };
    } catch (error) {
        failure = error?.name === 'AbortError' ? error : error?.name === 'ExportDiagnosticError' ? error : new ExportError(stage, error?.message || 'Export failed', error);
        const diagnosticReport = report();
        try { onDiagnostic?.(diagnosticReport); } catch {}
        console.error('[KEFE EXPORT DIAGNOSTIC]', diagnosticReport);
        throw failure;
    } finally {
        await cleanupEncoder(encoder, [...files]);
    }
}