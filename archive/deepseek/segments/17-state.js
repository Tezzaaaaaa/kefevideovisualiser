import { DEFAULT_STATE, ASPECTS, EFFECT_LABELS } from './core/config.js';

export const state = {
    state: JSON.parse(JSON.stringify(DEFAULT_STATE)),
    media: { image: null, video: null },
    audioURL: null,
    backgroundURL: null,
    albumArtworkImage: null,
    albumArtworkURL: null,
    mediaTagsLoadPromise: null,
    audioLoadToken: 0,
    backgroundLoadToken: 0,
    pendingProjectMetadata: null,
    exportClockTime: null,
    previewTimeBeforeExport: 0,
    renderLoopId: null,
    isExporting: false,
    userScrubbing: false,
    lastVideoHardSync: -Infinity,
    exportCanvas: null,
    exportCtx: null,
    exportCancelled: false,
    exportAbortController: null,
    previewRestored: false,
    lastVideoFrame: document.createElement("canvas"),
    lastVideoFrameCtx: null,
    hasLastVideoFrame: false
};

// Initialize lastVideoFrame context
state.lastVideoFrameCtx = state.lastVideoFrame.getContext("2d");

const LINA_PREFS_KEY = 'lina-visualiser-prefs-v1';

export function saveLinaPrefs() {
    try {
        localStorage.setItem(LINA_PREFS_KEY, JSON.stringify({
            metadata: state.state.audio.metadata,
            aspect: state.state.aspect,
            effect: state.state.style.effect
        }));
    } catch (e) { /* storage unavailable */ }
}

export function loadLinaPrefs() {
    try {
        const raw = localStorage.getItem(LINA_PREFS_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (e) { return null; }
}

export function getMasterTime() {
    if (state.exportClockTime !== null && state.exportClockTime !== undefined) return state.exportClockTime;
    const audio = document.getElementById('audio');
    return Number.isFinite(audio?.currentTime) ? audio.currentTime : 0;
}

export function wrappedVideoTime(time, duration) {
    if (!Number.isFinite(duration) || duration <= 0) return 0;
    return ((time % duration) + duration) % duration;
}

export function circularVideoDrift(cur, target, dur) {
    let drift = target - cur;
    if (dur > 0) { 
        if (drift > dur/2) drift -= dur; 
        else if (drift < -dur/2) drift += dur; 
    }
    return drift;
}

export function updateState(newState) {
    Object.assign(state.state, newState);
    saveLinaPrefs();
}