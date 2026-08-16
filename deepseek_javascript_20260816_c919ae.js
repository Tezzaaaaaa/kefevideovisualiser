import { $, qsa } from './core/utils.js';
import { state } from './state.js';
import { render } from './core/render.js';
import { startSingleRenderLoop } from './core/render.js';
import { handleAudioFile, handleBackgroundFile } from './audio/manager.js';
import { setEffect } from './ui/controls.js';
import { setAspectRatio } from './ui/controls.js';
import { checkExportCapability } from './export/encoder.js';
import { setupDropZone } from './ui/events.js';
import { loadLinaPrefs, saveLinaPrefs } from './state.js';

function init() {
    try {
        // Ensure default background
        if (!state.media.image && !state.media.video) {
            state.state.background.type = 'solid';
        }
        
        const bgInput = $('backgroundColor');
        if (bgInput) {
            bgInput.value = state.state.background.solid;
            $('backgroundColorValue').textContent = state.state.background.solid.toUpperCase();
        }

        const prefs = loadLinaPrefs();
        if (prefs?.metadata && typeof prefs.metadata === 'object') {
            state.state.audio.metadata.title = prefs.metadata.title || '';
            state.state.audio.metadata.artist = prefs.metadata.artist || '';
            state.state.audio.metadata.album = prefs.metadata.album || '';
            
            const titleInput = $('metaTitle');
            const artistInput = $('metaArtist');
            const albumInput = $('metaAlbum');
            if (titleInput) titleInput.value = state.state.audio.metadata.title;
            if (artistInput) artistInput.value = state.state.audio.metadata.artist;
            if (albumInput) albumInput.value = state.state.audio.metadata.album;
        }

        setAspectRatio(prefs?.aspect && ASPECTS[prefs.aspect] ? prefs.aspect : '9:16');
        setEffect(prefs?.effect && EFFECT_LABELS[prefs.effect] ? prefs.effect : (state.state.style.effect || 'apple'));

        // Setup drag-and-drop zones
        setupDropZone($('audioDrop'), 'audioInput');
        setupDropZone($('bgDrop'), 'backgroundInput');

        startSingleRenderLoop();
        checkExportCapability();
        
        toast('KEFE Visualiser ready', 'success');
    } catch(err) {
        console.error('Init error:', err);
        toast('Error initializing', 'error');
    }
}

// Global error handlers
window.addEventListener('error', function(e) {
    console.error('Unhandled error:', e.error || e.message);
    if (!state.isExporting) toast('Something went wrong: ' + (e.message || 'unknown error'), 'error');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled rejection:', e.reason);
    if (!state.isExporting) toast('Something went wrong: ' + (e.reason?.message || e.reason || 'unknown error'), 'error');
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (state.renderLoopId) cancelAnimationFrame(state.renderLoopId);
    if (state.audioURL) URL.revokeObjectURL(state.audioURL);
    if (state.backgroundURL) URL.revokeObjectURL(state.backgroundURL);
    if (state.albumArtworkURL) URL.revokeObjectURL(state.albumArtworkURL);
    if (state.media.video) { 
        state.media.video.pause(); 
        state.media.video.src = ''; 
    }
    const audio = $('audio');
    if (audio) {
        audio.pause();
        audio.src = '';
    }
    try { state.exportAbortController?.abort(); } catch (e) {}
});

// Start the app
init();