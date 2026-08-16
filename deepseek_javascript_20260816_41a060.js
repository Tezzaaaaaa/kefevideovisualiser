import { linaClamp, linaFindActiveLine, linaNormaliseLine } from '../core/utils.js';

function fitCentredEffectText(ctx, text, baseSize, maxWidth, weight) {
    let size = Number(baseSize) || 76;
    ctx.font = `${weight} ${size}px "Open Sans",Arial,sans-serif`;
    while (size > 30 && ctx.measureText(text).width > maxWidth) {
        size -= 2;
        ctx.font = `${weight} ${size}px "Open Sans",Arial,sans-serif`;
    }
    return size;
}

export function drawAuroraEffect(ctx, w, h, style, lines, time) {
    const line = linaFindActiveLine(lines, time);
    const normalisedLine = line >= 0 ? linaNormaliseLine(lines, line) : null;
    if (!normalisedLine) return;
    const text = String(normalisedLine.text || '').trim();
    if (!text) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const maxWidth = w * 0.84;
    const size = fitCentredEffectText(ctx, text, style.fontSize, maxWidth, 700);
    const speed = Number(style.auroraSpeed) || 1.2;
    const intensity = Number(style.auroraIntensity) || 0.7;
    const saturation = linaClamp(Number(style.auroraSaturation) || 1, 0.2, 1.8);
    const hueBase = (time * speed * 28 + 180) % 360;
    const y = h * 0.46;
    
    const gradient = ctx.createLinearGradient(w * 0.08, y - size, w * 0.92, y + size);
    for (let i = 0; i <= 6; i++) {
        const stop = i / 6;
        const hue = (hueBase + stop * 135) % 360;
        const light = 63 + 12 * Math.sin(time * speed + i * 0.85);
        gradient.addColorStop(stop, `hsl(${hue} ${Math.min(100, 76 * saturation)}% ${light}%)`);
    }
    ctx.fillStyle = gradient;
    ctx.shadowColor = `hsl(${(hueBase + 65) % 360} 100% 72%)`;
    ctx.shadowBlur = size * 0.20 * intensity;
    ctx.fillText(text, w / 2, y);
    ctx.restore();
}