// renderer.js — one draw function, used by BOTH the live preview loop and
// the exporter. The original project's #1 complaint ("export doesn't match
// preview") almost always comes from preview and export using different
// rendering code paths. Here there is exactly one: render(ctx, ...).

import { getSyncState, getContext } from "./sync.js";

function applyCase(text, mode) {
  switch (mode) {
    case "upper":
      return text.toUpperCase();
    case "lower":
      return text.toLowerCase();
    case "title":
      return text.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
    default:
      return text;
  }
}

function drawBackground(ctx, w, h, bg, mediaCache) {
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
  } else if (bg.type === "image" && mediaCache.image) {
    drawCover(ctx, mediaCache.image, w, h, bg.blur);
  } else if (bg.type === "video" && mediaCache.video && mediaCache.video.readyState >= 2) {
    drawCover(ctx, mediaCache.video, w, h, bg.blur);
  } else {
    ctx.fillStyle = "#0A0A0A";
    ctx.fillRect(0, 0, w, h);
  }

  if (bg.dim > 0) {
    ctx.fillStyle = `rgba(0,0,0,${bg.dim})`;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
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
    // draw slightly oversized so blur doesn't reveal edges
    ctx.drawImage(media, dx - blur * 2, dy - blur * 2, dw + blur * 4, dh + blur * 4);
    ctx.filter = "none";
  } else {
    ctx.drawImage(media, dx, dy, dw, dh);
  }
}

function textX(align, w, pad) {
  if (align === "left") return pad;
  if (align === "right") return w - pad;
  return w / 2;
}

function wrapWords(ctx, words, maxWidth, gap) {
  // returns rows of word-refs with x offsets, for karaoke word-level layout
  const rows = [];
  let row = [];
  let rowWidth = 0;
  for (const wRef of words) {
    const wWidth = ctx.measureText(wRef.text + " ").width;
    if (rowWidth + wWidth > maxWidth && row.length) {
      rows.push(row);
      row = [];
      rowWidth = 0;
    }
    row.push({ ...wRef, w: wWidth });
    rowWidth += wWidth;
  }
  if (row.length) rows.push(row);
  return rows;
}

