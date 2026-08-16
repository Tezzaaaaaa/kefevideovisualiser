import { $, toast, formatTime } from '../core/utils.js';
import { state } from '../state.js';
import { parseLyrics } from '../audio/lyrics.js';
import { updateMetadataInputs } from '../audio/metadata.js';
import { redrawCurrentPreviewFrame } from '../core/render.js';

export function setupLyricsEditor() {
    const editBtn = $('editLyricsBtn');
    if (editBtn) {
        editBtn.addEventListener('click', function() {
            if (state.isExporting) { 
                toast('Finish or cancel the current export first', 'error'); 
                return; 
            }
            if (state.state.lyrics.lines.length) {
                let text = '';
                for (const line of state.state.lyrics.lines) {
                    text += '[' + formatTime(line.time) + ']' + line.text + '\n';
                }
                $('lyricsText').value = text;
            }
            $('lyricsEditor').classList.remove('hidden');
        });
    }
    
    const closeBtn = $('closeEditor');
    if (closeBtn) closeBtn.addEventListener('click', () => $('lyricsEditor').classList.add('hidden'));
    
    const cancelBtn = $('cancelEditor');
    if (cancelBtn) cancelBtn.addEventListener('click', () => $('lyricsEditor').classList.add('hidden'));
    
    const pasteBtn = $('pasteLyrics');
    if (pasteBtn) {
        pasteBtn.addEventListener('click', pasteFromClipboard);
    }
    
    const saveBtn = $('saveLyrics');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveLyrics);
    }
    
    const uploadBtn = $('uploadLrc');
    const lrcFileInput = $('lrcFileInput');
    if (uploadBtn && lrcFileInput) {
        uploadBtn.addEventListener('click', () => lrcFileInput.click());
        lrcFileInput.addEventListener('change', function() {
            loadLrcFile(this.files?.[0]);
            this.value = '';
        });
    }
}

async function pasteFromClipboard() {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
        const status = $('editorStatus');
        if (status) {
            status.textContent = window.isSecureContext
                ? 'Clipboard paste isn\'t supported in this browser — try Ctrl/Cmd+V into the box instead'
                : 'Clipboard paste needs HTTPS — try Ctrl/Cmd+V into the box instead';
            status.className = 'status error';
        }
        return;
    }
    try {
        const text = await navigator.clipboard.readText();
        if (!text) {
            const status = $('editorStatus');
            if (status) {
                status.textContent = 'Clipboard is empty';
                status.className = 'status error';
            }
            return;
        }
        $('lyricsText').value = text;
        const status = $('editorStatus');
        if (status) {
            status.textContent = 'Pasted from clipboard';
            status.className = 'status success';
        }
    } catch(err) {
        const status = $('editorStatus');
        if (status) {
            status.textContent = err?.name === 'NotAllowedError'
                ? 'Clipboard permission denied — allow it or paste manually with Ctrl/Cmd+V'
                : 'Could not read clipboard — try Ctrl/Cmd+V into the box instead';
            status.className = 'status error';
        }
    }
}

function saveLyrics() {
    if (state.isExporting) { 
        toast('Finish or cancel the current export first', 'error'); 
        return; 
    }
    const raw = $('lyricsText').value.trim();
    if (!raw) {
        const status = $('editorStatus');
        if (status) {
            status.textContent = 'No lyrics to save';
            status.className = 'status error';
        }
        return;
    }
    try {
        const parsed = parseLyrics(raw);
        if (!parsed.lines.length) {
            const status = $('editorStatus');
            if (status) {
                status.textContent = 'No valid timed lyrics found';
                status.className = 'status error';
            }
            return;
        }
        state.state.lyrics.lines = parsed.lines;
        if (parsed.metadata?.title) state.state.audio.metadata.title = parsed.metadata.title;
        if (parsed.metadata?.artist) state.state.audio.metadata.artist = parsed.metadata.artist;
        if (parsed.metadata?.album) state.state.audio.metadata.album = parsed.metadata.album;
        if (parsed.metadata?.title || parsed.metadata?.artist || parsed.metadata?.album) {
            state.state.audio.metadataSource = 'lrc';
            updateMetadataInputs();
        }
        
        const status = $('lyricsStatus');
        if (status) {
            status.textContent = parsed.lines.length + ' lines loaded' + 
                (parsed.skippedCount ? ' (' + parsed.skippedCount + ' unparsable line' + (parsed.skippedCount === 1 ? '' : 's') + ' skipped)' : '');
            status.className = 'status success';
        }
        
        const editorStatus = $('editorStatus');
        if (editorStatus) {
            editorStatus.textContent = 'Saved ' + parsed.lines.length + ' lines' + 
                (parsed.skippedCount ? ', skipped ' + parsed.skippedCount + ' unparsable line' + (parsed.skippedCount === 1 ? '' : 's') : '');
            editorStatus.className = parsed.skippedCount ? 'status' : 'status success';
        }
        
        toast(parsed.skippedCount ? 'Lyrics saved, ' + parsed.skippedCount + ' line(s) skipped' : 'Lyrics saved', 'success');
        readiness();
        redrawCurrentPreviewFrame();
        setTimeout(() => $('lyricsEditor').classList.add('hidden'), 800);
    } catch(err) {
        const status = $('editorStatus');
        if (status) {
            status.textContent = err.message;
            status.className = 'status error';
        }
    }
}

async function loadLrcFile(file, openEditor = false) {
    if (!file) return;
    if (!/\.(lrc|txt)$/i.test(file.name)) {
        toast('Choose an .lrc or .txt file', 'error');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        toast('Lyrics file too large (max 5MB)', 'error');
        return;
    }
    try {
        const raw = await file.text();
        const parsed = parseLyrics(raw);
        if (!parsed.lines.length) throw new Error('No valid timed lyrics found in ' + file.name);
        $('lyricsText').value = raw;
        state.state.lyrics.lines = parsed.lines;
        if (parsed.metadata?.title) state.state.audio.metadata.title = parsed.metadata.title;
        if (parsed.metadata?.artist) state.state.audio.metadata.artist = parsed.metadata.artist;
        if (parsed.metadata?.album) state.state.audio.metadata.album = parsed.metadata.album;
        if (parsed.metadata?.title || parsed.metadata?.artist || parsed.metadata?.album) {
            state.state.audio.metadataSource = 'lrc';
            updateMetadataInputs();
        }
        if (parsed.metadata?.artwork) await setAlbumArtworkReference(parsed.metadata.artwork);
        
        const status = $('lyricsStatus');
        if (status) {
            status.textContent = parsed.lines.length + ' synced lines loaded';
            status.className = 'status success';
        }
        const editorStatus = $('editorStatus');
        if (editorStatus) {
            editorStatus.textContent = 'Loaded ' + file.name;
            editorStatus.className = 'status success';
        }
        readiness();
        redrawCurrentPreviewFrame();
        toast('Loaded ' + file.name, 'success');
        if (openEditor) $('lyricsEditor').classList.remove('hidden');
    } catch (error) {
        const status = $('lyricsStatus');
        if (status) {
            status.textContent = error.message;
            status.className = 'status error';
        }
        toast(error.message, 'error');
    }
}

import { setAlbumArtworkReference } from '../audio/metadata.js';
import { readiness } from '../audio/manager.js';