import { formatDiagnostic } from './diagnostics.js';

export function createExportReport({ preflight = null, diagnostic = null, versions = null, startedAt = null, finishedAt = null } = {}) {
    return {
        product: 'KEFE Visualiser',
        type: 'EXPORT_DIAGNOSTIC',
        startedAt,
        finishedAt,
        durationMs: startedAt && finishedAt ? finishedAt - startedAt : null,
        encoder: versions,
        preflight,
        failure: diagnostic ? formatDiagnostic(diagnostic) : null,
        environment: {
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
            crossOriginIsolated: typeof crossOriginIsolated !== 'undefined' ? crossOriginIsolated : false,
            secureContext: typeof isSecureContext !== 'undefined' ? isSecureContext : false
        }
    };
}

export function formatExportReport(report) {
    const lines = [
        'KEFE EXPORT DIAGNOSTIC REPORT',
        '=============================',
        `Status: ${report.failure ? 'FAILED' : 'OK'}`,
        `Duration: ${report.durationMs ?? 'unknown'} ms`,
        `Encoder: ${report.encoder ? JSON.stringify(report.encoder) : 'unknown'}`,
        ''
    ];
    if (report.preflight?.results) {
        lines.push('PREFLIGHT');
        for (const check of report.preflight.results) lines.push(`${check.ok ? '✓' : '✗'} ${check.name}`);
        lines.push('');
    }
    if (report.failure) {
        lines.push('FAILURE');
        lines.push(`Code: ${report.failure.code}`);
        lines.push(`Stage: ${report.failure.stage}`);
        lines.push(`Module: ${report.failure.module}`);
        lines.push(`Operation: ${report.failure.operation}`);
        lines.push(`Message: ${report.failure.message}`);
        if (Object.keys(report.failure.details || {}).length) lines.push(`Details: ${JSON.stringify(report.failure.details)}`);
        lines.push('');
    }
    lines.push('ENVIRONMENT');
    lines.push(`Secure context: ${report.environment.secureContext}`);
    lines.push(`Cross-origin isolated: ${report.environment.crossOriginIsolated}`);
    lines.push(`User agent: ${report.environment.userAgent}`);
    return lines.join('\n');
}

export function downloadExportReport(report, filename = 'kefe-export-diagnostic.txt') {
    const blob = new Blob([formatExportReport(report)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
