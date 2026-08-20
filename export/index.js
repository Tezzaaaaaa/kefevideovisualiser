export async function exportVideo({ canvas, audioFile, fps = 30, duration, ffmpeg, filename, onProgress = () => {} }) {
    if (!ffmpeg) throw new Error('FFmpeg is not loaded');
    if (!canvas) throw new Error('Export canvas is missing');
    if (!audioFile) throw new Error('Audio file is missing');
    if (!Number.isFinite(duration) || duration <= 0) throw new Error('Invalid export duration');

    const frameCount = Math.ceil(duration * fps);
    const audioName = 'input-audio';
    const outputName = filename || 'KEFE Visualiser.mp4';

    await ffmpeg.writeFile(audioName, new Uint8Array(await audioFile.arrayBuffer()));

    for (let i = 0; i < frameCount; i++) {
        const blob = await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Failed to encode export frame')), 'image/jpeg', 0.92));
        await ffmpeg.writeFile(`frame_${String(i).padStart(5, '0')}.jpg`, new Uint8Array(await blob.arrayBuffer()));
        onProgress((i + 1) / frameCount * 90);
    }

    await ffmpeg.exec([
        '-framerate', String(fps),
        '-i', 'frame_%05d.jpg',
        '-i', audioName,
        '-map', '0:v:0', '-map', '1:a:0',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
        '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
        '-shortest', '-movflags', '+faststart', outputName
    ]);

    onProgress(100);
    const data = await ffmpeg.readFile(outputName);
    return new Blob([data.buffer], { type: 'video/mp4' });
}
