import { $, linaClamp, fmt } from './utils.js';
import { state, getMasterTime, wrappedVideoTime, circularVideoDrift } from '../state.js';
import { drawBackground } from './background.js';
import { renderTitleCard } from './title-card.js';
import { drawAppleEffect } from '../effects/apple.js';
import { drawBratEffect } from '../effects/brat.js';
import { drawEternalSunshineEffect } from '../effects/eternal.js';
import { drawAuroraEffect } from '../effects/aurora.js';
import { drawPulseEffect } from '../effects/pulse.js';
import { resolveAudioLabels } from '../audio/metadata.js';

export function render(ctx, w, h, appState, mediaCache) {
    if (!ctx || !w || !h) return;
    ctx.save();
    try {
        ctx.globalAlpha = 1; 
        ctx.globalCompositeOperation = "source-over"; 
        ctx.filter = "none"; 
        ctx.shadowBlur = 0;
        ctx.clearRect(0, 0, w, h);
        
        drawBackground(ctx, w, h, appState.background, mediaCache);
        
        if (!appState.audio?.file) {
            const unit = Math.min(w, h);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(255,255,255,0.82)';
            ctx.font = `800 ${Math.max(34, unit * 0.095)}px "Open Sans", Arial, sans-serif`;
            ctx.fillText('KEFE', w / 2, h / 2 - unit * 0.035);
            ctx.fillStyle = 'rgba(255,255,255,0.38)';
            ctx.font = `600 ${Math.max(12, unit * 0.022)}px "Open Sans", Arial, sans-serif`;
            ctx.fillText('ADD AUDIO + SYNCED LYRICS', w / 2, h / 2 + unit * 0.055);
            return;
        }
        
        const time = Number.isFinite(appState.playback.currentTime) ? appState.playback.currentTime : 0;
        const style = { ...appState.style };
        const tcActive = renderTitleCard(ctx, w, h, time, appState);
        
        if (!tcActive) {
            renderLyricsEffect(ctx, w, h, style, appState.lyrics.lines, time);
        }
    } finally { 
        ctx.restore(); 
    }
}

export function renderLyricsEffect(ctx, w, h, style, lines, time) {
    ctx.save();
    ctx.globalAlpha = 1; 
    ctx.globalCompositeOperation = "source-over"; 
    ctx.filter = "none"; 
    ctx.shadowBlur = 0;
    
    try {
        switch(style.effect) {
            case "apple": 
                drawAppleEffect(ctx, w, h, style, lines, time); 
                break;
            case "brat": 
                drawBratEffect(ctx, w, h, style, lines, time); 
                break;
            case "eternal": 
                drawEternalSunshineEffect(ctx, w, h, style, lines, time); 
                break;
            case "aurora": 
                drawAuroraEffect(ctx, w, h, style, lines, time); 
                break;
            case "pulse": 
                drawPulseEffect(ctx, w, h, style, lines, time); 
                break;
            default: 
                drawAppleEffect(ctx, w, h, style, lines, time);
        }
    } catch(e) {
        console.error(`${style.effect} render error:`, e);
    } finally {
        ctx.restore();
    }
}

export function maintainBackgroundVideoSync(masterTime) {
    if (state.exportClockTime !== null) return;
    const video = state.media?.video;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0 || video.readyState < 2) return;
    
    const target = wrappedVideoTime(masterTime, video.duration);
    const drift = circularVideoDrift(video.currentTime, target, video.duration);
    const distance = Math.abs(drift);
    
    const audio = $('audio');
    const shouldPlay = !audio?.paused;
    
    if (!shouldPlay || state.userScrubbing) {
        if (!video.paused) video.pause();
        if (distance > 0.035 && !video.seeking) video.currentTime = target;
        video.playbackRate = 1;
        return;
    }
    
    if (distance <= 0.18) {
        video.playbackRate = linaClamp(1 + drift * 0.20, 0.97, 1.03);
    } else {
        video.playbackRate = 1;
    }
    
    const now = performance.now();
    if (distance > 0.40 && !video.seeking && now - state.lastVideoHardSync > 250) {
        state.lastVideoHardSync = now;
        video.currentTime = target;
    }
    
    if (video.paused && !video.seeking) {
        video.play().catch(() => {});
    }
}

export function redrawCurrentPreviewFrame() {
    if (state.isExporting) return;
    const audio = $('audio');
    const t = Number.isFinite(audio?.currentTime) ? audio.currentTime : 0;
    state.state.playback.currentTime = t;
    maintainBackgroundVideoSync(t);
    
    const canvas = $('stageCanvas');
    try { 
        render(
            canvas?.getContext('2d', { alpha: false }), 
            canvas?.width, 
            canvas?.height, 
            state.state, 
            state.media
        ); 
    } catch(e) { 
        console.error("Preview redraw error:", e); 
    }
    
    syncPreviewTransportUI(t);
}

export function syncPreviewTransportUI(t) {
    const seek = $('seek'); 
    if (seek) seek.value = String(t);
    
    const clock = $('clock');
    if (clock) { 
        const audio = $('audio');
        const total = Number.isFinite(audio?.duration) ? audio.duration : 0; 
        clock.textContent = `${fmt(t)} / ${fmt(total)}`; 
    }
}

export function tick() {
    if (!state.isExporting) {
        const t = getMasterTime();
        state.state.playback.currentTime = t;
        
        const seek = $('seek');
        if (seek && !state.userScrubbing) seek.value = String(t);
        
        const clock = $('clock');
        if (clock) {
            const audio = $('audio');
            const total = Number.isFinite(audio?.duration) ? audio.duration : 0;
            clock.textContent = `${fmt(t)} / ${fmt(total)}`;
        }
        
        maintainBackgroundVideoSync(t);
        
        const canvas = $('stageCanvas');
        try { 
            render(
                canvas?.getContext('2d', { alpha: false }), 
                canvas?.width, 
                canvas?.height, 
                state.state, 
                state.media
            ); 
        } catch(e) { 
            console.error("Preview render error:", e); 
        }
    }
    state.renderLoopId = requestAnimationFrame(tick);
}

export function startSingleRenderLoop() {
    if (state.renderLoopId !== null) cancelAnimationFrame(state.renderLoopId);
    state.renderLoopId = requestAnimationFrame(tick);
}