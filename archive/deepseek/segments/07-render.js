import { linaClamp, linaSmoother, linaFindActiveLine, linaNormaliseLine } from '../core/utils.js';

function fitCentredEffectText(ctx, text, baseSize, maxWidth, weight) {
    let size = Number(baseSize) || 76;
    ctx.font = `${weight} ${size}px "Open Sans",Arial,sans-serif`;
    while (size > 30 && ctx.measureText(text).width > maxWidth) {
        size -= 2;
        ctx.font = `${weight} ${size}px "Open Sans",Arial,sans-serif`;
    }
    return size;
}

export function drawPulseEffect(ctx, w, h, style, lines, time) {
    const line = linaFindActiveLine(lines, time);
    const normalisedLine = line >= 0 ? linaNormaliseLine(lines, line) : null;
    if (!normalisedLine) return;
    const text = String(normalisedLine.text || '').trim();
    if (!text) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const maxWidth = w * 0.84;
    const baseSize = fitCentredEffectText(ctx, text, style.fontSize, maxWidth, 800);
    const amplitude = linaClamp(Number(style.pulseAmplitude) || 0.4, 0.05, 1);
    const frequency = Number(style.pulseFrequency) || 1.2;
    const glowSize = Number(style.pulseGlowSize) || 1;
    const colour = style.accentColor || '#FFFFFF';
    const beat = 0.5 + 0.5 * Math.sin(time * frequency * Math.PI * 2);
    const easedBeat = linaSmoother(beat);
    const finalSize = baseSize * (1 + amplitude * 0.12 * easedBeat);
    const y = h * 0.46;
    
    ctx.font = `800 ${finalSize}px "Open Sans",Arial,sans-serif`;
    ctx.fillStyle = colour;
    ctx.shadowColor = colour;
    ctx.shadowBlur = finalSize * 0.30 * glowSize * easedBeat;
    ctx.globalAlpha = 0.22 + 0.18 * easedBeat;
    ctx.fillText(text, w / 2, y);
    ctx.shadowBlur = finalSize * 0.045 * glowSize * easedBeat;
    ctx.globalAlpha = 0.86 + 0.14 * easedBeat;
    ctx.fillText(text, w / 2, y);
    ctx.restore();
}