import { $, qsa, toast, fmt } from '../core/utils.js';
import { state } from '../state.js';
import { handleAudioFile, handleBackgroundFile } from '../audio/manager.js';
import { redrawCurrentPreviewFrame, maintainBackgroundVideoSync } from '../core/render.js';
import { togglePlayback, seekPreview, stopPlayback } from './controller.js';
import { startOfflineExport } from '../export/encoder.js';
import { downloadProject, loadProjectFile } from '../project/serialiser.js';

export function setupDropZone(zone, inputId) {
    if (!zone) return;
    zone.addEventListener('dragover', e => { 
        e.preventDefault(); 
        zone.classList.add('dragover'); 
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('dragover');
        const file = e.dataTransfer?.files?.[0];
        if (!file) return;
        if (inputId === 'audioInput') handleAudioFile(file);
        if (inputId === 'backgroundInput') handleBackgroundFile(file);
    });
}

export function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        
        switch(e.key) {
            case ' ': 
                e.preventDefault(); 
                togglePlayback(); 
                break;
            case 'ArrowLeft': 
                e.preventDefault(); 
                const audio = $('audio');
                seekPreview(Math.max(0, (audio?.currentTime || 0) - 5)); 
                break;
            case 'ArrowRight': 
                e.preventDefault(); 
                const audio2 = $('audio');
                seekPreview(Math.min(audio2?.duration || 0, (audio2?.currentTime || 0) + 5)); 
                break;
            case '1': 
                document.querySelector('[data-effect="apple"]')?.click(); 
                break;
            case '2': 
                document.querySelector('[data-effect="brat"]')?.click(); 
                break;
            case '3': 
                document.querySelector('[data-effect="eternal"]')?.click(); 
                break;
            case 'e': 
            case 'E': 
                startOfflineExport(); 
                break;
            case 'f': 
            case 'F':
                const preview = document.querySelector('.preview');
                if (document.fullscreenElement) document.exitFullscreen();
                else preview?.requestFullscreen().catch(() => {});
                break;
            case '0': 
                stopPlayback(); 
                break;
        }
    });
}

export function setupAudioEventListeners() {
    const audio = $('audio');
    if (!audio) return;
    
    audio.addEventListener('loadedmetadata', function() {
        if (!Number.isFinite(this.duration) || this.duration <= 0) {
            state.state.audio.ready = false;
            readiness();
            toast('Audio duration could not be read', 'error');
            return;
        }
        state.state.audio.duration = this.duration;
        state.state.audio.ready = true;
        const seek = $('seek'); 
        if (seek) seek.max = this.duration;
        const clock = $('clock');
        if (clock) clock.textContent = '0:00 / ' + fmt(this.duration);
        readiness();
    });
    
    audio.addEventListener('error', function() {
        state.state.audio.ready = false;
        readiness();
        toast('Audio error', 'error');
        const audioStatus = $('audioStatus');
        if (audioStatus) {
            audioStatus.textContent = 'Error loading audio';
            audioStatus.className = 'status error';
        }
    });
    
    audio.addEventListener('timeupdate', function() { 
        state.state.playback.currentTime = this.currentTime || 0; 
    });
    
    audio.addEventListener('play', function() {
        const playBtn = $('playBtn');
        if (playBtn) playBtn.textContent = 'Pause';
        state.state.playback.isPlaying = true;
        if (state.isExporting) return;
        const video = state.media?.video;
        if (video && video.readyState >= 2) {
            const target = ((audio.currentTime % video.duration) + video.duration) % video.duration;
            if (Math.abs(video.currentTime - target) > 0.20 && !video.seeking) video.currentTime = target;
            video.playbackRate = 1;
            video.play().catch(() => {});
        }
    });
    
    audio.addEventListener('pause', function() {
        const playBtn = $('playBtn');
        if (playBtn) playBtn.textContent = 'Play';
        state.state.playback.isPlaying = false;
        if (state.isExporting) return;
        const video = state.media?.video;
        if (video) {
            video.pause();
            const target = ((audio.currentTime % video.duration) + video.duration) % video.duration;
            if (Number.isFinite(video.duration) && !video.seeking) video.currentTime = target;
        }
        redrawCurrentPreviewFrame();
    });
    
    audio.addEventListener('ended', function() { 
        const playBtn = $('playBtn');
        if (playBtn) playBtn.textContent = 'Play'; 
        state.state.playback.isPlaying = false; 
        if (!state.isExporting) redrawCurrentPreviewFrame(); 
    });
    
    audio.addEventListener('seeked', function() { 
        if (!state.isExporting) redrawCurrentPreviewFrame(); 
    });
}

