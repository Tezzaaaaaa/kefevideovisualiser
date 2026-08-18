/* KEFE Visualiser — Instagram Lyrics effect
 * Recreates the bold Instagram Stories Music lyric treatment:
 * compact uppercase sans-serif, stacked lyric lines, oversized active line,
 * restrained inactive lines, tight leading and smooth state transitions.
 */
(() => {
  'use strict';
  const u = window.kefeEffectUtils;
  window.kefeEffects = window.kefeEffects || {};

  const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, Number(v) || 0));
  const smooth = v => { const t = clamp(v); return t * t * (3 - 2 * t); };

  function normalise(lines, i) {
    const line = lines?.[i];
    if (!line) return null;
    return { ...line, time: Number(line.time) || 0, endTime: Number(line.endTime) || Number(lines[i + 1]?.time) || (Number(line.time) || 0) + 3 };
  }

  function fit(ctx, text, size, maxWidth, weight, family) {
    let s = Math.max(28, Number(size) || 88);
    ctx.font = `${weight} ${s}px ${family}`;
    while (s > 28 && ctx.measureText(text).width > maxWidth) {
      s -= 1;
      ctx.font = `${weight} ${s}px ${family}`;
    }
    return s;
  }

  function drawLine(ctx, text, x, y, size, alpha, scale, colour, family, weight, tracking) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colour;
    ctx.font = `${weight} ${size}px ${family}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    u.drawTrackedText(ctx, text, 0, 0, size * tracking, 'fillText');
    ctx.restore();
  }

  window.kefeEffects.instagram = function(ctx, w, h, style, lines, time) {
    if (!Array.isArray(lines) || !lines.length) return;
    const activeIndex = lines.reduce((idx, line, i) => Number(line?.time) <= time ? i : idx, -1);
    if (activeIndex < 0) return;

    const active = normalise(lines, activeIndex);
    if (!active) return;

    const family = 'Arial Narrow, Arial, Helvetica, sans-serif';
    const weight = 800;
    const colour = style.instagramTextColor || style.textColor || '#FFFFFF';
    const baseSize = clamp(Number(style.instagramFontSize) || Number(style.fontSize) || 92, 48, 150);
    const maxWidth = w * clamp(Number(style.instagramMaxWidth) || .82, .62, .94);
    const activeScale = clamp(Number(style.instagramActiveScale) || 1.28, 1.05, 1.55);
    const inactiveScale = clamp(Number(style.instagramInactiveScale) || .78, .55, .95);
    const inactiveAlpha = clamp(Number(style.instagramInactiveOpacity) || .42, .12, .75);
    const spacing = clamp(Number(style.instagramLineSpacing) || .82, .58, 1.08);
    const yPosition = clamp(Number(style.instagramY) || .51, .28, .72);
    const transition = clamp(Number(style.instagramTransition) || .18, .08, .45);
    const tracking = Number(style.instagramTracking) || -0.025;

    const progress = clamp((time - active.time) / Math.max(.08, Math.min(transition, active.endTime - active.time)));
    const transitionIn = smooth(progress);
    const next = normalise(lines, activeIndex + 1);
    const nextReady = next && time >= next.time - transition;
    const handoff = nextReady ? smooth((time - (next.time - transition)) / transition) : 0;

    // The reference uses a compact four-line stack with one dominant line.
    const slots = [activeIndex - 2, activeIndex - 1, activeIndex, activeIndex + 1];
    const unit = Math.min(w, h);
    const lineHeight = baseSize * spacing;
    const centreY = h * yPosition;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalCompositeOperation = 'source-over';

    slots.forEach((lineIndex, slot) => {
      const line = normalise(lines, lineIndex);
      if (!line) return;
      const text = String(line.text || '').trim().toUpperCase();
      if (!text) return;

      const distance = slot - 2;
      const isActive = slot === 2;
      const sizeFactor = isActive ? activeScale : inactiveScale;
      const size = fit(ctx, text, baseSize * sizeFactor, maxWidth, weight, family);
      const targetY = centreY + distance * lineHeight;
      let alpha = isActive ? 1 : inactiveAlpha;

      if (lineIndex < activeIndex) alpha *= .72;
      if (lineIndex === activeIndex) alpha *= .94 + transitionIn * .06;
      if (lineIndex === activeIndex + 1) alpha *= .76;

      const isNext = lineIndex === activeIndex + 1;
      if (isNext && nextReady) alpha = inactiveAlpha + (1 - inactiveAlpha) * handoff;

      let scale = 1;
      if (isActive) scale = 1 + .012 * transitionIn;
      if (isNext && nextReady) scale = inactiveScale + (activeScale - inactiveScale) * handoff;

      // Keep the stack moving as the active line hands off to the next lyric.
      const shift = nextReady ? handoff * lineHeight : 0;
      const y = targetY - shift;

      drawLine(ctx, text, w / 2, y, size, alpha, scale, colour, family, weight, tracking);
    });

    // Soft edge fade prevents distant lines from competing with the active lyric.
    const fade = ctx.createLinearGradient(0, centreY - lineHeight * 2.3, 0, centreY + lineHeight * 2.3);
    fade.addColorStop(0, 'rgba(0,0,0,.30)');
    fade.addColorStop(.16, 'rgba(0,0,0,0)');
    fade.addColorStop(.84, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(0,0,0,.30)');
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = fade;
    ctx.fillRect(0, centreY - lineHeight * 2.6, w, lineHeight * 5.2);

    ctx.restore();
  };
})();
