import { linaClamp, linaSmoother } from './utils.js';
import { resolveAudioLabels } from '../audio/metadata.js';
import { state } from '../state.js';

export function renderTitleCard(ctx, w, h, time, appState) {
    if (!appState.style.titleCardEnabled) return false;

    const introDuration = linaClamp(Number(appState.style.titleCardDuration) || 3, 1, 5);
    const totalDuration = Number(appState.audio?.duration) || 0;
    const outroDuration = 1.6;
    const isIntro = time >= 0 && time < introDuration;
    const outroStart = totalDuration > outroDuration ? totalDuration - outroDuration : Infinity;
    const isOutro = time >= outroStart && time <= totalDuration + 0.05;
    
    if (!isIntro && !isOutro) return false;

    const metadata = resolveAudioLabels(appState.audio);
    const title = metadata.title || 'UNTITLED';
    const artist = metadata.artist;
    const album = metadata.album;
    const artwork = appState.audio?.hasArtwork && state.albumArtworkImage ? state.albumArtworkImage : null;
    
    const phaseTime = isOutro ? time - outroStart : time;
    const phaseDuration = isOutro ? outroDuration : introDuration;
    const enter = linaSmoother(linaClamp(phaseTime / 0.5));
    const exit = isIntro
        ? 1 - linaSmoother(linaClamp((phaseTime - (phaseDuration - 0.45)) / 0.45))
        : 1;
    const alpha = linaClamp(enter * exit);
    const unit = Math.min(w, h);
    const lift = (1 - enter) * unit * 0.022;
    const contentY = h * 0.52 + lift;
    const maxTextWidth = w * 0.78;

    ctx.save();

    // Restrained full-frame wash
    const wash = ctx.createLinearGradient(0, 0, 0, h);
    wash.addColorStop(0, 'rgba(0,0,0,0.10)');
    wash.addColorStop(0.5, 'rgba(0,0,0,0.28)');
    wash.addColorStop(1, 'rgba(0,0,0,0.16)');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);

    ctx.translate(w / 2, contentY);
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.42)';
    ctx.shadowBlur = Math.max(8, unit * 0.014);
    ctx.shadowOffsetY = Math.max(2, unit * 0.003);

    let textOriginY = 0;
    if (artwork) {
        const artworkSize = linaClamp(unit * 0.18, 126, 220);
        const artY = -artworkSize - unit * 0.055;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(-artworkSize / 2, artY, artworkSize, artworkSize, Math.max(12, artworkSize * 0.07));
        ctx.clip();
        const sw = artwork.naturalWidth || artwork.videoWidth || artwork.width;
        const sh = artwork.naturalHeight || artwork.videoHeight || artwork.height;
        if (sw && sh) {
            const side = Math.min(sw, sh);
            ctx.drawImage(artwork, (sw - side) / 2, (sh - side) / 2, side, side,
                -artworkSize / 2, artY, artworkSize, artworkSize);
        }
        ctx.restore();
        textOriginY = unit * 0.025;
    }

    let titleSize = Math.max(36, Math.round(unit * 0.066));
    ctx.font = `800 ${titleSize}px "Open Sans",Arial,sans-serif`;
    while (titleSize > 30 && ctx.measureText(title).width > maxTextWidth) {
        titleSize -= 2;
        ctx.font = `800 ${titleSize}px "Open Sans",Arial,sans-serif`;
    }

    const metadataLines = Number(Boolean(artist)) + Number(Boolean(album));
    const titleY = textOriginY - (metadataLines ? titleSize * 0.55 : 0);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(title, 0, titleY);

    ctx.shadowBlur = Math.max(5, unit * 0.009);
    let cursorY = titleY + Math.max(42, titleSize * 0.92);

    if (artist) {
        let artistSize = Math.max(19, Math.round(unit * 0.026));
        ctx.font = `600 ${artistSize}px "Open Sans",Arial,sans-serif`;
        while (artistSize > 15 && ctx.measureText(artist).width > maxTextWidth) {
            artistSize -= 1;
            ctx.font = `600 ${artistSize}px "Open Sans",Arial,sans-serif`;
        }
        ctx.fillStyle = 'rgba(255,255,255,0.88)';
        ctx.fillText(artist, 0, cursorY);
        cursorY += Math.max(30, artistSize * 1.45);
    }

    if (album) {
        let albumSize = Math.max(15, Math.round(unit * 0.019));
        ctx.font = `500 ${albumSize}px "Open Sans",Arial,sans-serif`;
        while (albumSize > 13 && ctx.measureText(album).width > maxTextWidth) {
            albumSize -= 1;
            ctx.font = `500 ${albumSize}px "Open Sans",Arial,sans-serif`;
        }
        ctx.fillStyle = 'rgba(255,255,255,0.60)';
        ctx.fillText(album, 0, cursorY);
    }

    ctx.restore();
    return true;
}