export function setupUIEventListeners() {
    // Play/Pause
    const playBtn = $('playBtn');
    if (playBtn) playBtn.addEventListener('click', togglePlayback);
    
    // Stop
    const stopBtn = $('stopBtn');
    if (stopBtn) stopBtn.addEventListener('click', stopPlayback);
    
    // Seek slider
    const seek = $('seek');
    if (seek) {
        seek.addEventListener('pointerdown', function() { 
            state.userScrubbing = true; 
            if (!state.isExporting) state.media?.video?.pause(); 
        });
        seek.addEventListener('input', function(e) {
            if (state.exportClockTime !== null) return;
            const target = Number(e.target.value);
            if (!Number.isFinite(target)) return;
            seekPreview(target);
        });
        seek.addEventListener('pointerup', finishScrubbing);
        seek.addEventListener('change', finishScrubbing);
    }
    
    // Audio input
    const audioInput = $('audioInput');
    const audioChooseBtn = document.getElementById('audioChooseBtn');
    if (audioChooseBtn) {
        audioChooseBtn.addEventListener('click', function () {
            if (state.isExporting) {
                toast('Finish or cancel the current export first', 'error');
                return;
            }
            if (audioInput) {
                audioInput.value = '';
                audioInput.click();
            }
        });
    }
    if (audioInput) {
        audioInput.addEventListener('change', function () {
            const file = this.files && this.files[0];
            if (!file) return;
            handleAudioFile(file);
        });
    }
    
    // Background input
    const backgroundInput = $('backgroundInput');
    if (backgroundInput) {
        backgroundInput.addEventListener('change', function(e) {
            handleBackgroundFile(this.files[0]);
        });
    }
    
    // Background color
    const bgColor = $('backgroundColor');
    if (bgColor) {
        bgColor.addEventListener('input', function() {
            if (state.isExporting) { 
                this.value = state.state.background.solid || '#0A0A0A'; 
                return; 
            }
            state.state.background.solid = this.value;
            const valueDisplay = $('backgroundColorValue');
            if (valueDisplay) valueDisplay.textContent = this.value.toUpperCase();
            if (!state.media.image && !state.media.video) state.state.background.type = 'solid';
            redrawCurrentPreviewFrame();
        });
    }
    
    // Aspect ratio buttons
    qsa('[data-aspect]').forEach(b => b.addEventListener('click', function() { 
        setAspectRatio(this.dataset.aspect); 
    }));
    
    // Effect buttons
    qsa("[data-effect]").forEach(b => b.addEventListener("click", () => {
        if (setEffect(b.dataset.effect)) {
            toast(b.textContent + ' activated', 'success');
        }
    }));
    
    // Find lyrics
    const findLyricsBtn = $('findLyricsBtn');
    if (findLyricsBtn) {
        findLyricsBtn.addEventListener('click', findLyrics);
    }
    
    // Export
    const exportBtn = $('exportBtn');
    const exportBottom = $('exportBottom');
    if (exportBtn) exportBtn.addEventListener('click', startOfflineExport);
    if (exportBottom) exportBottom.addEventListener('click', startOfflineExport);
    
    // Cancel export
    const cancelExport = $('cancelExport');
    if (cancelExport) {
        cancelExport.addEventListener('click', function() {
            if (!state.isExporting) return;
            state.exportCancelled = true;
            try { state.exportAbortController?.abort(); } catch(e) {}
            if (offlineExportActive && ffmpegInstance) {
                try { ffmpegInstance.terminate(); } catch (e) {}
                ffmpegInstance = null;
                ffmpegLoadPromise = null;
            }
            toast('Export cancelled');
        });
    }
    
    // Project save/load
    const saveProject = $('saveProject');
    if (saveProject) saveProject.addEventListener('click', downloadProject);
    
    const loadProject = $('loadProject');
    const projectFileInput = $('projectFileInput');
    if (loadProject) {
        loadProject.addEventListener('click', () => projectFileInput?.click());
    }
    if (projectFileInput) {
        projectFileInput.addEventListener('change', function() { 
            loadProjectFile(this.files?.[0]); 
            this.value = ''; 
        });
    }
    
    // Reset
    const resetBtn = $('resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetProject);
}

function finishScrubbing() {
    if (!state.userScrubbing) return;
    state.userScrubbing = false;
    if (state.isExporting) return;
    const video = state.media?.video;
    const audio = $('audio');
    if (video && !audio?.paused) video.play().catch(() => {});
}

import { readiness } from '../audio/manager.js';
import { setAspectRatio, setEffect } from './controls.js';
import { findLyrics, resetProject } from './controller.js';