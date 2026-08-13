// renderer.js — one renderer shared by preview and export.
// Every effect is derived from playback time so seeking and export stay deterministic.

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

function drawCover(ctx, media, w, h, blur) {
  const mw = media.videoWidth || media.width;
  const mh = media.videoHeight || media.height;
  if (!mw || !mh) return;
  const scale = Math.max(w / mw, h / mh);
  const dw = mw * scale, dh = mh * scale;
  const dx = (w - dw) / 2, dy = (h - dh) / 2;
  if (blur > 0) {
    ctx.filter = `blur(${blur}px)`;
    ctx.drawImage(media, dx - blur * 2, dy - blur * 2, dw + blur * 4, dh + blur * 4);
    ctx.filter = "none";
  } else {
    ctx.drawImage(media, dx, dy, dw, dh);
  }
}

function hexToRgba(hex, alpha) {
  const value = String(hex || "#000000").replace("#", "");
  const expanded = value.length === 3 ? value.split("").map(c => c + c).join("") : value.padEnd(6, "0").slice(0, 6);
  const n = Number.parseInt(expanded, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${clamp(Number(alpha) || 0)})`;
}

function drawBackground(ctx, w, h, bg, mediaCache) {
  ctx.save();
  if (bg.type === "solid") {
    ctx.fillStyle = bg.solid;
    ctx.fillRect(0, 0, w, h);
  } else if (bg.type === "gradient") {
    const rad = (bg.gradientAngle * Math.PI) / 180;
    const x1 = w / 2 - Math.cos(rad) * w, y1 = h / 2 - Math.sin(rad) * h;
    const x2 = w / 2 + Math.cos(rad) * w, y2 = h / 2 + Math.sin(rad) * h;
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, bg.gradientFrom);
    grad.addColorStop(1, bg.gradientTo);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else if (bg.type === "image" && mediaCache.image) {
    drawCover(ctx, mediaCache.image, w, h, bg.blur);
  } else if (bg.type === "video" && mediaCache.video && mediaCache.video.readyState >= 2) {
    drawCover(ctx, mediaCache.video, w, h, bg.blur);
  } else {
    ctx.fillStyle = "#0A0A0A";
    ctx.fillRect(0, 0, w, h);
  }
  if (bg.dim > 0) {
    ctx.fillStyle = `rgba(0,0,0,${clamp(bg.dim)})`;
    ctx.fillRect(0, 0, w, h);
  }
  if (bg.hazeEnabled && bg.hazeOpacity > 0) {
    ctx.fillStyle = hexToRgba(bg.hazeColor, bg.hazeOpacity);
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

function textX(align, w, pad) {
  if (align === "left") return pad;
  if (align === "right") return w - pad;
  return w / 2;
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const rows = [];
  let row = "";
  for (const word of words) {
    const test = row ? `${row} ${word}` : word;
    if (row && ctx.measureText(test).width > maxWidth) {
      rows.push(row);
      row = word;
    } else {
      row = test;
    }
  }
  if (row) rows.push(row);
  return rows.length ? rows : [""];
}

function rowStartX(align, w, pad, rowWidth) {
  if (align === "left") return pad;
  if (align === "right") return w - pad - rowWidth;
  return (w - rowWidth) / 2;
}

// Apple remains intentionally simple on the Brat branch; Apple-specific work
// lives on feat/apple-music-effect.
function drawAppleMusic(ctx, w, h, style, syncState, lines) {
  const { lineIndex, wordIndex, wordProgress, lineProgress } = syncState;
  if (lineIndex < 0 || !lines[lineIndex]) return;
  ctx.save();
  ctx.font = `700 ${style.fontSize}px -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = style.align;
  const current = lines[lineIndex];
  const next = lines[lineIndex + 1];
  const pad = w * 0.09;
  const x = textX(style.align, w, pad);
  const transition = next ? smoothstep((lineProgress - 0.78) / 0.22) : 0;
  const currentY = h * 0.50 - style.fontSize * 1.3 * transition;
  const nextY = h * 0.50 + style.fontSize * 1.3 * (1 - transition);
  ctx.fillStyle = style.accentColor;
  ctx.globalAlpha = 1 - transition * 0.65;
  const rows = wrapText(ctx, applyCase(current.text, style.textCase), w - pad * 2);
  rows.forEach((row, i) => ctx.fillText(row, x, currentY + (i - (rows.length - 1) / 2) * style.fontSize * style.lineSpacing));
  if (next) {
    ctx.globalAlpha = 0.3 + transition * 0.7;
    ctx.fillStyle = style.dimColor;
    const nextRows = wrapText(ctx, applyCase(next.text, style.textCase), w - pad * 2);
    nextRows.forEach((row, i) => ctx.fillText(row, x, nextY + (i - (nextRows.length - 1) / 2) * style.fontSize * style.lineSpacing));
  }
  void wordIndex; void wordProgress;
  ctx.restore();
}

function bratSourceWords(line) {
  if (line?.words?.length) return line.words.map((word, i) => ({ ...word, index: i, realTiming: true }));
  return String(line?.text || "").split(/\s+/).filter(Boolean).map((text, i) => ({
    text,
    index: i,
    time: line?.time,
    endTime: line?.endTime,
    realTiming: false,
  }));
}

