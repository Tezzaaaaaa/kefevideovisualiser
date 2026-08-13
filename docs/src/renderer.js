// renderer.js — shared preview/export renderer.
// Every effect is derived from the same playback clock. No CSS animation timers.

import { getSyncState } from "./sync.js";

const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = v => {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};
const smootherstep = v => {
  const t = clamp(v);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

function applyCase(text, mode) {
  switch (mode) {
    case "upper": return String(text || "").toUpperCase();
    case "lower": return String(text || "").toLowerCase();
    case "title": return String(text || "").replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
    default: return String(text || "");
  }
}

function drawCover(ctx, media, w, h, blur) {
  const mw = media.videoWidth || media.width;
  const mh = media.videoHeight || media.height;
  if (!mw || !mh) return;
  const scale = Math.max(w / mw, h / mh);
  const dw = mw * scale;
  const dh = mh * scale;
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;
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
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${clamp(Number(alpha) || 0)})`;
}

function drawBackground(ctx, w, h, bg, media) {
  ctx.save();
  if (bg.type === "solid") {
    ctx.fillStyle = bg.solid;
    ctx.fillRect(0, 0, w, h);
  } else if (bg.type === "gradient") {
    const rad = (bg.gradientAngle * Math.PI) / 180;
    const x1 = w / 2 - Math.cos(rad) * w;
    const y1 = h / 2 - Math.sin(rad) * h;
    const x2 = w / 2 + Math.cos(rad) * w;
    const y2 = h / 2 + Math.sin(rad) * h;
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, bg.gradientFrom);
    grad.addColorStop(1, bg.gradientTo);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else if (bg.type === "image" && media.image) {
    drawCover(ctx, media.image, w, h, bg.blur);
  } else if (bg.type === "video" && media.video && media.video.readyState >= 2) {
    drawCover(ctx, media.video, w, h, bg.blur);
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

function rowStartX(align, w, pad, rowWidth) {
  if (align === "left") return pad;
  if (align === "right") return w - pad - rowWidth;
  return (w - rowWidth) / 2;
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const rows = [];
  let row = "";
  for (const word of words) {
    const candidate = row ? `${row} ${word}` : word;
    if (row && ctx.measureText(candidate).width > maxWidth) {
      rows.push(row);
      row = word;
    } else {
      row = candidate;
    }
  }
  if (row) rows.push(row);
  return rows.length ? rows : [""];
}

// ---------------- Apple Music ----------------

// LRCLIB normally supplies line-level LRC. Real enhanced timings are always
// preferred. When only a line span exists, estimate word windows so the
// visual never turns the whole sentence on at once.
function appleWordsForLine(line) {
  if (line?.words?.length) {
    return line.words.map(word => ({ ...word, estimated: false }));
  }
  const tokens = String(line?.text || "").split(/\s+/).filter(Boolean);
  if (!tokens.length || !Number.isFinite(line?.time) || !Number.isFinite(line?.endTime)) return [];
  const start = line.time;
  const duration = Math.max(0.12, line.endTime - start);
  const weights = tokens.map(token => {
    const letters = Array.from(token.replace(/[^\p{L}\p{N}]/gu, "")).length || Array.from(token).length || 1;
    const punctuation = /[,.!?;:]$/.test(token) ? 0.42 : 0;
    return Math.max(0.75, Math.pow(letters, 0.72)) + punctuation;
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0) || tokens.length;
  let cursor = 0;
  return tokens.map((text, index) => {
    const wordStart = start + duration * (cursor / total);
    cursor += weights[index];
    const wordEnd = start + duration * (cursor / total);
    return {
      text,
      time: wordStart,
      endTime: Math.max(wordStart + 0.05, wordEnd),
      estimated: true,
    };
  });
}

function appleFocusEnvelope(word, time) {
  if (!Number.isFinite(word?.time) || !Number.isFinite(word?.endTime)) return 0;
  const duration = Math.max(0.05, word.endTime - word.time);
  const attack = Math.min(0.11, Math.max(0.035, duration * 0.22));
  const release = Math.min(0.15, Math.max(0.05, duration * 0.25));
  if (time < word.time) return 0;
  if (time < word.time + attack) return smootherstep((time - word.time) / attack);
  if (time <= word.endTime) return 1;
  if (time < word.endTime + release) return 1 - smootherstep((time - word.endTime) / release);
  return 0;
}

function glyphLayout(ctx, text) {
  const glyphs = Array.from(text);
  let before = "";
  return glyphs.map(glyph => {
    const x = ctx.measureText(before).width;
    before += glyph;
    return { glyph, x };
  });
}

function drawAppleTimedWord(ctx, ref, x, y, style, time) {
  const text = ref.text;
  const width = ref.textWidth;
  const start = Number(ref.time);
  const end = Number(ref.endTime);
  const active = Number.isFinite(start) && Number.isFinite(end) && time >= start && time < end;
  const completed = Number.isFinite(end) && time >= end;
  const focus = appleFocusEnvelope(ref, time);
  const scale = 1 + focus * 0.026;
  const lift = focus * style.fontSize * 0.012;

  ctx.save();
  ctx.translate(x + width / 2, y - lift);
  ctx.scale(scale, scale);
  const left = -width / 2;

  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  ctx.fillStyle = style.dimColor;
  ctx.fillText(text, left, 0);

  if (completed) {
    ctx.fillStyle = style.accentColor;
    ctx.fillText(text, left, 0);
    ctx.restore();
    return;
  }
  if (!active) {
    ctx.restore();
    return;
  }

  const duration = Math.max(0.05, end - start);
  const rawProgress = clamp((time - start) / duration);
  // Long sung words finish their letter sweep early and then stay fully lit.
  const holdShare = clamp((duration - 0.62) / 3.4, 0, 0.34);
  const sweepProgress = clamp(rawProgress / Math.max(0.58, 1 - holdShare));
  const glyphs = glyphLayout(ctx, text);
  const count = Math.max(1, glyphs.length);

  glyphs.forEach(({ glyph, x: gx }, index) => {
    const begin = index / count;
    const finish = (index + 1) / count;
    const local = clamp((sweepProgress - begin) / Math.max(0.001, finish - begin));
    if (local <= 0) return;
    ctx.save();
    ctx.globalAlpha = smootherstep(local);
    ctx.fillStyle = style.accentColor;
    ctx.fillText(glyph, left + gx, 0);
    ctx.restore();
  });
  ctx.restore();
}

function appleBlock(ctx, w, style, line) {
  const pad = w * 0.075;
  const maxWidth = w - pad * 2;
  const source = appleWordsForLine(line);
  const space = ctx.measureText(" ").width;
  const words = source.map((word, index) => {
    const text = applyCase(word.text, style.textCase);
    const textWidth = ctx.measureText(text).width;
    return { ...word, text, index, textWidth, advance: textWidth + space };
  });

  const rows = [];
  let row = [];
  let rowWidth = 0;
  for (const ref of words) {
    if (row.length && rowWidth + ref.advance > maxWidth) {
      rows.push(row);
      row = [];
      rowWidth = 0;
    }
    row.push(ref);
    rowWidth += ref.advance;
  }
  if (row.length) rows.push(row);

  const lineHeight = style.fontSize * Math.max(1.12, style.lineSpacing * 0.98);
  return {
    line,
    rows,
    pad,
    lineHeight,
    height: Math.max(lineHeight, rows.length * lineHeight),
  };
}

function drawAppleBlock(ctx, w, yCenter, style, block, alpha, time, blockScale = 1) {
  if (!block?.rows?.length || alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.translate(w / 2, yCenter);
  ctx.scale(blockScale, blockScale);
  ctx.translate(-w / 2, -yCenter);

  let y = yCenter - block.height / 2 + block.lineHeight / 2;
  const space = ctx.measureText(" ").width;
  for (const row of block.rows) {
    const rowWidth = row.reduce((sum, ref) => sum + ref.advance, 0) - (row.length ? space : 0);
    let x = rowStartX(style.align, w, block.pad, rowWidth);
    for (const ref of row) {
      drawAppleTimedWord(ctx, ref, x, y, style, time);
      x += ref.advance;
    }
    y += block.lineHeight;
  }
  ctx.restore();
}

function appleFlowIndex(lines, time) {
  if (!lines?.length) return -1;
  let current = -1;
  for (let i = 0; i < lines.length; i++) {
    if (Number.isFinite(lines[i].time) && time >= lines[i].time) current = i;
    else break;
  }
  if (current < 0) return -1;

  // Keep the transition continuous on both sides of a line boundary instead
  // of resetting animation progress when lineIndex changes.
  const boundaryIndex = current + 1 < lines.length ? current + 1 : current;
  const boundary = lines[boundaryIndex]?.time;
  if (boundaryIndex > current && Number.isFinite(boundary)) {
    const gap = Math.max(0.15, boundary - lines[current].time);
    const lead = Math.min(0.30, Math.max(0.16, gap * 0.17));
    const settle = Math.min(0.16, Math.max(0.08, gap * 0.08));
    const start = boundary - lead;
    const end = boundary + settle;
    if (time >= start && time <= end) return current + smootherstep((time - start) / (end - start));
  }

  if (current > 0 && Number.isFinite(lines[current].time)) {
    const boundaryTime = lines[current].time;
    const previousGap = Math.max(0.15, boundaryTime - lines[current - 1].time);
    const lead = Math.min(0.30, Math.max(0.16, previousGap * 0.17));
    const settle = Math.min(0.16, Math.max(0.08, previousGap * 0.08));
    const start = boundaryTime - lead;
    const end = boundaryTime + settle;
    if (time >= start && time <= end) return (current - 1) + smootherstep((time - start) / (end - start));
  }

  return current;
}

function drawApple(ctx, w, h, style, lines, time) {
  const flow = appleFlowIndex(lines, time);
  if (flow < 0) return;

  ctx.save();
  ctx.font = `700 ${style.fontSize}px system-ui,-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  // Apple Music's large lyric face is compact rather than loosely tracked.
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${-Math.max(0.35, style.fontSize * 0.014)}px`;

  const baseIndex = Math.floor(flow);
  const fraction = clamp(flow - baseIndex);
  const indices = [];
  for (let i = Math.max(0, baseIndex - 1); i <= Math.min(lines.length - 1, baseIndex + 3); i++) indices.push(i);
  const blocks = new Map(indices.map(index => [index, appleBlock(ctx, w, style, lines[index])]));
  const gap = style.fontSize * 0.74;
  const baseBlock = blocks.get(baseIndex);
  if (!baseBlock) {
    ctx.restore();
    return;
  }

  const nextBlock = blocks.get(baseIndex + 1);
  const baseToNext = nextBlock ? baseBlock.height / 2 + gap + nextBlock.height / 2 : 0;
  const centers = new Map();
  centers.set(baseIndex, h * 0.48 - baseToNext * fraction);

  for (let i = baseIndex + 1; i <= baseIndex + 3; i++) {
    const prev = blocks.get(i - 1);
    const block = blocks.get(i);
    if (!prev || !block) continue;
    centers.set(i, centers.get(i - 1) + prev.height / 2 + gap + block.height / 2);
  }
  for (let i = baseIndex - 1; i >= Math.max(0, baseIndex - 1); i--) {
    const next = blocks.get(i + 1);
    const block = blocks.get(i);
    if (!next || !block) continue;
    centers.set(i, centers.get(i + 1) - next.height / 2 - gap - block.height / 2);
  }

  for (const index of indices) {
    const block = blocks.get(index);
    const y = centers.get(index);
    if (!block || !Number.isFinite(y)) continue;
    const distance = Math.abs(index - flow);
    const alpha = clamp(Math.exp(-1.25 * distance), 0.08, 1);
    const scale = lerp(1, 0.955, clamp(distance / 2.2));
    drawAppleBlock(ctx, w, y, style, block, alpha, time, scale);
  }

  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  ctx.restore();
}

// ---------------- Brat ----------------

// Exact positional rhythm of the white deluxe cover. Successive lyric words
// occupy these fixed slots; they do not typeset into ordinary sentences.
const BRAT_SLOTS = [
  { x: 0.075, y: 0.12, align: "left",   max: 0.27 },
  { x: 0.50,  y: 0.12, align: "center", max: 0.25 },
  { x: 0.925, y: 0.12, align: "right",  max: 0.25 },

  { x: 0.075, y: 0.31, align: "left",   max: 0.25 },
  { x: 0.50,  y: 0.31, align: "center", max: 0.28 },
  { x: 0.925, y: 0.31, align: "right",  max: 0.23 },

  { x: 0.075, y: 0.50, align: "left",   max: 0.34 },
  { x: 0.925, y: 0.50, align: "right",  max: 0.30 },

  { x: 0.075, y: 0.69, align: "left",   max: 0.28 },
  { x: 0.925, y: 0.69, align: "right",  max: 0.34 },

  { x: 0.075, y: 0.88, align: "left",   max: 0.22 },
  { x: 0.50,  y: 0.88, align: "center", max: 0.22 },
  { x: 0.925, y: 0.88, align: "right",  max: 0.22 },
];

let bratFlattenCache = null;
const bratSpriteCache = new Map();

function bratFont(fontSize) {
  return `400 ${fontSize}px "Arial Narrow","PT Sans Narrow",Arial,sans-serif`;
}

function flattenBratWords(lines) {
  if (bratFlattenCache?.lines === lines) return bratFlattenCache.words;
  const words = [];
  lines.forEach((line, lineIndex) => {
    if (line?.words?.length) {
      line.words.forEach((word, wordIndex) => {
        words.push({
          text: String(word.text || "").toLowerCase(),
          time: word.time,
          endTime: word.endTime,
          lineIndex,
          wordIndex,
          realTiming: true,
        });
      });
    } else {
      String(line?.text || "").split(/\s+/).filter(Boolean).forEach((text, wordIndex) => {
        words.push({
          text: text.toLowerCase(),
          time: line?.time,
          endTime: line?.endTime,
          lineIndex,
          wordIndex,
          realTiming: false,
        });
      });
    }
  });
  bratFlattenCache = { lines, words };
  return words;
}

function bratSprite(text, fontSize) {
  const key = `${Math.round(fontSize * 10) / 10}:${text}`;
  if (bratSpriteCache.has(key)) return bratSpriteCache.get(key);

  const rasterScale = 0.58;
  const pad = Math.max(3, fontSize * 0.12);
  const probeCanvas = document.createElement("canvas");
  const probe = probeCanvas.getContext("2d");
  probe.font = bratFont(fontSize);
  const metrics = probe.measureText(text);
  const textWidth = Math.max(1, metrics.width);
  const textHeight = Math.max(fontSize * 1.22, (metrics.actualBoundingBoxAscent || fontSize) + (metrics.actualBoundingBoxDescent || fontSize * 0.24));
  const fullWidth = Math.ceil(textWidth + pad * 2);
  const fullHeight = Math.ceil(textHeight + pad * 2);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(fullWidth * rasterScale));
  canvas.height = Math.max(1, Math.ceil(fullHeight * rasterScale));
  const sprite = canvas.getContext("2d");
  sprite.scale(rasterScale, rasterScale);
  sprite.font = bratFont(fontSize);
  sprite.textBaseline = "middle";
  sprite.textAlign = "left";
  sprite.fillStyle = "#111111";
  sprite.globalAlpha = 0.99;
  sprite.fillText(text, pad, fullHeight / 2);

  const result = { canvas, fullWidth, fullHeight, pad };
  bratSpriteCache.set(key, result);
  return result;
}

function drawBratSlotWord(ctx, item, slot, w, h, baseSize, time) {
  if (!Number.isFinite(item?.time) || time < item.time) return;

  const stretchX = 1.06;
  const stretchY = 1.045;
  const probe = document.createElement("canvas").getContext("2d");
  probe.font = bratFont(baseSize);
  const measured = Math.max(1, probe.measureText(item.text).width * stretchX);
  const fit = Math.min(1, (w * slot.max) / measured);
  const fontSize = Math.max(baseSize * 0.58, baseSize * fit);
  const sprite = bratSprite(item.text, fontSize);

  const age = Math.max(0, time - item.time);
  const impact = age < 0.048 ? 1.055 : 1;
  const x = w * slot.x;
  const y = h * slot.y;

  let anchor = 0;
  if (slot.align === "center") anchor = sprite.fullWidth / 2;
  if (slot.align === "right") anchor = sprite.fullWidth;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(stretchX * impact, stretchY * impact);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "low";
  ctx.drawImage(
    sprite.canvas,
    -anchor,
    -sprite.fullHeight / 2,
    sprite.fullWidth,
    sprite.fullHeight,
  );
  ctx.restore();
}

function drawBrat(ctx, w, h, style, lines, time) {
  const words = flattenBratWords(lines);
  if (!words.length) return;

  let lastVisible = -1;
  for (let i = 0; i < words.length; i++) {
    if (Number.isFinite(words[i].time) && time >= words[i].time) lastVisible = i;
    else break;
  }
  if (lastVisible < 0) return;

  const pageSize = BRAT_SLOTS.length;
  const pageIndex = Math.floor(lastVisible / pageSize);
  const pageStart = pageIndex * pageSize;
  const pageEnd = Math.min(words.length, pageStart + pageSize);

  ctx.save();
  for (let i = pageStart; i < pageEnd; i++) {
    if (i > lastVisible) break;
    drawBratSlotWord(ctx, words[i], BRAT_SLOTS[i - pageStart], w, h, style.fontSize, time);
  }
  ctx.restore();
}

// ---------------- Eternal Sunshine ----------------

function eternalTimedReveal(line, sync) {
  if (!line?.words?.length) return smootherstep(clamp(sync.lineProgress / 0.80));
  const words = line.words;
  const total = words.reduce((sum, word) => sum + Array.from(String(word.text || "")).length, 0) + Math.max(0, words.length - 1);
  if (!total || sync.wordIndex < 0) return 0;
  let completed = 0;
  for (let i = 0; i < sync.wordIndex; i++) completed += Array.from(String(words[i].text || "")).length + 1;
  const current = words[sync.wordIndex];
  completed += Array.from(String(current?.text || "")).length * clamp(sync.wordProgress);
  return clamp(completed / total);
}

function eternalRowReveal(globalReveal, rows, index) {
  const counts = rows.map(row => Math.max(1, Array.from(row).length));
  const total = counts.reduce((a, b) => a + b, 0) + Math.max(0, rows.length - 1);
  const before = counts.slice(0, index).reduce((a, b) => a + b, 0) + index;
  return clamp((globalReveal * total - before) / counts[index]);
}

function eternalLayout(ctx, w, h, style, text) {
  const pad = w * 0.085;
  const maxWidth = w - pad * 2;
  let fontSize = style.fontSize * 1.02;
  let rows = [];
  let lineHeight = 0;

  for (let pass = 0; pass < 3; pass++) {
    ctx.font = `${fontSize}px "Homemade Apple", cursive`;
    rows = wrapText(ctx, text, maxWidth);
    lineHeight = fontSize * 1.58;
    const totalHeight = rows.length * lineHeight;
    if (totalHeight <= h * 0.70 || fontSize <= style.fontSize * 0.64) break;
    fontSize *= (h * 0.70) / totalHeight;
  }
  return { pad, maxWidth, fontSize, rows, lineHeight, totalHeight: rows.length * lineHeight };
}

function drawEternal(ctx, w, h, style, sync) {
  const { line, lineProgress } = sync;
  if (!line) return;

  ctx.save();
  const text = applyCase(line.text, style.textCase);
  const layout = eternalLayout(ctx, w, h, style, text);
  ctx.font = `${layout.fontSize}px "Homemade Apple", cursive`;
  ctx.textBaseline = "middle";
  ctx.textAlign = style.align;
  ctx.fillStyle = style.textColor;
  const x = textX(style.align, w, layout.pad);
  const reveal = eternalTimedReveal(line, sync);
  const fadeOut = lineProgress > 0.955 ? 1 - smootherstep((lineProgress - 0.955) / 0.045) : 1;
  ctx.globalAlpha = 0.99 * fadeOut;

  let y = h * 0.50 - layout.totalHeight / 2 + layout.lineHeight / 2;
  layout.rows.forEach((row, index) => {
    const width = ctx.measureText(row).width;
    const progress = eternalRowReveal(reveal, layout.rows, index);
    const left = style.align === "left" ? x : style.align === "right" ? x - width : x - width / 2;
    if (progress > 0) {
      // Clip only in the writing direction. The old row-height clip cut off
      // Homemade Apple's tall ascenders and descenders.
      ctx.save();
      ctx.beginPath();
      ctx.rect(
        left - layout.fontSize * 0.18,
        0,
        (width + layout.fontSize * 0.36) * progress,
        h,
      );
      ctx.clip();
      ctx.fillText(row, x, y);
      ctx.restore();
    }
    y += layout.lineHeight;
  });
  ctx.restore();
}

function drawClassic(ctx, w, h, style, sync) {
  if (!sync.line) return;
  ctx.save();
  ctx.font = `500 ${style.fontSize * 0.8}px "Helvetica Neue",Arial,sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = style.align;
  ctx.fillStyle = style.textColor;
  const x = textX(style.align, w, w * 0.1);
  const rows = wrapText(ctx, applyCase(sync.line.text, style.textCase), w * 0.8);
  rows.forEach((row, i) => ctx.fillText(row, x, h * 0.82 + (i - (rows.length - 1) / 2) * style.fontSize * style.lineSpacing));
  ctx.restore();
}

export function render(ctx, w, h, appState, mediaCache) {
  ctx.clearRect(0, 0, w, h);
  drawBackground(ctx, w, h, appState.background, mediaCache);
  const time = appState.playback.currentTime;
  const sync = getSyncState(appState.lyrics.lines, time);
  const base = appState.style;
  const profile = base.effects?.[base.effect] || {};
  const style = { ...base, ...profile };

  switch (base.effect) {
    case "apple":
      drawApple(ctx, w, h, style, appState.lyrics.lines, time);
      break;
    case "brat":
      drawBrat(ctx, w, h, style, appState.lyrics.lines, time);
      break;
    case "eternal":
      drawEternal(ctx, w, h, style, sync);
      break;
    default:
      drawClassic(ctx, w, h, style, sync);
  }

  ctx.globalAlpha = 1;
  ctx.filter = "none";
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  return sync;
}
