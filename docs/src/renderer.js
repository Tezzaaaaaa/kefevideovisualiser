// renderer.js — one draw function shared by preview and export.
// All lyric motion is derived from playback time so pause/seek/export remain in sync.

import { getSyncState } from "./sync.js";

const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const smoothstep = v => { const t = clamp(v); return t * t * (3 - 2 * t); };

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

function wrapWordRefs(ctx, words, maxWidth) {
  const rows = []; let row = [], width = 0;
  for (const ref of words) {
    const wordWidth = ctx.measureText(`${ref.text} `).width;
    if (row.length && width + wordWidth > maxWidth) { rows.push(row); row = []; width = 0; }
    row.push({ ...ref, w: wordWidth }); width += wordWidth;
  }
  if (row.length) rows.push(row);
  return rows;
}

function rowStartX(align, w, pad, rowWidth) {
  if (align === "left") return pad;
  if (align === "right") return w - pad - rowWidth;
  return (w - rowWidth) / 2;
}

function drawAppleWords(ctx, row, x, y, style, wordIndex, wordProgress, active) {
  for (const ref of row) {
    const width = ref.w;
    if (!active) {
      ctx.fillStyle = style.textColor;
      ctx.fillText(ref.text, x, y);
      x += width;
      continue;
    }
    const sung = ref.i < wordIndex || (ref.i === wordIndex && wordProgress >= 1);
    if (sung) {
      ctx.fillStyle = style.accentColor; ctx.fillText(ref.text, x, y);
    } else if (ref.i === wordIndex) {
      const cut = clamp(wordProgress);
      ctx.save(); ctx.beginPath(); ctx.rect(x, y - style.fontSize, width * cut, style.fontSize * 2); ctx.clip();
      ctx.fillStyle = style.accentColor; ctx.fillText(ref.text, x, y); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(x + width * cut, y - style.fontSize, width * (1 - cut), style.fontSize * 2); ctx.clip();
      ctx.fillStyle = style.dimColor; ctx.fillText(ref.text, x, y); ctx.restore();
      x += width; continue;
    } else {
      ctx.fillStyle = style.dimColor; ctx.fillText(ref.text, x, y);
    }
    x += width;
  }
}

function appleBlock(ctx, w, style, line, active, wordIndex, wordProgress) {
  const pad = w * 0.09, maxWidth = w - pad * 2;
  const sourceWords = (line?.words?.length ? line.words : String(line?.text || "").split(/\s+/).filter(Boolean).map(text => ({ text })));
  const words = sourceWords.map((word, i) => ({ ...word, text: applyCase(word.text, style.textCase), i }));
  const rows = wrapWordRefs(ctx, words, maxWidth);
  const lineHeight = style.fontSize * style.lineSpacing;
  return { rows, height: Math.max(lineHeight, rows.length * lineHeight), lineHeight, pad, active, wordIndex, wordProgress };
}

function drawAppleBlock(ctx, w, yCenter, style, block, alpha) {
  if (!block?.rows?.length || alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(alpha);
  let y = yCenter - block.height / 2 + block.lineHeight / 2;
  for (const row of block.rows) {
    const rowWidth = row.reduce((sum, ref) => sum + ref.w, 0);
    const x = rowStartX(style.align, w, block.pad, rowWidth);
    drawAppleWords(ctx, row, x, y, style, block.wordIndex, block.wordProgress, block.active);
    y += block.lineHeight;
  }
  ctx.restore();
}

function drawAppleMusic(ctx, w, h, style, syncState, lines) {
  const { lineIndex, wordIndex, wordProgress, lineProgress } = syncState;
  if (lineIndex < 0 || !lines[lineIndex]) return;
  ctx.font = `700 ${style.fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.textBaseline = "middle"; ctx.textAlign = "left";

  const prevLine = lines[lineIndex - 1], currentLine = lines[lineIndex], nextLine = lines[lineIndex + 1], next2Line = lines[lineIndex + 2];
  const prev = prevLine ? appleBlock(ctx, w, style, prevLine, false, -1, 0) : null;
  const current = appleBlock(ctx, w, style, currentLine, true, wordIndex, wordProgress);
  const next = nextLine ? appleBlock(ctx, w, style, nextLine, false, -1, 0) : null;
  const next2 = next2Line ? appleBlock(ctx, w, style, next2Line, false, -1, 0) : null;

  const transition = next ? smoothstep((lineProgress - 0.78) / 0.22) : 0;
  const gap = style.fontSize * 0.78;
  const currentToNext = next ? current.height / 2 + next.height / 2 + gap : 0;
  const prevToCurrent = prev ? prev.height / 2 + current.height / 2 + gap : 0;
  const nextToNext2 = next && next2 ? next.height / 2 + next2.height / 2 + gap : 0;
  const focusY = h * 0.50;
  const shift = currentToNext * transition;

  if (prev) drawAppleBlock(ctx, w, focusY - prevToCurrent - shift, style, prev, 0.20 * (1 - transition));
  drawAppleBlock(ctx, w, focusY - shift, style, current, 1 - 0.56 * transition);
  if (next) drawAppleBlock(ctx, w, focusY + currentToNext - shift, style, next, 0.32 + 0.68 * transition);
  if (next2) drawAppleBlock(ctx, w, focusY + currentToNext + nextToNext2 - shift, style, next2, 0.16 + 0.12 * transition);
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
  const sync = getSyncState(appState.lyrics.lines, appState.playback.currentTime);
  const baseStyle = appState.style;
  const effectProfile = baseStyle.effects?.[baseStyle.effect] || {};
  const style = { ...baseStyle, ...effectProfile };
  if (style.letterSpacing) ctx.letterSpacing = `${style.letterSpacing}px`;

  switch (baseStyle.effect) {
    case "apple": drawAppleMusic(ctx, w, h, style, sync, appState.lyrics.lines); break;
    case "brat": drawBrat(ctx, w, h, style, sync); break;
    case "eternal": drawHandwriting(ctx, w, h, style, sync); break;
    default: drawClassic(ctx, w, h, style, sync);
  }

  ctx.globalAlpha = 1; ctx.filter = "none"; ctx.letterSpacing = "0px";
  return sync;
}
