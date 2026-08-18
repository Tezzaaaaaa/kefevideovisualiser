/* KEFE Visualiser — Instagram Lyrics effect
 * Canonical Story-lyrics treatment: compact uppercase sans-serif,
 * stacked lyric composition, dominant active line, restrained neighbours,
 * smooth handoff and no decorative stroke/glow.
 */
(() => {
  'use strict';
  const u = window.kefeEffectUtils;
  window.kefeEffects = window.kefeEffects || {};

  const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, Number(v) || 0));
  const smooth = v => {
    const t = clamp(v);
    return t * t * (3 - 2 * t);
  };

  function lineAt(lines, index) {
    if (!Array.isArray(lines) || index < 0 || index >= lines.length) return null;
    const source = lines[index];
    const start = Number(source?.time) || 0;
    const nextStart = Number(lines[index + 1]?.time);
    const explicitEnd = Number(source?.endTime);
    const end = Number.isFinite(explicitEnd) && explicitEnd > start
      ? explicitEnd
      : Number.isFinite(nextStart) && nextStart > start
        ? nextStart
        : start + 3;
    return { ...source, time: start, endTime: Math.max(start + 0.08, end) };
  }

  function activeIndex(lines, time) {
    if (!Array.isArray(lines)) return -1;
    let index = -1;
    for (let i = 0; i < lines.length; i++) {
      const start = Number(lines[i]?.time);
      if (!Number.isFinite(start)) continue;
      if (time >= start) index = i;
      else break;
    }
    return index;
  }

  function drawFitted(ctx, text, size, maxWidth, family, weight) {
    const target = Math.max(30, Number(size) || 90);
    const fitted = u?.fitContractText
      ? u.fitContractText(ctx, 'instagram', text, target, maxWidth)
      : (() => {
          let s = target;
          while (s > 30) {
            ctx.font = `${weight} ${s}px "${family}", Arial, sans-serif`;
            if (ctx.measureText(text).width <= maxWidth) break;
            s -= 1;
          }
          return s;
        })();
    return fitted;
  }

  function drawText(ctx, text, x, y, size, alpha, scale, colour, family, weight, tracking) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colour;
    ctx.font = `${weight} ${size}px "${family}", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (u?.drawTrackedText) u.drawTrackedText(ctx, text, 0, 0, size * tracking, 'fillText');
    else ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  window.kefeEffects.instagram = function(ctx, w, h, style, lines, time) {
    if (!Array.isArray(lines) || !lines.length || !Number.isFinite(time)) return;

    const index = activeIndex(lines, time);
    if (index < 0) return;

    const contract = u?.contract?.('instagram', {}) || {};
    const family = contract.family || 'Arial Narrow';
    const weight = Number(contract.weight) || 800;
    const baseSize = clamp(Number(style.instagramFontSize) || Number(style.fontSize) || 92, 48, 150);
    const colour = style.instagramTextColor || style.textColor || '#FFFFFF';
    const maxWidth = w * clamp(Number(style.instagramMaxWidth) || 0.84, 0.62, 0.94);
    const activeScale = clamp(Number(style.instagramActiveScale) || 1.22, 1.05, 1.45);
    const inactiveScale = clamp(Number(style.instagramInactiveScale) || 0.78, 0.58, 0.94);
    const inactiveAlpha = clamp(Number(style.instagramInactiveOpacity) || 0.34, 0.10, 0.65);
    const lineSpacing = clamp(Number(style.instagramLineSpacing) || 0.82, 0.60, 1.08);
    const yPosition = clamp(Number(style.instagramY) || 0.50, 0.30, 0.70);
    const transition = clamp(Number(style.instagramTransition) || 0.20, 0.08, 0.42);
    const tracking = Number.isFinite(Number(style.instagramTracking)) ? Number(style.instagramTracking) : -0.025;
    const previousLines = Math.round(clamp(Number(style.instagramPreviousLines) || 1, 0, 2));
    const nextLines = Math.round(clamp(Number(style.instagramNextLines) || 2, 1, 3));

    const active = lineAt(lines, index);
    if (!active) return;
    const next = lineAt(lines, index + 1);
    const previous = lineAt(lines, index - 1);

    const nextBlend = next && time >= next.time - transition
      ? smooth((time - (next.time - transition)) / transition)
      : 0;
    const activeBlend = smooth((time - active.time) / Math.min(transition, Math.max(0.08, active.endTime - active.time)));

    const unit = Math.min(w, h);
    const lineHeight = Math.max(baseSize * lineSpacing, unit * 0.032);
    const centreY = h * yPosition;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    const slots = [];
    for (let distance = -previousLines; distance <= nextLines; distance++) {
      slots.push({ distance, index: index + distance });
    }

    for (const slot of slots) {
      const line = lineAt(lines, slot.index);
      if (!line) continue;
      const text = String(line.text || '').trim().toUpperCase();
      if (!text) continue;

      const isActive = slot.distance === 0;
      const isNext = slot.distance === 1;
      const isPrevious = slot.distance < 0;
      const scale = isActive ? activeScale : inactiveScale;
      const size = drawFitted(ctx, text, baseSize * scale, maxWidth, family, weight);

      let alpha = isActive ? 1 : inactiveAlpha;
      if (isPrevious) alpha *= 0.82;
      if (slot.distance > 1) alpha *= Math.pow(0.78, slot.distance - 1);

      let y = centreY + slot.distance * lineHeight;
      let localScale = 1;

      // Move the entire stack together during the handoff; the next line grows
      // into the exact active position instead of popping into place.
      if (nextBlend > 0) {
        y -= nextBlend * lineHeight;
        if (isActive) {
          localScale = 1 + (activeScale - 1) * 0.035 * (1 - nextBlend);
          alpha *= 1 - nextBlend * 0.08;
        } else if (isNext) {
          localScale = inactiveScale + (activeScale - inactiveScale) * nextBlend;
          alpha = inactiveAlpha + (1 - inactiveAlpha) * nextBlend;
        }
      }

      if (isActive) {
        localScale *= 1 + 0.008 * activeBlend;
      }

      drawText(ctx, text, w / 2, y, size, clamp(alpha), localScale, colour, family, weight, tracking);
    }

    ctx.restore();
  };
})();
