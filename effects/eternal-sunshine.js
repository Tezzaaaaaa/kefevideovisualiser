/* KEFE Visualiser — Eternal Sunshine handwritten ink effect */
(() => {
'use strict';
const u = window.kefeEffectUtils;
window.kefeEffects = window.kefeEffects || {};

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, Number(v) || 0));
const ease = v => u?.smoother ? u.smoother(clamp(v)) : clamp(v);
const hash = s => { let n = 2166136261; for (const ch of String(s)) { n ^= ch.charCodeAt(0); n = Math.imul(n, 16777619); } return (n >>> 0) / 4294967295; };

function wordProgress(time, word, nextWord) {
  const start = Number(word?.time) || 0;
  const end = Number(word?.endTime) || Number(nextWord?.time) || start + 0.5;
  const duration = Math.max(0.12, end - start);
  // Start writing immediately, accelerate through the middle, then settle gently.
  return ease(clamp((time - start) / Math.min(duration * 0.62, 0.42)));
}

function drawInkWord(ctx, text, x, y, size, progress, seed, colour) {
  if (progress <= 0 || !text) return;

  const width = Math.max(1, ctx.measureText(text).width);
  const reveal = ease(progress);
  const chars = Array.from(text);
  const weights = chars.map((ch, i) => {
    const w = Math.max(1, ctx.measureText(ch).width);
    return w * (0.94 + hash(`${seed}:${i}`) * 0.12);
  });
  const total = weights.reduce((a, b) => a + b, 0);

  ctx.save();
  u?.setContractFont?.(ctx, 'eternal', size);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = colour;
  ctx.globalAlpha = 1;

  let cx = x;
  let travelled = 0;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const cw = ctx.measureText(ch).width;
    const portionStart = travelled / total;
    const portionEnd = (travelled + weights[i]) / total;
    const cp = ease(clamp((reveal - portionStart) / Math.max(0.06, portionEnd - portionStart + 0.035)));

    if (cp > 0) {
      // Slightly irregular timing and baseline movement keep the handwriting alive
      // without introducing visible jitter.
      const local = hash(`${seed}:${i}`);
      const lift = (1 - cp) * (1.5 + local * 2.5);
      const sway = Math.sin((progress + local) * Math.PI * 2) * (0.35 + local * 0.55);
      const scale = 0.985 + cp * 0.015;
      ctx.save();
      ctx.translate(cx, y + lift + sway);
      ctx.scale(scale, scale);
      ctx.globalAlpha = 0.12 + 0.88 * cp;
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    }

    cx += cw;
    travelled += weights[i];
  }
  ctx.restore();
  return width;
}

window.kefeEffects.eternal = function(ctx, w, h, style, lines, time) {
  const active = u?.activeLine?.(lines, time);
  if (!active?.line) return;

  const words = u?.wordsFor?.(active.line, active.next) || [];
  if (!words.length) return;

  const requestedSize = Number(style?.fontSize) || 76;
  const text = words.map(word => word.text).join(' ');
  const size = u?.fitContractText
    ? u.fitContractText(ctx, 'eternal', text, requestedSize, w * 0.82)
    : requestedSize;

  u?.setContractFont?.(ctx, 'eternal', size);
  const gap = size * 0.055;
  const widths = words.map(word => ctx.measureText(word.text).width);
  const total = widths.reduce((sum, value) => sum + value, 0) + gap * Math.max(0, words.length - 1);
  let x = (w - total) / 2;
  const baseY = h * (Number(style?.eternalY) || 0.50);
  const colour = style?.eternalInkColor || '#FFFFFF';

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  for (let wi = 0; wi < words.length; wi++) {
    const word = words[wi];
    const nextWord = words[wi + 1];
    const p = wordProgress(time, word, nextWord);
    const wordSeed = hash(`${word.text}:${word.time}`);

    // Let the next word begin before the current word has completely settled.
    // This creates a continuous handwritten phrase instead of isolated characters.
    const y = baseY + Math.sin((time + wordSeed) * 1.8) * 0.45;
    drawInkWord(ctx, word.text, x, y, size, p, wordSeed, colour);

    x += widths[wi] + gap;
  }

  // A very restrained settling pass: newly completed words lose their tiny
  // entrance offset smoothly rather than snapping into their final baseline.
  ctx.restore();
};
})();
