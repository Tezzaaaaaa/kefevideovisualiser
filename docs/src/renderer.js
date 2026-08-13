// renderer.js — one draw function shared by preview and export.
// All lyric motion is derived from playback time so pause/seek/export remain in sync.

import { getSyncState } from "./sync.js";

const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
const smootherstep = v => { const t = clamp(v); return t * t * t * (t * (t * 6 - 15) + 10); };

function applyCase(text, mode) {
  switch (mode) {
    case "upper": return text.toUpperCase();
    case "lower": return text.toLowerCase();
    case "title": return text.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
    default: return text;
  }
}

function drawBackground(ctx, w, h, bg, mediaCache) {
  ctx.save();
  if (bg.type === "solid") {
    ctx.fillStyle = bg.solid; ctx.fillRect(0, 0, w, h);
  } else if (bg.type === "gradient") {
    const rad = (bg.gradientAngle * Math.PI) / 180;
    const x1 = w / 2 - Math.cos(rad) * w, y1 = h / 2 - Math.sin(rad) * h;
    const x2 = w / 2 + Math.cos(rad) * w, y2 = h / 2 + Math.sin(rad) * h;
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, bg.gradientFrom); grad.addColorStop(1, bg.gradientTo);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
  } else if (bg.type === "image" && mediaCache.image) {
    drawCover(ctx, mediaCache.image, w, h, bg.blur);
  } else if (bg.type === "video" && mediaCache.video && mediaCache.video.readyState >= 2) {
    drawCover(ctx, mediaCache.video, w, h, bg.blur);
  } else {
    ctx.fillStyle = "#0A0A0A"; ctx.fillRect(0, 0, w, h);
  }
  if (bg.dim > 0) { ctx.fillStyle = `rgba(0,0,0,${bg.dim})`; ctx.fillRect(0, 0, w, h); }
  ctx.restore();
}

function drawCover(ctx, media, w, h, blur) {
  const mw = media.videoWidth || media.width, mh = media.videoHeight || media.height;
  if (!mw || !mh) return;
  const scale = Math.max(w / mw, h / mh), dw = mw * scale, dh = mh * scale;
  const dx = (w - dw) / 2, dy = (h - dh) / 2;
  if (blur > 0) {
    ctx.filter = `blur(${blur}px)`;
    ctx.drawImage(media, dx - blur * 2, dy - blur * 2, dw + blur * 4, dh + blur * 4);
    ctx.filter = "none";
  } else ctx.drawImage(media, dx, dy, dw, dh);
}

function textX(align, w, pad) {
  if (align === "left") return pad;
  if (align === "right") return w - pad;
  return w / 2;
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const rows = []; let row = "";
  for (const word of words) {
    const test = row ? `${row} ${word}` : word;
    if (row && ctx.measureText(test).width > maxWidth) { rows.push(row); row = word; }
    else row = test;
  }
  if (row) rows.push(row);
  return rows.length ? rows : [""];
}

function rowStartX(align, w, pad, rowWidth) {
  if (align === "left") return pad;
  if (align === "right") return w - pad - rowWidth;
  return (w - rowWidth) / 2;
}

function wordFocus(word, time) {
  if (!Number.isFinite(word?.time) || !Number.isFinite(word?.endTime)) return 0;
  const duration = Math.max(0.06, word.endTime - word.time);
  const attack = Math.min(0.14, Math.max(0.045, duration * 0.24));
  const release = Math.min(0.18, Math.max(0.06, duration * 0.28));
  if (time < word.time) return 0;
  if (time < word.time + attack) return smootherstep((time - word.time) / attack);
  if (time <= word.endTime) return 1;
  if (time < word.endTime + release) return 1 - smootherstep((time - word.endTime) / release);
  return 0;
}

