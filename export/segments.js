export async function encodeSegment(ffmpeg, { frames, outputName, fps, timeoutMs, onProgress = () => {} }) {
    onProgress(`Encoding ${outputName}…`);
    await Promise.race([
        ffmpeg.exec([
            '-framerate', String(fps),
            '-start_number', '0',
            '-i', 'frame_%05d.jpg',
            '-frames:v', String(frames),
            '-an',
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-crf', '20',
            '-pix_fmt', 'yuv420p',
            '-threads', '1',
            outputName
        ]),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Encoding ${outputName} timed out`)), timeoutMs))
    ]);
    return outputName;
}
