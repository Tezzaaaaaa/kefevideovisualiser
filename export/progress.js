export function createExportProgress(onProgress = () => {}) {
    let lastPercent = 0;
    return {
        update(stage, percent, message = stage) {
            const nextPercent = Math.max(lastPercent, Math.min(100, Number(percent) || 0));
            lastPercent = nextPercent;
            onProgress({ stage, percent: nextPercent, message });
        }
    };
}