function drawAppleTimedWord(ctx, ref, x, y, style, time) {
  const text = ref.text;
  const textWidth = ref.textWidth;
  const start = Number(ref.time);
  const end = Number(ref.endTime);
  const duration = Math.max(0.06, end - start);
  const completed = time >= end;
  const active = time >= start && time < end;
  const focus = wordFocus(ref, time);
  const scale = 1 + focus * 0.055;

  ctx.save();
  ctx.translate(x + textWidth / 2, y);
  ctx.scale(scale, scale);
  const left = -textWidth / 2;

  if (completed) {
    ctx.fillStyle = style.accentColor;
    ctx.fillText(text, left, 0);
    ctx.restore();
    return;
  }

  ctx.fillStyle = style.dimColor;
  ctx.fillText(text, left, 0);
  if (!active) { ctx.restore(); return; }

  const progress = clamp((time - start) / duration);
  const glyphs = Array.from(text);
  let glyphX = left;
  for (let i = 0; i < glyphs.length; i++) {
    const glyph = glyphs[i];
    const width = ctx.measureText(glyph).width;
    const letterStart = i / Math.max(1, glyphs.length);
    const letterEnd = (i + 1) / Math.max(1, glyphs.length);
    const overlap = Math.min(0.10, (letterEnd - letterStart) * 0.55);
    const alpha = smootherstep((progress - letterStart + overlap) / Math.max(0.001, letterEnd - letterStart + overlap * 1.7));
    if (alpha > 0) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = style.accentColor;
      if (alpha > 0.15 && alpha < 0.98) {
        ctx.shadowColor = "rgba(255,255,255,0.22)";
        ctx.shadowBlur = style.fontSize * 0.055 * (1 - Math.abs(alpha - 0.5) * 2);
      }
      ctx.fillText(glyph, glyphX, 0);
      ctx.restore();
    }
    glyphX += width;
  }
  ctx.restore();
}

function appleBlock(ctx, w, style, line, active) {
  const pad = w * 0.09, maxWidth = w - pad * 2;
  const timed = Boolean(line?.words?.length);
  const sourceWords = timed
    ? line.words
    : String(line?.text || "").split(/\s+/).filter(Boolean).map(text => ({ text, time: null, endTime: null }));
  const spaceWidth = ctx.measureText(" ").width;
  const words = sourceWords.map((word, i) => {
    const text = applyCase(word.text, style.textCase);
    const textWidth = ctx.measureText(text).width;
    return { ...word, text, i, textWidth, advance: textWidth + spaceWidth };
  });

  const rows = []; let row = [], width = 0;
  for (const ref of words) {
    if (row.length && width + ref.advance > maxWidth) { rows.push(row); row = []; width = 0; }
    row.push(ref); width += ref.advance;
  }
  if (row.length) rows.push(row);

  const lineHeight = style.fontSize * style.lineSpacing;
  return {
    rows,
    height: Math.max(lineHeight, rows.length * lineHeight),
    lineHeight,
    pad,
    active,
    timed,
    time: line?.time,
    endTime: line?.endTime,
  };
}

