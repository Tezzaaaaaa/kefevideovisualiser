import { $, toast } from '../core/utils.js';
import { state, saveLinaPrefs } from '../state.js';
import { cleanTrackName, isUsefulExportLabel, songFromFilename } from '../core/utils.js';

let mediaTagsLoadPromise = null;

export function loadMediaTagsLibrary() {
    if (window.jsmediatags) return Promise.resolve(window.jsmediatags);
    if (!mediaTagsLoadPromise) {
        mediaTagsLoadPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/jsmediatags@0.1.1/dist/jsmediatags.min.js';
            script.onload = () => window.jsmediatags ? resolve(window.jsmediatags) : reject(new Error('Metadata reader unavailable'));
            script.onerror = () => reject(new Error('Metadata reader failed to load'));
            document.head.appendChild(script);
        }).catch(error => { mediaTagsLoadPromise = null; throw error; });
    }
    return mediaTagsLoadPromise;
}

export async function readEmbeddedAudioMetadata(file, token) {
    try {
        const tagsLibrary = await loadMediaTagsLibrary();
        const result = await new Promise((resolve, reject) => tagsLibrary.read(file, { onSuccess: resolve, onError: reject }));
        if (token !== state.audioLoadToken || state.state.audio.file !== file) return;
        const tags = result?.tags || {};
        if (state.state.audio.metadataSource !== 'project') {
            if (tags.title) state.state.audio.metadata.title = String(tags.title).trim();
            if (tags.artist) state.state.audio.metadata.artist = String(tags.artist).trim();
            if (tags.album) state.state.audio.metadata.album = String(tags.album).trim();
            if (tags.title || tags.artist || tags.album) state.state.audio.metadataSource = 'embedded';
        }
        updateMetadataInputs();
        const picture = tags.picture;
        if (picture?.data?.length) {
            setAlbumArtworkBlob(new Blob([new Uint8Array(picture.data)], { type: picture.format || 'image/jpeg' }), token);
            const audioStatus = $('audioStatus');
            if (audioStatus) audioStatus.textContent = file.name + ' · embedded artwork';
        }
        saveLinaPrefs();
        redrawCurrentPreviewFrame();
    } catch (error) {
        console.info('No readable embedded audio metadata:', error?.message || error);
    }
}

export function setAlbumArtworkBlob(blob, token = state.audioLoadToken) {
    if (!blob || !String(blob.type || '').startsWith('image/')) return;
    if (state.albumArtworkURL) URL.revokeObjectURL(state.albumArtworkURL);
    state.albumArtworkURL = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => { 
        if (token !== state.audioLoadToken) return; 
        state.albumArtworkImage = image; 
        state.state.audio.hasArtwork = true; 
        redrawCurrentPreviewFrame(); 
    };
    image.onerror = () => {
        if (token !== state.audioLoadToken) return;
        state.state.audio.hasArtwork = false;
        state.albumArtworkImage = null;
        if (state.albumArtworkURL) { 
            URL.revokeObjectURL(state.albumArtworkURL); 
            state.albumArtworkURL = null; 
        }
    };
    image.src = state.albumArtworkURL;
}

export async function setAlbumArtworkReference(reference) {
    const value = String(reference || '').trim();
    if (!value.startsWith('data:image/') || value.length > 14 * 1024 * 1024) return false;
    try { 
        const response = await fetch(value); 
        setAlbumArtworkBlob(await response.blob()); 
        return true; 
    } catch (error) { 
        return false; 
    }
}

export function resolveAudioLabels(audioState = state.state.audio) {
    const metadata = audioState?.metadata || {};
    const fallback = audioState?.file ? songFromFilename(audioState.file.name) : { track: '', artist: '' };
    const fallbackTitle = cleanTrackName(fallback.track);
    const fallbackArtist = String(fallback.artist || '').trim();
    
    const titleField = $('metaTitle');
    const artistField = $('metaArtist');
    const albumField = $('metaAlbum');
    
    let title = cleanTrackName(titleField ? titleField.value : metadata.title);
    let artist = String(artistField ? artistField.value : (metadata.artist || '')).trim();
    const album = String(albumField ? albumField.value : (metadata.album || '')).trim();

    if (!isUsefulExportLabel(title)) title = fallbackTitle;
    if (!isUsefulExportLabel(artist)) artist = fallbackArtist;
    
    return {
        title: String(title || '').trim(),
        artist: String(artist || '').trim(),
        album
    };
}

export function updateMetadataInputs() {
    const titleInput = $('metaTitle'), artistInput = $('metaArtist'), albumInput = $('metaAlbum');
    if (titleInput) titleInput.value = state.state.audio.metadata.title || '';
    if (artistInput) artistInput.value = state.state.audio.metadata.artist || '';
    if (albumInput) albumInput.value = state.state.audio.metadata.album || '';
}

import { redrawCurrentPreviewFrame } from '../core/render.js';