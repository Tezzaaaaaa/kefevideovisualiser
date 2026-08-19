export function createFrameRenderer({ canvas, renderFrame, width, height }) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not create export canvas');

    return {
        async render(time) {
            await renderFrame(ctx, width, height, time);
            const blob = await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Could not encode rendered frame')), 'image/jpeg', 0.9));
            return new Uint8Array(await blob.arrayBuffer());
        },
        context: ctx
    };
}