function drawAppleBlock(ctx, w, yCenter, style, block, alpha, time) {
  if (!block?.rows?.length || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  let y = yCenter - block.height / 2 + block.lineHeight / 2;

  const lineSpan = Math.max(0.08, (block.endTime || 0) - (block.time || 0));
  const lineReveal = block.active && !block.timed
    ? smootherstep((time - block.time) / Math.min(0.18, lineSpan * 0.22))
    : 0;

  for (const row of block.rows) {
    const rowWidth = row.reduce((sum, ref) => sum + ref.advance, 0) - (row.length ? ctx.measureText(" ").width : 0);
    let x = rowStartX(style.align, w, block.pad, rowWidth);
    for (const ref of row) {
      if (!block.active) {
        ctx.fillStyle = style.dimColor;
        ctx.fillText(ref.text, x, y);
      } else if (!block.timed) {
        ctx.fillStyle = style.dimColor;
        ctx.fillText(ref.text, x, y);
        ctx.save();
        ctx.globalAlpha *= lineReveal;
        ctx.fillStyle = style.accentColor;
        ctx.fillText(ref.text, x, y);
        ctx.restore();
      } else {
        drawAppleTimedWord(ctx, ref, x, y, style, time);
      }
      x += ref.advance;
    }
    y += block.lineHeight;
  }
  ctx.restore();
}

function drawAppleMusic(ctx, w, h, style, syncState, lines, time) {
  const { lineIndex } = syncState;
  if (lineIndex < 0 || !lines[lineIndex]) return;
  ctx.font = `700 ${style.fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  const prevLine = lines[lineIndex - 1];
  const currentLine = lines[lineIndex];
  const nextLine = lines[lineIndex + 1];
  const next2Line = lines[lineIndex + 2];
  const prev = prevLine ? appleBlock(ctx, w, style, prevLine, false) : null;
  const current = appleBlock(ctx, w, style, currentLine, true);
  const next = nextLine ? appleBlock(ctx, w, style, nextLine, false) : null;
  const next2 = next2Line ? appleBlock(ctx, w, style, next2Line, false) : null;

  let transition = 0;
  if (next && Number.isFinite(nextLine.time)) {
    const span = Math.max(0.12, nextLine.time - currentLine.time);
    const lead = Math.min(0.46, Math.max(0.18, span * 0.20));
    transition = smootherstep((time - (nextLine.time - lead)) / lead);
  }

  const gap = style.fontSize * 0.82;
  const currentToNext = next ? current.height / 2 + next.height / 2 + gap : 0;
  const prevToCurrent = prev ? prev.height / 2 + current.height / 2 + gap : 0;
  const nextToNext2 = next && next2 ? next.height / 2 + next2.height / 2 + gap : 0;
  const focusY = h * 0.50;
  const shift = currentToNext * transition;

  if (prev) drawAppleBlock(ctx, w, focusY - prevToCurrent - shift, style, prev, 0.18 * (1 - transition), time);
  drawAppleBlock(ctx, w, focusY - shift, style, current, lerp(1, 0.18, transition), time);
  if (next) drawAppleBlock(ctx, w, focusY + currentToNext - shift, style, next, lerp(0.34, 1, transition), time);
  if (next2) drawAppleBlock(ctx, w, focusY + currentToNext + nextToNext2 - shift, style, next2, lerp(0.12, 0.20, transition), time);
}

function drawBrat(ctx, w, h, style, syncState) {
  const { line, lineProgress } = syncState;
  if (!line) return;
  const pad = w * 0.09, maxWidth = w - pad * 2;
  const fadeIn = smoothstep(lineProgress / 0.10);
  const fadeOut = lineProgress > 0.90 ? 1 - smoothstep((lineProgress - 0.90) / 0.10) : 1;
  const alpha = clamp(Math.min(fadeIn, fadeOut));
  const pulse = 0.985 + 0.015 * Math.sin(clamp(lineProgress) * Math.PI);

  ctx.save();
  ctx.font = `700 ${style.fontSize}px Arial, Helvetica, sans-serif`;
  ctx.textBaseline = "middle"; ctx.textAlign = style.align;
  const rows = wrapText(ctx, String(line.text || "").toLowerCase(), maxWidth * 0.92);
  const lineHeight = style.fontSize * Math.max(1.02, style.lineSpacing * 0.96);
  const totalHeight = rows.length * lineHeight;
  const anchorX = textX(style.align, w, pad);
  ctx.globalAlpha = alpha;
  ctx.translate(anchorX, h * 0.51);
  ctx.scale(pulse, pulse);
  let y = -totalHeight / 2 + lineHeight / 2;
  for (const row of rows) {
    const width = ctx.measureText(row).width;
    const rectX = style.align === "left" ? 0 : style.align === "right" ? -width : -width / 2;
    const insetX = style.fontSize * 0.28, insetY = style.fontSize * 0.17;
    ctx.fillStyle = "#8ACE00";
    ctx.fillRect(rectX - insetX, y - lineHeight / 2 + insetY * 0.1, width + insetX * 2, lineHeight - insetY * 0.2);
    ctx.fillStyle = "#111111";
    ctx.filter = "blur(0.35px)";
    ctx.fillText(row, 0, y);
    ctx.filter = "none";
    y += lineHeight;
  }
  ctx.restore();
}

function drawHandwriting(ctx, w, h, style, syncState) {
  const { line, lineProgress } = syncState;
  if (!line) return;
  const pad = w * 0.10, maxWidth = w - pad * 2;
  ctx.save();
  ctx.font = `500 ${style.fontSize * 1.05}px "Snell Roundhand", "Segoe Script", "Bradley Hand", cursive`;
  ctx.textBaseline = "middle"; ctx.textAlign = style.align; ctx.fillStyle = style.textColor;
  const rows = wrapText(ctx, applyCase(line.text, style.textCase), maxWidth);
  const lineHeight = style.fontSize * style.lineSpacing * 1.08;
  const totalHeight = rows.length * lineHeight;
  const x = textX(style.align, w, pad);
  const reveal = smoothstep(clamp(lineProgress / 0.72));
  let y = h * 0.50 - totalHeight / 2 + lineHeight / 2;

  rows.forEach((row, index) => {
    const rowWidth = ctx.measureText(row).width;
    const rowProgress = clamp(reveal * rows.length - index);
    const left = style.align === "left" ? x : style.align === "right" ? x - rowWidth : x - rowWidth / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(left - style.fontSize * 0.08, y - lineHeight / 2, (rowWidth + style.fontSize * 0.16) * rowProgress, lineHeight);
    ctx.clip();
    ctx.globalAlpha = 0.96;
    ctx.fillText(row, x, y);
    ctx.restore();
    y += lineHeight;
  });
  ctx.restore();
}

function drawClassic(ctx, w, h, style, syncState) {
  const { line, lineProgress } = syncState;
  if (!line) return;
  const fadeIn = Math.min(1, lineProgress * 8);
  const fadeOut = lineProgress > 0.85 ? 1 - (lineProgress - 0.85) / 0.15 : 1;
  ctx.globalAlpha = Math.min(fadeIn, fadeOut);
  ctx.font = `500 ${style.fontSize * 0.8}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.textBaseline = "middle"; ctx.textAlign = style.align; ctx.fillStyle = style.textColor;
  const x = textX(style.align, w, w * 0.1);
  wrapAndDraw(ctx, applyCase(line.text, style.textCase), x, h * 0.82, w - w * 0.2, style.fontSize * style.lineSpacing);
  ctx.globalAlpha = 1;
}

function wrapAndDraw(ctx, text, x, centerY, maxWidth, lineHeight) {
  const rows = wrapText(ctx, text, maxWidth);
  const totalHeight = rows.length * lineHeight;
  let y = centerY - totalHeight / 2 + lineHeight / 2;
  for (const row of rows) { ctx.fillText(row, x, y); y += lineHeight; }
}

export function render(ctx, w, h, appState, mediaCache) {
  ctx.clearRect(0, 0, w, h);
  drawBackground(ctx, w, h, appState.background, mediaCache);
  const time = appState.playback.currentTime;
  const sync = getSyncState(appState.lyrics.lines, time);
  const baseStyle = appState.style;
  const effectProfile = baseStyle.effects?.[baseStyle.effect] || {};
  const style = { ...baseStyle, ...effectProfile };
  if (style.letterSpacing) ctx.letterSpacing = `${style.letterSpacing}px`;

  switch (baseStyle.effect) {
    case "apple": drawAppleMusic(ctx, w, h, style, sync, appState.lyrics.lines, time); break;
    case "brat": drawBrat(ctx, w, h, style, sync); break;
    case "eternal": drawHandwriting(ctx, w, h, style, sync); break;
    default: drawClassic(ctx, w, h, style, sync);
  }

  ctx.globalAlpha = 1; ctx.filter = "none"; ctx.letterSpacing = "0px";
  return sync;
}
