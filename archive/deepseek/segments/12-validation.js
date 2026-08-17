export const $ = id => document.getElementById(id);
export const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

export function linaClamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
}

export function hasFiniteNumber(value) {
    return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

export function linaSmooth(value) { 
    const t = linaClamp(value); 
    return t * t * (3 - 2 * t); 
}

export function linaSmoother(value) { 
    const t = linaClamp(value); 
    return t * t * t * (t * (t * 6 - 15) + 10); 
}

export function linaSeededRandom(seed) { 
    const n = Math.sin(seed * 12.9898 + 78.233) * 43758.5453; 
    return n - Math.floor(n); 
}

export function median(values) { 
    const valid = values.filter(Number.isFinite).sort((a,b) => a-b); 
    if (!valid.length) return null; 
    const m = Math.floor(valid.length/2); 
    if (valid.length % 2) return valid[m]; 
    return (valid[m-1] + valid[m]) / 2; 
}

export function fmt(t) {
    if (!t || !isFinite(t) || t < 0) return '0:00';
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatTime(seconds) {
    const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60), c = Math.floor((seconds % 1) * 100);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + '.' + String(c).padStart(2, '0');
}

export function sanitiseExportFilenamePart(value) {
    return String(value || '')
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/[. ]+$/g, '')
        .trim();
}

export function songFromFilename(name) {
    if (!name) return { artist: '', track: '' };
    const base = name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim();
    const parts = base.split(/\s+-\s+/);
    return parts.length > 1 ? { track: parts[0].trim(), artist: parts.slice(1).join(' - ').trim() } : { artist: '', track: base };
}

export function cleanTrackName(value) {
    return String(value || '')
        .replace(/\s*[\[(](official\s+)?(music|lyric|lyrics|audio|visuali[sz]er|video).*?[\])]/ig, '')
        .replace(/\s+(official\s+)?(music|lyric|lyrics|audio|visuali[sz]er|video)\s*$/ig, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export function isUsefulExportLabel(value) {
    const label = String(value || '').trim();
    return Boolean(label) && !/^(unknown|untitled|audio|track|song|recording|output|new recording|voice memo)(?:\s*\d+)?$/i.test(label);
}

export function toast(msg, type = '') {
    const el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast show ' + type;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => el.classList.remove('show'), 3000);
}

export function linaNormaliseLine(lines, index) {
    if (!Array.isArray(lines) || index < 0 || index >= lines.length) return null;
    const source = lines[index];
    const start = Number(source.time) || 0;
    const nextLineTime = hasFiniteNumber(lines[index+1]?.time) ? Number(lines[index+1].time) : null;
    const end = hasFiniteNumber(source.endTime) ? Number(source.endTime) : (nextLineTime !== null ? nextLineTime : start + 3);
    const vocalEnd = hasFiniteNumber(source.vocalEndTime) ? Number(source.vocalEndTime) :
        (source.words && source.words.length > 0 && hasFiniteNumber(source.words[source.words.length-1]?.endTime) ? Number(source.words[source.words.length-1].endTime) : end);
    return { ...source, time: start, endTime: end, vocalEndTime: vocalEnd, nextLineTime };
}

export function linaFindActiveLine(lines, time) {
    let index = -1;
    for (let i = 0; i < lines.length; i++) {
        if (hasFiniteNumber(lines[i].time) && time >= Number(lines[i].time)) index = i;
        else break;
    }
    return index;
}