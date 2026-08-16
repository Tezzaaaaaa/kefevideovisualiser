import { $, toast, sanitiseExportFilenamePart } from '../core/utils.js';
import { state, saveLinaPrefs } from '../state.js';
import { resolveAudioLabels } from '../audio/metadata.js';
import { setAspectRatio, setEffect } from '../ui/controls.js';
import { applyProjectStyle } from './validation.js';

export function serialiseProject() {
    return {
        format: 'KEFE Visualiser Project', 
        version: 1, 
        savedAt: new Date().toISOString(),
        metadata: { ...state.state.audio.metadata }, 
        lyrics: state.state.lyrics.lines,
        lyricsSource: $('lyricsText').value || '', 
        style: { ...state.state.style },
        background: { 
            solid: state.state.background.solid, 
            dim: state.state.background.dim, 
            blur: state.state.background.blur 
        },
        aspect: state.state.aspect
    };
}

export function sanitiseProjectLyrics(lines) {
    if (!Array.isArray(lines) || lines.length > 10000) return [];
    return lines.map(line => {
        const time = Number(line?.time), endTime = Number(line?.endTime);
        if (!Number.isFinite(time) || time < 0) return null;
        const words = Array.isArray(line.words) ? line.words.slice(0, 500).map(word => ({
            text: String(word?.text || '').slice(0, 200), 
            time: Number(word?.time),
            endTime: Number.isFinite(Number(word?.endTime)) ? Number(word.endTime) : null
        })).filter(word => word.text && Number.isFinite(word.time)) : null;
        return { 
            text: String(line?.text || '').slice(0, 1000), 
            time, 
            endTime: Number.isFinite(endTime) ? endTime : time + 3, 
            words 
        };
    }).filter(line => line?.text).sort((a, b) => a.time - b.time);
}

export function downloadProject() {
    if (state.isExporting) { 
        toast('Finish or cancel the current export first', 'error'); 
        return; 
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(serialiseProject(), null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    const label = sanitiseExportFilenamePart(resolveAudioLabels(state.state.audio).title) || 'Untitled';
    link.href = url; 
    link.download = `${label} - KEFE Project.kefe`;
    document.body.appendChild(link); 
    link.click(); 
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    toast('Project settings saved', 'success');
}

export async function loadProjectFile(file) {
    if (!file || state.isExporting) return;
    if (file.size > 5 * 1024 * 1024) { 
        toast('Project file is too large', 'error'); 
        return; 
    }
    try {
        const project = JSON.parse(await file.text());
        if (project?.format !== 'KEFE Visualiser Project' || project?.version !== 1) {
            throw new Error('Not a supported KEFE project');
        }
        
        state.state.audio.metadata = { 
            title: String(project.metadata?.title || ''), 
            artist: String(project.metadata?.artist || ''), 
            album: String(project.metadata?.album || '') 
        };
        state.pendingProjectMetadata = { ...state.state.audio.metadata };
        state.state.lyrics.lines = sanitiseProjectLyrics(project.lyrics);
        applyProjectStyle(project.style);
        
        if (project.background && typeof project.background === 'object') {
            if (/^#[0-9a-f]{6}$/i.test(project.background.solid || '')) {
                state.state.background.solid = project.background.solid;
            }
            state.state.background.dim = linaClamp(Number(project.background.dim) || 0, 0, 1);
            state.state.background.blur = linaClamp(Number(project.background.blur) || 0, 0, 100);
        }
        
        state.state.aspect = ASPECTS[project.aspect] ? project.aspect : state.state.aspect;
        $('lyricsText').value = String(project.lyricsSource || '').slice(0, 1000000);
        updateMetadataInputs();
        $('backgroundColor').value = state.state.background.solid;
        $('backgroundColorValue').textContent = state.state.background.solid.toUpperCase();
        
        setAspectRatio(state.state.aspect);
        setEffect(EFFECT_LABELS[state.state.style.effect] ? state.state.style.effect : 'apple');
        readiness(); 
        redrawCurrentPreviewFrame();
        toast('Project opened · select its audio file to continue', 'success');
    } catch (error) { 
        toast(error.message || 'Could not open project', 'error'); 
    }
}

import { linaClamp, updateMetadataInputs } from '../core/utils.js';
import { ASPECTS, EFFECT_LABELS } from '../core/config.js';
import { readiness } from '../audio/manager.js';
import { redrawCurrentPreviewFrame } from '../core/render.js';