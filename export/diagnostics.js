import { EXPORT_STAGES } from './errors.js';

const checks = [
    ['PROJECT', async ({ state }) => Boolean(state)],
    ['CANVAS', async ({ canvas }) => Boolean(canvas && canvas.width && canvas.height)],
    ['AUDIO', async ({ audio }) => Boolean(audio)],
    ['ENCODER', async ({ encoder }) => Boolean(encoder)],
    ['ENCODER_EXEC', async ({ encoder }) => {
        if (!encoder || typeof encoder.exec !== 'function') return false;
        return true;
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
    return Object.assign(new Error(`[${stage}] ${module}.${operation}: ${message}`), {
        code: `EXPORT-${String(stage).replace(/[^A-Z0-9]+/gi, '_')}`,
        stage,
        module,
        operation,
        details,
        cause: error
    });
}
