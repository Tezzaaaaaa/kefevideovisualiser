import { $, toast } from '../core/utils.js';
import { state } from '../state.js';
import { redrawCurrentPreviewFrame, maintainBackgroundVideoSync } from '../core/render.js';
import { parseLyrics, buildExportFilename } from '../audio/lyrics.js';
import { resolveAudioLabels, updateMetadataInputs } from '../audio/metadata.js';

export async function togglePlayback() {
    if (state.exportClockTime !== null) return;
    const audio = $('audio');
    if (!audio) return;
    if (audio.paused) { 
        try { await audio.play(); } catch(e) { toast('Playback error', 'error'); }
    } else {
        audio.pause();
    }
}

export function seekPreview(target) {
    if (state.isExporting) return;
    if (!Number.isFinite(target)) return;
    const audio = $('audio');
    if (!audio) return;
    audio.currentTime = target;
    state.state.playback.currentTime = target;
    const video = state.media?.video;
    if (video && Number.isFinite(video.duration) && video.duration > 0 && !video.seeking) {
        video.currentTime = ((target % video.duration) + video.duration) % video.duration;
    }
    redrawCurrentPreviewFrame();
}

export function stopPlayback() {
    if (state.isExporting) return;
    const audio = $('audio');
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    state.state.playback.currentTime = 0;
    const video = state.media?.video;
    if (video && Number.isFinite(video.duration) && video.duration > 0) {
        video.currentTime = 0;
    }
    redrawCurrentPreviewFrame();
}

export function resetProject() {
    if (state.isExporting) {
        toast('Finish or cancel the current export first', 'error');
        return;
    }
    const button = $('resetBtn');
    if (!button) return;
    if (button.dataset.confirmed !== 'true') {
        armReset();
        return;
    }
    clearTimeout(resetConfirmTimer);
    try { localStorage.removeItem('lina-visualiser-prefs-v1'); } catch (e) { /* storage unavailable */ }
    window.location.href = new URL('./', window.location.href).href;
}

let resetConfirmTimer = null;

function disarmReset() {
    clearTimeout(resetConfirmTimer);
    resetConfirmTimer = null;
    const button = $('resetBtn');
    if (!button) return;
    button.dataset.confirmed = '';
    button.textContent = 'Reset';
    button.classList.remove('confirming');
    button.setAttribute('aria-label', 'Reset project');
}

function armReset() {
    const button = $('resetBtn');
    if (!button) return;
    button.dataset.confirmed = 'true';
    button.textContent = 'Are you sure?';
    button.classList.add('confirming');
    button.setAttribute('aria-label', 'Confirm project reset');
    clearTimeout(resetConfirmTimer);
    resetConfirmTimer = setTimeout(disarmReset, 4500);
}

export async function findLyrics() {
    if (state.isExporting) { 
        toast('Finish or cancel the current export first', 'error'); 
        return; 
    }
    const audio = $('audio');
    if (!state.state.audio.file) { 
        toast('Load audio first', 'error'); 
        return; 
    }
    const resolved = resolveAudioLabels(state.state.audio);
    const artist = resolved.artist;
    const track = resolved.title;
    if (!track) { 
        toast('Enter the song title first', 'error'); 
        return; 
    }
    
    const status = $('lyricsStatus');
    if (status) {
        status.textContent = 'Searching...';
        status.className = 'status loading';
    }
    
    const btn = $('findLyricsBtn');
    if (btn) btn.disabled = true;
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 18000);
        let match;
        try {
            match = await requestSyncedLyrics(artist, track, state.state.audio.duration || audio?.duration, controller.signal);
        } catch (fetchErr) {
            throw new Error(fetchErr.name === 'AbortError' ? 'Lyrics search timed out' : (fetchErr.message || 'Lyrics search failed (network error)'));
        } finally {
            clearTimeout(timeoutId);
        }
        if (!match || !match.syncedLyrics) throw new Error('No synced lyrics');
        
        const parsed = parseLyrics(match.syncedLyrics);
        if (!parsed.lines.length) throw new Error('No valid timed lyrics found');
        if (state.isExporting) return;
        
        state.state.lyrics.lines = parsed.lines;
        if (match.trackName) state.state.audio.metadata.title = String(match.trackName).trim();
        if (match.artistName) state.state.audio.metadata.artist = String(match.artistName).trim();
        if (match.albumName) state.state.audio.metadata.album = String(match.albumName).trim();
        if (match.trackName || match.artistName || match.albumName) {
            state.state.audio.metadataSource = 'lyrics-service';
        }
        updateMetadataInputs();
        
        if (status) {
            status.textContent = parsed.lines.length + ' lines loaded' + 
                (parsed.skippedCount ? ' (' + parsed.skippedCount + ' unparsable line' + (parsed.skippedCount === 1 ? '' : 's') + ' skipped)' : '');
            status.className = 'status success';
        }
        toast('Lyrics loaded' + (parsed.skippedCount ? ', ' + parsed.skippedCount + ' line(s) could not be parsed' : ''), 'success');
        readiness();
        redrawCurrentPreviewFrame();
    } catch(error) {
        if (state.isExporting) return;
        if (status) {
            status.textContent = error.message;
            status.className = 'status error';
        }
        toast(error.message, 'error');
    }
    if (btn) btn.disabled = false;
}

async function requestSyncedLyrics(artist, track, duration, signal) {
    const candidates = [];
    const exact = new URLSearchParams({ artist_name: artist, track_name: track });
    if (Number.isFinite(duration) && duration > 0) exact.set('duration', String(Math.round(duration)));
    if (artist) {
        const exactResp = await fetchWithRetry('https://lrclib.net/api/get?' + exact.toString(), { signal }, 1);
        if (exactResp.ok) candidates.push(await exactResp.json());
        else if (exactResp.status !== 404) throw new Error(exactResp.status === 429 ? 'Lyrics service is rate-limited, try again shortly' : 'Lyrics service unavailable (' + exactResp.status + ')');
    }

    const searches = [
        new URLSearchParams({ track_name: track, ...(artist ? { artist_name: artist } : {}) }),
        new URLSearchParams({ q: [artist, track].filter(Boolean).join(' ') })
    ];
    for (const params of searches) {
        const response = await fetchWithRetry('https://lrclib.net/api/search?' + params.toString(), { signal });
        if (!response.ok) throw new Error(response.status === 429 ? 'Lyrics service is rate-limited, try again shortly' : 'Lyrics service unavailable (' + response.status + ')');
        const results = await response.json();
        if (Array.isArray(results)) candidates.push(...results);
        if (candidates.some(item => item?.syncedLyrics)) break;
    }
    return candidates.find(item => item?.syncedLyrics) || null;
}

async function fetchWithRetry(url, options, retries = 2, backoffMs = 600) {
    for (let attempt = 0; ; attempt++) {
        let resp;
        try {
            resp = await fetch(url, options);
        } catch (fetchErr) {
            if (fetchErr.name === 'AbortError') throw fetchErr;
            if (attempt >= retries) throw new Error('Lyrics search failed (network error)');
            await new Promise(r => setTimeout(r, backoffMs * Math.pow(2, attempt)));
            continue;
        }
        if ((resp.status >= 500 || resp.status === 429) && attempt < retries) {
            await new Promise(r => setTimeout(r, backoffMs * Math.pow(2, attempt)));
            continue;
        }
        return resp;
    }
}

import { readiness } from '../audio/manager.js';