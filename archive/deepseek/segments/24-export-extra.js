import { hasFiniteNumber } from '../core/utils.js';
import { state } from '../state.js';
import { EFFECT_LABELS } from '../core/config.js';

export function validateLyricTiming(lines, duration = 0) {
    const errors = [], warnings = [];
    if (!Array.isArray(lines) || !lines.length) return { errors, warnings };
    let previous = -Infinity;
    for (let i = 0; i < lines.length; i++) {
        const time = Number(lines[i]?.time);
        if (!Number.isFinite(time) || time < 0) errors.push(`Line ${i + 1} has an invalid timestamp`);
        if (time < previous) errors.push(`Line ${i + 1} is earlier than the previous line`);
        if (time === previous) warnings.push(`Lines ${i} and ${i + 1} share a timestamp`);
        if (Number.isFinite(duration) && duration > 0 && time > duration + 0.1) {
            errors.push(`Line ${i + 1} starts after the audio ends`);
        }
        if (Number.isFinite(time) && Number.isFinite(previous) && previous >= 0 && time - previous > 18) {
            warnings.push(`Long ${Math.round(time - previous)}s gap before line ${i + 1}`);
        }
        const end = Number(lines[i]?.endTime);
        if (Number.isFinite(end) && Number.isFinite(time) && end < time) {
            errors.push(`Line ${i + 1} ends before it starts`);
        }
        previous = time;
    }
    const last = Number(lines[lines.length - 1]?.time);
    if (Number.isFinite(duration) && duration > 0 && Number.isFinite(last) && duration - last > 30) {
        warnings.push('Lyrics finish more than 30 seconds before the audio');
    }
    return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}

export function refreshLyricsTimingStatus() {
    const status = $('lyricsStatus');
    if (!status || !state.state.lyrics.lines.length) return;
    const report = validateLyricTiming(state.state.lyrics.lines, state.state.audio.duration);
    if (report.errors.length) {
        status.textContent = `${state.state.lyrics.lines.length} lines · ${report.errors[0]}`;
        status.className = 'status error';
    } else if (report.warnings.length) {
        status.textContent = `${state.state.lyrics.lines.length} synced lines · ${report.warnings[0]}`;
        status.className = 'status';
    } else {
        status.textContent = `${state.state.lyrics.lines.length} synced lines · timing valid`;
        status.className = 'status success';
    }
}

export function applyProjectStyle(projectStyle) {
    if (!projectStyle || typeof projectStyle !== 'object') return;
    for (const [key, current] of Object.entries(state.state.style)) {
        const incoming = projectStyle[key];
        if (typeof current === 'number' && Number.isFinite(Number(incoming))) {
            state.state.style[key] = linaClamp(Number(incoming), -1000, 1000);
        } else if (typeof current === 'boolean' && typeof incoming === 'boolean') {
            state.state.style[key] = incoming;
        } else if (typeof current === 'string' && typeof incoming === 'string' && incoming.length <= 100) {
            state.state.style[key] = incoming;
        }
    }
    if (!EFFECT_LABELS[state.state.style.effect]) state.state.style.effect = 'apple';
    if (!['left','center','right'].includes(state.state.style.align)) state.state.style.align = 'left';
    for (const key of ['accentColor','textColor','bratTextColor','eternalInkColor']) {
        if (!/^#[0-9a-f]{6}$/i.test(state.state.style[key])) state.state.style[key] = '#FFFFFF';
    }
}

import { $, linaClamp } from '../core/utils.js';