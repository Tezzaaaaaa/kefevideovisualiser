export async function cleanupEncoder(encoder, files = []) {
    if (!encoder) return;
    for (const file of files) {
        try { await encoder.deleteFile(file); } catch {}
    }
    try { await encoder.terminate(); } catch {}
}
