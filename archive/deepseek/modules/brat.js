import { linaClamp, linaSmoother, linaNormaliseLine, hasFiniteNumber } from '../core/utils.js';
import { appleWordsForLine } from './apple.js';

export function buildBratWords(lines) {
    const output = [];
    for (let i = 0; i < lines.length; i++) {
        const line = linaNormaliseLine(lines, i);
        if (!line) continue;
        const words = appleWordsForLine(line, lines[i+1] || null);
        for (const w of words) output.push({ ...w, globalIndex: output.length });
    }
    return output;
}

export function setBratFont(ctx, fontSize) {
    ctx.font = `400 ${fontSize}px "Arial Narrow","Helvetica Neue Condensed","Roboto Condensed",Arial,sans-serif`;
    ctx.textAlign = "left"; 
    ctx.textBaseline = "alphabetic";
}

export function buildBratRows(ctx, words, w, h, style) {
    const baseSize = Number(style.fontSize) || 76;
    const side = w * (Number(style.bratSideMargin) || 4.5) / 100;
    const top = h * (Number(style.bratTopMargin) || 4.5) / 100;
    const bottom = h * 0.05;
    const slotHeight = (h - top - bottom) / 5;
    const sizePattern = [1.16, 0.91, 1.10, 0.96, 1.20];
    const wordPattern = [3, 3, 2, 2, 3];
    const rows = [];
    let cursor = 0, rowNumber = 0;
    
    while (cursor < words.length) {
        const slot = rowNumber % 5;
        const lineWords = words.slice(cursor, cursor + wordPattern[slot]);
        cursor += lineWords.length;
        let fontSize = Math.min(slotHeight * 0.72, baseSize * 1.75 * sizePattern[slot]);
        fontSize = Math.max(34, fontSize);
        const usableWidth = w - side * 2;
        while (fontSize > 32) {
            setBratFont(ctx, fontSize);
            let total = 0;
            for (const w of lineWords) total += ctx.measureText(w.text).width;
            if (total + fontSize * 0.14 * Math.max(0, lineWords.length - 1) <= usableWidth) break;
            fontSize -= 2;
        }
        setBratFont(ctx, fontSize);
        let wordWidth = 0;
        for (const w of lineWords) { 
            w.renderWidth = ctx.measureText(w.text).width; 
            wordWidth += w.renderWidth; 
        }
        const gap = lineWords.length > 1 ? (usableWidth - wordWidth) / (lineWords.length - 1) : 0;
        rows.push({ words: lineWords, fontSize, gap, side, top, slot, page: Math.floor(rowNumber / 5) });
        rowNumber++;
    }
    return rows;
}

export function drawBratEffect(ctx, w, h, style, lines, time) {
    const typingSpeed = Number(style.bratTypingSpeed) || 1;
    const words = buildBratWords(lines);
    if (!words.length) return;
    
    let currentIndex = -1;
    for (let i = 0; i < words.length; i++) {
        if (time >= words[i].time) currentIndex = i; else break;
    }
    if (currentIndex < 0) return;
    
    const rows = buildBratRows(ctx, words, w, h, style);
    let activeRow = -1;
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].words.some(w => w.globalIndex === currentIndex)) { activeRow = i; break; }
    }
    if (activeRow < 0) return;
    
    const page = Math.floor(activeRow / 5);
    const pageStart = page * 5;
    const pageEnd = Math.min(rows.length, pageStart + 5);
    const top = rows[pageStart].top;
    const rowPitch = (h - top - h * 0.05) / 5;
    
    ctx.save();
    ctx.globalAlpha = 1; 
    ctx.shadowBlur = 0; 
    ctx.filter = "none";
    
    for (let ri = pageStart; ri < pageEnd; ri++) {
        const row = rows[ri];
        setBratFont(ctx, row.fontSize);
        ctx.fillStyle = style.bratTextColor || style.textColor || "#FFFFFF";
        const baseline = top + rowPitch * (ri - pageStart) + rowPitch * 0.70;
        let x = row.side;
        for (const word of row.words) {
            if (word.globalIndex > currentIndex) break;
            if (word.globalIndex < currentIndex) {
                ctx.fillText(word.text, x, baseline);
            } else {
                const duration = Math.max(0.001, word.endTime - word.time);
                const progress = linaClamp((time - word.time) / duration);
                const typingProgress = linaClamp(progress / (0.88 / typingSpeed));
                const chars = Array.from(word.text);
                const count = Math.min(chars.length, Math.ceil(chars.length * typingProgress));
                ctx.fillText(chars.slice(0, count).join(""), x, baseline);
            }
            x += word.renderWidth + row.gap;
        }
    }
    ctx.restore();
}