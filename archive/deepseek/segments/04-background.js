import { state } from '../state.js';

export function drawCover(ctx, media, w, h, blur) {
    const mw = media.videoWidth || media.width, mh = media.videoHeight || media.height;
    if (!mw || !mh) return;
    const scale = Math.max(w / mw, h / mh);
    const dw = mw * scale, dh = mh * scale;
    const dx = (w - dw) / 2, dy = (h - dh) / 2;
    if (blur > 0) { 
        ctx.filter = `blur(${blur}px)`; 
        ctx.drawImage(media, dx - blur*2, dy - blur*2, dw + blur*4, dh + blur*4); 
        ctx.filter = "none"; 
    } else {
        ctx.drawImage(media, dx, dy, dw, dh);
    }
}

export function ensureVideoFrameCacheSize(w, h) {
    if (state.lastVideoFrame.width !== w || state.lastVideoFrame.height !== h) { 
        state.lastVideoFrame.width = w; 
        state.lastVideoFrame.height = h; 
        state.hasLastVideoFrame = false; 
    }
}

export function drawVideoBackgroundStable(ctx, video, w, h, blur) {
    ensureVideoFrameCacheSize(w, h);
    const valid = video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0 && !video.seeking;
    if (valid) {
        drawCover(ctx, video, w, h, blur);
        state.lastVideoFrameCtx.clearRect(0, 0, w, h);
        drawCover(state.lastVideoFrameCtx, video, w, h, blur);
        state.hasLastVideoFrame = true;
        return;
    }
    if (state.hasLastVideoFrame) { 
        ctx.drawImage(state.lastVideoFrame, 0, 0, w, h); 
        return; 
    }
    ctx.fillStyle = state.state.background.solid || "#0A0A0A";
    ctx.fillRect(0, 0, w, h);
}

export function drawBackground(ctx, w, h, bg, media) {
    ctx.save();
    ctx.fillStyle = bg.solid || "#0A0A0A";
    ctx.fillRect(0, 0, w, h);
    
    if (bg.type === "image" && media.image) {
        drawCover(ctx, media.image, w, h, bg.blur);
    } else if (bg.type === "video") {
        drawVideoBackgroundStable(ctx, media.video, w, h, bg.blur);
    }
    
    if (bg.dim > 0) { 
        ctx.fillStyle = `rgba(0,0,0,${linaClamp(bg.dim)})`; 
        ctx.fillRect(0, 0, w, h); 
    }
    ctx.restore();
}