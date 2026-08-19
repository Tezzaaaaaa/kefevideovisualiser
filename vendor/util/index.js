async function fetchBlobWithProgress(url, mimeType) {
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`FFmpeg core download failed (${response.status})`);
    if (!response.body) {
        const blob = await response.blob();
        return URL.createObjectURL(new Blob([blob], { type: mimeType }));
    }

    const total = Number(response.headers.get('content-length')) || 0;
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
            chunks.push(value);
            received += value.byteLength;
            const pct = total > 0 ? Math.min(100, (received / total) * 100) : null;
            const status = document.getElementById('exportStatus');
            const percent = document.getElementById('exportPct');
            const progress = document.getElementById('exportProgress');
            if (pct !== null && status && percent && progress) {
                status.textContent = `Loading frame-accurate encoder… ${Math.round(pct)}%`;
                percent.textContent = `${Math.round(pct)}%`;
                progress.value = pct;
            }
        }
    }
    return URL.createObjectURL(new Blob(chunks, { type: mimeType }));
}

export async function toBlobURL(url, mimeType) {
    const cdnUrl = String(url).replace(/^.*\/vendor\/core\/?/, 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/');
    return fetchBlobWithProgress(cdnUrl, mimeType);
}
