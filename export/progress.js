export function createExportProgress(onProgress = () => {}) {
    return {
        update(stage, percent, message = stage) {
            onProgress({ stage, percent: Math.max(0, Math.min(100, percent)), message });
        }
    };
}
