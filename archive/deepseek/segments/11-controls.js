import { $, fmt } from '../core/utils.js';
import { state } from '../state.js';
import { ASPECTS, EXPORT_PRESETS } from '../core/config.js';
import { validateLyricTiming } from '../project/validation.js';

export function getExportDimensions(preset) {
    const aspect = state.state.aspect || '9:16';
    const sizes = {
        '1080p': { '9:16':[1080,1920], '1:1':[1080,1080], '16:9':[1920,1080] },
        '720p': { '9:16':[720,1280], '1:1':[720,720], '16:9':[1280,720] },
        '480p': { '9:16':[480,854], '1:1':[480,480], '16:9':[854,480] },
        'instagram': { '9:16':[1080,1920], '1:1':[1080,1080], '16:9':[1920,1080] },
        'tiktok': { '9:16':[1080,1920], '1:1':[1080,1080], '16:9':[1920,1080] }
    };
    const encoding = EXPORT_PRESETS;
    const selected = sizes[preset] ? preset : '720p';
    const dims = sizes[selected][aspect] || sizes[selected]['9:16'];
    const enc = encoding[selected];
    return { width:dims[0], height:dims[1], fps:enc.fps, bitrate:enc.bitrate };
}

export function showExportPreflight() {
    const issues = projectValidationIssues();
    if (issues.length) { 
        toast('Before export, add: ' + issues.join(', '), 'error'); 
        return; 
    }
    
    ensureDefaultBackground();
    const config = getExportDimensions($('exportPreset').value);
    const duration = Number(state.state.audio.duration) || 0;
    const totalFrames = Math.ceil(duration * config.fps);
    const report = validateLyricTiming(state.state.lyrics.lines, duration);
    const demand = config.width * config.height * config.fps * duration;
    const demandLabel = demand > 1.2e11 ? 'Very high' : demand > 5e10 ? 'High' : demand > 1.8e10 ? 'Moderate' : 'Light';
    
    const rows = [
        ['Output', `${config.width} × ${config.height}`], 
        ['Frame rate', `${config.fps} fps`],
        ['Duration', fmt(duration)], 
        ['Frames', totalFrames.toLocaleString()],
        ['Background', state.media.image ? 'Uploaded image' : state.media.video ? 'Uploaded video' : `Solid ${state.state.background.solid}`],
        ['Device demand', demandLabel]
    ];
    
    const summary = $('preflightSummary');
    if (summary) {
        summary.replaceChildren(...rows.map(([label, value]) => {
            const row = document.createElement('div'); 
            row.className = 'preflight-row';
            const left = document.createElement('span'); 
            left.textContent = label;
            const right = document.createElement('strong'); 
            right.textContent = value;
            row.append(left, right); 
            return row;
        }));
    }
    
    const warnings = [...report.warnings];
    if (demandLabel === 'High' || demandLabel === 'Very high') {
        warnings.unshift('This export may take a long time on a phone. The finished MP4 timing will remain frame-accurate.');
    }
    
    const warningEl = $('preflightWarning');
    if (warningEl) {
        warningEl.textContent = warnings.join(' ');
        warningEl.classList.toggle('hidden', warnings.length === 0);
    }
    
    $('exportPreflight').classList.remove('hidden');
}

function ensureDefaultBackground() {
    if (state.media.image || state.media.video) return;
    state.state.background.type = 'solid';
    state.state.background.image = null;
    state.state.background.video = null;
    state.state.background.solid = state.state.background.solid || '#0A0A0A';
}

function projectValidationIssues() {
    const issues = [];
    if (!state.state.audio.file) issues.push('audio');
    else if (!state.state.audio.ready || !Number.isFinite(state.state.audio.duration) || state.state.audio.duration <= 0) {
        issues.push('readable audio');
    }
    if (!state.state.lyrics.lines.length) issues.push('synced lyrics');
    else if (validateLyricTiming(state.state.lyrics.lines, state.state.audio.duration).errors.length) {
        issues.push('valid lyric timing');
    }
    return issues;
}

export function closeExportPreflight() { 
    $('exportPreflight').classList.add('hidden'); 
}