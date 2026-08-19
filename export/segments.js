import { diagnosticError } from './diagnostics.js';

export async function encodeSegment(ffmpeg, { frames, outputName, fps, timeoutMs, onProgress = () => {}, segment = 0 }) {
    const started = performance.now();
    onProgress(`Encoding ${outputName}…`);
    try {
        await Promise.race([
            ffmpeg.exec([
                '-framerate', String(fps), '-start_number', '0', '-i', 'frame_%05d.jpg',
                '-frames:v', String(frames), '-an', '-c:v', 'libx264', '-preset', 'veryfast',
                '-crf', '20', '-pix_fmt', 'yuv420p', '-threads', '1', outputName
            ]),
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Encoding ${outputName} timed out after ${timeoutMs}ms`)), timeoutMs))
        ]);
        return { outputName, frames, elapsedMs: Math.round(performance.now() - started) };
    } catch (error) {
        throw diagnosticError('ENCODING_VIDEO', 'segments', 'ffmpeg.exec', error, { outputName, frames, fps, segment, elapsedMs: Math.round(performance.now() - started) });
    }
}