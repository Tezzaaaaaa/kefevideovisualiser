import { $, toast } from '../core/utils.js';
import { state } from '../state.js';
import { readEmbeddedAudioMetadata } from './metadata.js';
import { songFromFilename } from '../core/utils.js';

const MAX_AUDIO_BYTES = 200 * 1024 * 1024;
const MAX_BACKGROUND_BYTES = 500 * 1024 * 1024;

export function handleAudioFile(file) {
    if (state.isExporting) { 
        toast('Finish or cancel the current export first', 'error'); 
        return; 
    }
    if (!file) return;
    if (file.type && !file.type.startsWith('audio/') && !/\.(mp3|m4a|aac|wav|flac|ogg|oga|opus|webm)$/i.test(file.name)) {
        toast('That doesn\'t look like an audio file', 'error');
        return;
    }
    if (file.size > MAX_AUDIO_BYTES) {
        toast('Audio file too large (max ' + Math.round(MAX_AUDIO_BYTES / 1024 / 1024) + 'MB)', 'error');
        return;
    }
    
    const replacingAudio = Boolean(state.state.audio.file);
    const token = ++state.audioLoadToken;
    
    if (state.audioURL) URL.revokeObjectURL(state.audioURL);
    state.audioURL = URL.createObjectURL(file);
    state.state.audio.file = file;
    state.state.audio.url = state.audioURL;
    state.state.audio.duration = 0;
    state.state.audio.ready = false;
    
    const parsedMeta = songFromFilename(file.name);
    const usingProjectMetadata = Boolean(state.pendingProjectMetadata);
    state.state.audio.metadata = state.pendingProjectMetadata || { 
        title: parsedMeta.track || '', 
        artist: parsedMeta.artist || '', 
        album: '' 
    };
    state.pendingProjectMetadata = null;
    state.state.audio.metadataSource = usingProjectMetadata ? 'project' : 'filename';
    
    if (replacingAudio) {
        state.state.lyrics.lines = [];
        const status = $('lyricsStatus');
        if (status) {
            status.textContent = 'No lyrics loaded';
            status.className = 'status';
        }
    }
    
    state.albumArtworkImage = null;
    state.state.audio.hasArtwork = false;
    if (state.albumArtworkURL) { 
        URL.revokeObjectURL(state.albumArtworkURL); 
        state.albumArtworkURL = null; 
    }
    
    updateMetadataInputs();
    
    const audio = $('audio');
    if (audio) {
        audio.src = state.audioURL;
        audio.load();
    }
    
    const audioStatus = $('audioStatus');
    if (audioStatus) {
        audioStatus.textContent = file.name;
        audioStatus.className = 'status success';
    }
    
    toast('Audio loaded: ' + file.name, 'success');
    readiness();
    readEmbeddedAudioMetadata(file, token);
}

export function handleBackgroundFile(file) {
    if (state.isExporting) { 
        toast('Finish or cancel the current export first', 'error'); 
        return; 
    }
    if (!file) return;
    if (!file.type || (!file.type.startsWith('image/') && !file.type.startsWith('video/'))) {
        toast('Background must be an image or video file', 'error');
        return;
    }
    if (file.size > MAX_BACKGROUND_BYTES) {
        toast('Background file too large (max ' + Math.round(MAX_BACKGROUND_BYTES / 1024 / 1024) + 'MB)', 'error');
        return;
    }
    
    const token = ++state.backgroundLoadToken;
    const candidateURL = URL.createObjectURL(file);
    
    if (file.type.startsWith('video/')) {
        loadVideoBackground(file, candidateURL, token);
    } else {
        loadImageBackground(file, candidateURL, token);
    }
}

function loadVideoBackground(file, url, token) {
    const vid = document.createElement('video');
    vid.muted = true; vid.loop = true; vid.playsInline = true;
    vid.src = url;
    vid.load();
    
    vid.addEventListener('loadeddata', function() {
        if (state.isExporting || token !== state.backgroundLoadToken) { 
            vid.pause(); 
            vid.src = ''; 
            URL.revokeObjectURL(url); 
            return; 
        }
        if (state.media.video && state.media.video !== vid) { 
            state.media.video.pause(); 
            state.media.video.src = ''; 
        }
        if (state.backgroundURL) URL.revokeObjectURL(state.backgroundURL);
        state.backgroundURL = url;
        state.media.video = vid;
        state.media.image = null;
        state.state.background.type = 'video';
        
        const status = $('backgroundStatus');
        if (status) {
            status.textContent = file.name;
            status.className = 'status success';
        }
        toast('Background video loaded', 'success');
        readiness();
        state.hasLastVideoFrame = false;
        const audio = $('audio');
        const t = audio?.currentTime || 0;
        if (Number.isFinite(vid.duration) && vid.duration > 0) {
            vid.currentTime = ((t % vid.duration) + vid.duration) % vid.duration;
        }
        redrawCurrentPreviewFrame();
    });
    
    vid.addEventListener('error', function() {
        URL.revokeObjectURL(url);
        if (token !== state.backgroundLoadToken) return;
        toast('Video failed to load', 'error');
        const status = $('backgroundStatus');
        if (status) {
            status.textContent = 'Error loading video';
            status.className = 'status error';
        }
    });
}

function loadImageBackground(file, url, token) {
    const img = new Image();
    img.onload = function() {
        if (state.isExporting || token !== state.backgroundLoadToken) { 
            URL.revokeObjectURL(url); 
            return; 
        }
        if (state.media.video) { 
            state.media.video.pause(); 
            state.media.video.src = ''; 
            state.media.video = null; 
        }
        if (state.backgroundURL) URL.revokeObjectURL(state.backgroundURL);
        state.backgroundURL = url;
        state.media.image = img;
        state.state.background.type = 'image';
        
        const status = $('backgroundStatus');
        if (status) {
            status.textContent = file.name;
            status.className = 'status success';
        }
        toast('Background image loaded', 'success');
        readiness();
        redrawCurrentPreviewFrame();
    };
    
    img.onerror = function() {
        URL.revokeObjectURL(url);
        if (token !== state.backgroundLoadToken) return;
        toast('Image failed to load', 'error');
        const status = $('backgroundStatus');
        if (status) {
            status.textContent = 'Error loading image';
            status.className = 'status error';
        }
    };
    img.src = url;
}

function updateMetadataInputs() {
    const titleInput = $('metaTitle'), artistInput = $('metaArtist'), albumInput = $('metaAlbum');
    if (titleInput) titleInput.value = state.state.audio.metadata.title || '';
    if (artistInput) artistInput.value = state.state.audio.metadata.artist || '';
    if (albumInput) albumInput.value = state.state.audio.metadata.album || '';
}

function readiness() {
    const exportBtn = $('exportBtn');
    const exportBottom = $('exportBottom');
    if (exportBtn) exportBtn.disabled = !isProjectReady();
    if (exportBottom) exportBottom.disabled = !isProjectReady();
}

function isProjectReady() {
    const timingValid = state.state.lyrics.lines.length > 0 && 
        validateLyricTiming(state.state.lyrics.lines, state.state.audio.duration).errors.length === 0;
    return state.state.audio.file && state.state.audio.ready && timingValid;
}

import { validateLyricTiming } from '../project/validation.js';
import { redrawCurrentPreviewFrame } from '../core/render.js';