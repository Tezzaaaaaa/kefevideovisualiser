// Utility functions

export const $ = id => document.getElementById(id);
export const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

export const linaClamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export const hasFiniteNumber = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

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

export const fmt = t => {
  if (!t || !isFinite(t) || t < 0) return '0:00';
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

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