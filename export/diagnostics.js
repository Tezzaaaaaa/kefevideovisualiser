import { EXPORT_STAGES } from './errors.js';

const checks = [
    ['PROJECT_AUDIO', async ({ state }) => Boolean(state?.audio?.file)],
    ['CANVAS', async ({ canvas }) => Boolean(canvas && canvas.width > 0 && canvas.height > 0 && typeof canvas.getContext === 'function')],
    ['AUDIO_INPUT', async ({ audio }) => Boolean(audio && typeof audio.arrayBuffer === 'function')],
    ['ENCODER_API', async ({ encoder }) => Boolean(encoder && typeof encoder.writeFile === 'function' && typeof encoder.exec === 'function' && typeof encoder.readFile === 'function')],
    ['ENCODER_FILESYSTEM', async ({ encoder }) => {
        const probe = '__kefe_export_probe.txt';
        try {
            await encoder.writeFile(probe, new TextEncoder().encode('KEFE'));
            const data = await encoder.readFile(probe);
            await encoder.deleteFile(probe);
            return Boolean(data?.byteLength === 4);
        } catch {
            try { await encoder.deleteFile(probe); } catch {}
            return false;
        }
    }]
];

export async function runExportPreflight(context, report = () => {}) {
    const results = [];
    for (const [name, check] of checks) {
        try {
            const ok = Boolean(await check(context));
            const result = { name, ok };
            results.push(result);
            report({ stage: EXPORT_STAGES.VALIDATING, check: name, ok });
            if (!ok) return { ok: false, failed: result, results };
        } catch (error) {
            const result = { name, ok: false, error: error?.message || String(error) };
            results.push(result);
            report({ stage: EXPORT_STAGES.VALIDATING, check: name, ok: false, error: result.error });
            return { ok: false, failed: result, results };
        }
    }
    return { ok: true, results };
}

export function diagnosticError(stage, module, operation, error, details = {}) {
    const message = error?.message || String(error);
    const diagnostic = new Error(`[${stage}] ${module}.${operation}: ${message}`);
    diagnostic.name = 'ExportDiagnosticError';
    diagnostic.code = `EXPORT_${String(stage).replace(/[^A-Z0-9]+/gi, '_')}`;
    diagnostic.stage = stage;
    diagnostic.module = module;
    diagnostic.operation = operation;
    diagnostic.details = details;
    diagnostic.cause = error;
    return diagnostic;
}

export function formatDiagnostic(error) {
    return {
        code: error?.code || 'EXPORT_UNKNOWN',
        stage: error?.stage || 'UNKNOWN',
        module: error?.module || 'unknown',
        operation: error?.operation || 'unknown',
        message: error?.message || String(error),
        details: error?.details || {}
    };
}
