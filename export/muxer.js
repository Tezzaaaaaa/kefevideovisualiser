import { diagnosticError } from './diagnostics.js';

export async function muxAudio(ffmpeg, { segments, audioName, outputName, timeoutMs, onProgress = () => {} }) {
    const concatName = 'segments.txt';
    const started = performance.now();
    try {
        await ffmpeg.writeFile(concatName, new TextEncoder().encode(segments.map(name => `file '${name}'`).join('\n') + '\n'));
        onProgress('Adding audio and finishing MP4…');
        await Promise.race([
            ffmpeg.exec([
                '-f', 'concat', '-safe', '0', '-i', concatName, '-i', audioName,
                '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac',
                '-b:a', '192k', '-shortest', '-movflags', '+faststart', outputName
            ]),
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Final MP4 assembly timed out after ${timeoutMs}ms`)), timeoutMs))
        ]);
        return { outputName, segments: segments.length, elapsedMs: Math.round(performance.now() - started) };
    } catch (error) {
        throw diagnosticError('MUXING_AUDIO', 'muxer', 'ffmpeg.exec', error, { outputName, audioName, segments: segments.length, elapsedMs: Math.round(performance.now() - started) });
    }
}