function layoutBratLine(ctx, line, maxWidth, stretchX) {
  const words = bratSourceWords(line).map(ref => ({ ...ref, text: String(ref.text || "").toLowerCase() }));
  const space = ctx.measureText(" ").width;
  const rawMax = maxWidth / stretchX;
  const rows = [];
  let row = [], width = 0;
  for (const word of words) {
    const textWidth = ctx.measureText(word.text).width;
    const advance = textWidth + space;
    if (row.length && width + advance > rawMax) {
      rows.push({ words: row, width: Math.max(0, width - space) });
      row = [];
      width = 0;
    }
    row.push({ ...word, textWidth, advance });
    width += advance;
  }
  if (row.length) rows.push({ words: row, width: Math.max(0, width - space) });
  return rows;
}

function buildBratPages(ctx, lines, w, h, style) {
  const top = h * 0.065;
  const bottom = h * 0.935;
  const available = bottom - top;
  const pad = w * 0.075;
  const maxWidth = w - pad * 2;
  const stretchX = 1.12;
  const squashY = 0.88;
  const rowHeight = style.fontSize * 1.12 * squashY;
  const minGap = style.fontSize * 0.42;
  const blocks = lines.map((line, lineIndex) => {
    const rows = layoutBratLine(ctx, line, maxWidth, stretchX);
    const height = Math.max(rowHeight, rows.length * rowHeight);
    return { line, lineIndex, rows, height };
  });

  const pages = [];
  let page = [], used = 0;
  for (const block of blocks) {
    const added = block.height + (page.length ? minGap : 0);
    if (page.length && used + added > available) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push(block);
    used += block.height + (page.length > 1 ? minGap : 0);
  }
  if (page.length) pages.push(page);

  return { pages, top, bottom, pad, stretchX, squashY, rowHeight, minGap };
}

function currentBratPage(pages, lineIndex) {
  if (lineIndex < 0) return null;
  return pages.find(page => page.some(block => block.lineIndex === lineIndex)) || null;
}

function bratWordVisible(ref, line, time) {
  if (!Number.isFinite(line?.time) || time < line.time) return false;
  if (!line?.words?.length) return true;
  return Number.isFinite(ref.time) && time >= ref.time;
}

function drawBratWord(ctx, ref, x, y, line, time, stretchX, squashY) {
  if (!bratWordVisible(ref, line, time)) return;
  const born = line.words?.length ? ref.time : line.time;
  const age = Math.max(0, time - (Number(born) || 0));
  // Deliberately abrupt: one short impact frame, then the word is fixed.
  const impact = age < 0.055 ? 1.07 : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(stretchX * impact, squashY);
  ctx.fillText(ref.text, 0, 0);
  ctx.restore();
}

function drawBrat(ctx, w, h, style, syncState, lines, time) {
  const { lineIndex } = syncState;
  if (lineIndex < 0 || !lines[lineIndex]) return;

  ctx.save();
  ctx.font = `400 ${style.fontSize}px "Arial Narrow", Arial, sans-serif`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillStyle = "#101010";
  ctx.filter = "blur(0.42px)";
  ctx.globalAlpha = 0.98;

  const layout = buildBratPages(ctx, lines, w, h, style);
  const page = currentBratPage(layout.pages, lineIndex);
  if (!page) { ctx.restore(); return; }

  const totalHeights = page.reduce((sum, block) => sum + block.height, 0);
  const remaining = Math.max(0, (layout.bottom - layout.top) - totalHeights);
  const gap = page.length > 1 ? Math.max(layout.minGap, remaining / (page.length - 1)) : 0;
  let y = layout.top;

  for (const block of page) {
    let rowY = y;
    for (const row of block.rows) {
      const scaledRowWidth = row.width * layout.stretchX;
      const startX = rowStartX(style.align, w, layout.pad, scaledRowWidth);
      let rawX = 0;
      for (const ref of row.words) {
        const x = startX + rawX * layout.stretchX;
        drawBratWord(ctx, ref, x, rowY, block.line, time, layout.stretchX, layout.squashY);
        rawX += ref.advance;
      }
      rowY += layout.rowHeight;
    }
    y += block.height + gap;
  }
  ctx.restore();
}

function drawHandwriting(ctx, w, h, style, syncState) {
  const { line, lineProgress } = syncState;
  if (!line) return;
  const pad = w * 0.10, maxWidth = w - pad * 2;
  ctx.save();
  ctx.font = `500 ${style.fontSize * 1.05}px "Snell Roundhand", "Segoe Script", "Bradley Hand", cursive`;
  ctx.textBaseline = "middle";
  ctx.textAlign = style.align;
  ctx.fillStyle = style.textColor;
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
  ctx.save();
  ctx.globalAlpha = Math.min(fadeIn, fadeOut);
  ctx.font = `500 ${style.fontSize * 0.8}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = style.align;
  ctx.fillStyle = style.textColor;
  const x = textX(style.align, w, w * 0.1);
  const rows = wrapText(ctx, applyCase(line.text, style.textCase), w - w * 0.2);
  const lineHeight = style.fontSize * style.lineSpacing;
  rows.forEach((row, i) => ctx.fillText(row, x, h * 0.82 + (i - (rows.length - 1) / 2) * lineHeight));
  ctx.restore();
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
    case "apple": drawAppleMusic(ctx, w, h, style, sync, appState.lyrics.lines); break;
    case "brat": drawBrat(ctx, w, h, style, sync, appState.lyrics.lines, time); break;
    case "eternal": drawHandwriting(ctx, w, h, style, sync); break;
    default: drawClassic(ctx, w, h, style, sync);
  }

  ctx.globalAlpha = 1;
  ctx.filter = "none";
  ctx.letterSpacing = "0px";
  return sync;
}
