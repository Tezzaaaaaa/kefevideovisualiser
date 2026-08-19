export async function toBlobURL(url, mimeType) {
    const cdnUrl = String(url).replace(/^.*\/vendor\/core\/?/, 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/');
    const response = await fetch(cdnUrl, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`FFmpeg core download failed (${response.status})`);
    const blob = await response.blob();
    return URL.createObjectURL(new Blob([blob], { type: mimeType }));
}