function drawKaraoke(ctx, w, h, style, syncState) {
  const { line, wordIndex, wordProgress } = syncState;
  if (!line) return;
  const fontWeight = 700;
  ctx.font = `${fontWeight} ${style.fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.textBaseline = "middle";
  const pad = w * 0.09;
  const maxWidth = w - pad * 2;

  const words = (line.words || []).map((wd, i) => ({ ...wd, text: applyCase(wd.text, style.textCase), i }));
  const rows = wrapWords(ctx, words, maxWidth, style.letterSpacing);
  const lineHeight = style.fontSize * style.lineSpacing;
  const totalHeight = rows.length * lineHeight;
  let y = h / 2 - totalHeight / 2 + lineHeight / 2;

  for (const row of rows) {
    const rowWidth = row.reduce((s, r) => s + r.w, 0);
    let x = style.align === "center" ? w / 2 - rowWidth / 2 : style.align === "right" ? w - pad - rowWidth : pad;
    for (const wRef of row) {
      const sung = wRef.i < wordIndex || (wRef.i === wordIndex && wordProgress >= 1);
      const active = wRef.i === wordIndex;
      ctx.textAlign = "left";
      if (sung) {
        ctx.fillStyle = style.accentColor;
      } else if (active) {
        // partial fill left-to-right within the word for a smooth sweep
        const cut = Math.max(0, Math.min(1, wordProgress));
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y - style.fontSize, wRef.w * cut, style.fontSize * 2);
        ctx.clip();
        ctx.fillStyle = style.accentColor;
        ctx.fillText(wRef.text, x, y);
        ctx.restore();
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + wRef.w * cut, y - style.fontSize, wRef.w * (1 - cut), style.fontSize * 2);
        ctx.clip();
        ctx.fillStyle = style.dimColor;
        ctx.fillText(wRef.text, x, y);
        ctx.restore();
        x += wRef.w;
        continue;
      } else {
        ctx.fillStyle = style.dimColor;
      }
      ctx.fillText(wRef.text, x, y);
      x += wRef.w;
    }
    y += lineHeight;
  }
}

function drawStack(ctx, w, h, style, syncState, lines) {
  const { lineIndex, lineProgress } = syncState;
  if (lineIndex < 0) return;
  const { prev, next } = getContext(lines, lineIndex, 2, 2);
  ctx.font = `700 ${style.fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = style.align;
  const x = textX(style.align, w, w * 0.09);
  const lh = style.fontSize * style.lineSpacing;

  const rowsAbove = prev.map((l, i) => ({ text: l.text, dy: -(prev.length - i) * lh, alpha: 0.28 + i * 0.12 }));
  const fadeIn = Math.min(1, lineProgress * 6);
  const current = { text: lines[lineIndex].text, dy: 0, alpha: 1, scale: 0.94 + 0.06 * fadeIn };
  const rowsBelow = next.map((l, i) => ({ text: l.text, dy: (i + 1) * lh, alpha: 0.28 + (next.length - 1 - i) * 0.12 }));

  for (const r of rowsAbove) {
    ctx.globalAlpha = r.alpha;
    ctx.fillStyle = style.textColor;
    ctx.fillText(applyCase(r.text, style.textCase), x, h / 2 + r.dy);
  }
  ctx.globalAlpha = current.alpha;
  ctx.fillStyle = style.accentColor;
  ctx.save();
  ctx.translate(x, h / 2);
  ctx.scale(current.scale, current.scale);
  ctx.fillText(applyCase(current.text, style.textCase), 0, 0);
  ctx.restore();
  for (const r of rowsBelow) {
    ctx.globalAlpha = r.alpha;
    ctx.fillStyle = style.textColor;
    ctx.fillText(applyCase(r.text, style.textCase), x, h / 2 + r.dy);
  }
  ctx.globalAlpha = 1;
}

function drawTypewriter(ctx, w, h, style, syncState) {
  const { line, lineProgress } = syncState;
  if (!line) return;
  const text = applyCase(line.text, style.textCase);
  const visibleChars = Math.round(text.length * Math.min(1, lineProgress * 1.15));
  const shown = text.slice(0, visibleChars);
  ctx.font = `700 ${style.fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = style.align;
  ctx.fillStyle = style.textColor;
  const x = textX(style.align, w, w * 0.09);
  wrapAndDraw(ctx, shown, x, h / 2, w - w * 0.18, style.fontSize * style.lineSpacing, style.align);
  // caret
  if (visibleChars < text.length) {
    ctx.fillStyle = style.accentColor;
    const metrics = ctx.measureText(shown.split("\n").pop() || "");
    const caretX = style.align === "center" ? x + metrics.width / 2 + 6 : style.align === "right" ? x - metrics.width - 6 : x + metrics.width + 6;
    ctx.fillRect(caretX, h / 2 - style.fontSize / 2, style.fontSize * 0.06, style.fontSize);
  }
}

function drawClassic(ctx, w, h, style, syncState) {
  const { line, lineProgress } = syncState;
  if (!line) return;
  const fadeIn = Math.min(1, lineProgress * 8);
  const fadeOut = lineProgress > 0.85 ? 1 - (lineProgress - 0.85) / 0.15 : 1;
  ctx.globalAlpha = Math.min(fadeIn, fadeOut);
  ctx.font = `500 ${style.fontSize * 0.8}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = style.align;
  ctx.fillStyle = style.textColor;
  const x = textX(style.align, w, w * 0.1);
  wrapAndDraw(ctx, applyCase(line.text, style.textCase), x, h * 0.82, w - w * 0.2, style.fontSize * style.lineSpacing, style.align);
  ctx.globalAlpha = 1;
}

function wrapAndDraw(ctx, text, x, centerY, maxWidth, lineHeight, align) {
  const words = text.split(" ");
  const rows = [];
  let row = "";
  for (const word of words) {
    const test = row ? row + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && row) {
      rows.push(row);
      row = word;
    } else {
      row = test;
    }
  }
  if (row) rows.push(row);
  const totalHeight = rows.length * lineHeight;
  let y = centerY - totalHeight / 2 + lineHeight / 2;
  for (const r of rows) {
    ctx.fillText(r, x, y);
    y += lineHeight;
  }
}

export function render(ctx, w, h, appState, mediaCache) {
  ctx.clearRect(0, 0, w, h);
  drawBackground(ctx, w, h, appState.background, mediaCache);

  const sync = getSyncState(appState.lyrics.lines, appState.playback.currentTime);
  const style = appState.style;

  if (style.letterSpacing) ctx.letterSpacing = `${style.letterSpacing}px`;

  switch (style.effect) {
    case "apple":
      drawKaraoke(ctx, w, h, style, sync);
      break;
    case "charli":
      drawStack(ctx, w, h, style, sync, appState.lyrics.lines);
      break;
    case "eternal":
      drawTypewriter(ctx, w, h, style, sync);
      break;
    default:
      drawClassic(ctx, w, h, style, sync);
  }

  ctx.letterSpacing = "0px";
  return sync;
}
