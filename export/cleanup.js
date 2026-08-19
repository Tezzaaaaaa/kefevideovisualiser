import { releaseEncoder } from './encoder.js';

export async function cleanupEncoder(encoder, files = []) {
    if (!encoder) return;
    for (const file of files) {
        try { await encoder.deleteFile(file); } catch {}
    }
    releaseEncoder(encoder);
}