/*
 * KEFE Effect Engine
 *
 * This module is loaded after app.js so the renderer can be replaced in one
 * deliberate place. It does not modify the export pipeline: preview and the
 * frame-accurate exporter both call render(), which reaches this renderer.
 *
 * Typography:
 *   Apple Music   -> Inter
 *   Brat          -> Arial + controlled horizontal transform
 *   Eternal       -> Homemade Apple (legacy renderer)
 *   Aurora        -> Permanent Marker
 *   Starfield     -> TikTok Sans
 *   Subject Stroke-> Montserrat
 *   Story Fade    -> DM Sans
 */
(() => {
    'use strict';

    const originalRenderLyricsEffect = window.renderLyricsEffect;
    if (typeof originalRenderLyricsEffect !== 'function') return;

    const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, Number(v) || 0));
    const smooth = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
    const smoother = v => { const t = clamp(v); return t*t*t*(t*(t*6-15)+10); };

    function activeLine(lines, time) {
        let index = -1;
        for (let i = 0; i < (lines || []).length; i++) {
            if (Number.isFinite(Number(lines[i]?.time)) && time >= Number(lines[i].time)) index = i;
            else break;
        }
        if (index < 0) return null;
        const line = lines[index] || {};
        const next = lines[index + 1] || null;
        return {
            index,
            line: {
                ...line,
                time: Number(line.time) || 0,
                endTime: Number.isFinite(Number(line.endTime))
                    ? Number(line.endTime)
                    : (Number(next?.time) || ((Number(line.time) || 0) + 3))
            },
            next
        };
    }

    function wordsFor(line, next) {
        if (Array.isArray(line?.words) && line.words.length) {
            return line.words.map((word, i, all) => ({
                text: String(word.text || ''),
                time: Number(word.time) || Number(line.time) || 0,
                endTime: Number.isFinite(Number(word.endTime))
                    ? Number(word.endTime)
                    : (Number(all[i + 1]?.time) || Number(line.endTime) || (Number(line.time) + 3))
            })).filter(word => word.text);
        }

        const tokens = String(line?.text || '').trim().split(/\s+/).filter(Boolean);
        if (!tokens.length) return [];
        const start = Number(line.time) || 0;
        const end = Math.max(start + 0.25, Number(next?.time) || Number(line.endTime) || start + 3);
        const weights = tokens.map(token => Math.max(1, Array.from(token.replace(/[^\p{L}\p{N}]/gu, '')).length ** 0.72));
        const total = weights.reduce((a, b) => a + b, 0) || tokens.length;
        let cursor = 0;
        return tokens.map((text, i) => {
            const time = start + (end - start) * cursor / total;
            cursor += weights[i];
            const endTime = start + (end - start) * cursor / total;
            return { text, time, endTime: Math.max(time + 0.05, endTime) };
        });
    }

    function setFont(ctx, family, size, weight = 700, stretch = 1) {
        ctx.font = `${weight} ${Math.max(18, size)}px "${family}", Arial, sans-serif`;
        return stretch;
    }

    function fitText(ctx, family, text, size, maxWidth, weight = 700) {
        let fitted = Math.max(18, Number(size) || 76);
        setFont(ctx, family, fitted, weight);
        while (fitted > 24 && ctx.measureText(text).width > maxWidth) {
            fitted -= 1;
            setFont(ctx, family, fitted, weight);
        }
        return fitted;
    }

    function drawFittedText(ctx, text, x, y, maxWidth, size, family, weight, horizontalScale = 1) {
        const fitted = fitText(ctx, family, text, size, maxWidth / horizontalScale, weight);
        if (horizontalScale === 1) {
            ctx.fillText(text, x, y);
            return fitted;
        }
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(horizontalScale, 1);
        ctx.fillText(text, 0, 0);
        ctx.restore();
        return fitted;
    }

    /* Apple Music: same restrained stack, but Inter is now the actual family. */
    function drawApple(ctx, w, h, style, lines, time) {
        const a = activeLine(lines, time);
        if (!a) return;
        const words = wordsFor(a.line, a.next);
        if (!words.length) return;

        const size = Number(style.fontSize) || 76;
        const margin = Math.max(46, w * 0.07);
        const maxWidth = w - margin * 2;
        setFont(ctx, 'Inter', size, 650);
        const gap = ctx.measureText(' ').width;
        const rows = [];
        let row = [], rowWidth = 0;

        for (const word of words) {
            const width = ctx.measureText(word.text).width;
            const proposed = row.length ? rowWidth + gap + width : width;
            if (row.length && proposed > maxWidth) {
                rows.push({ words: row, width: rowWidth });
                row = [];
                rowWidth = 0;
            }
            row.push({ ...word, width });
            rowWidth = row.length === 1 ? width : rowWidth + gap + width;
        }
        if (row.length) rows.push({ words: row, width: rowWidth });

        const rowHeight = size * 1.22;
        let y = h * 0.5 - (rows.length * rowHeight) / 2 + rowHeight / 2;

        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        for (const current of rows) {
            let x = style.align === 'center'
                ? (w - current.width) / 2
                : style.align === 'right'
                    ? w - margin - current.width
                    : margin;

            for (const word of current.words) {
                const progress = clamp((time - word.time) / Math.max(0.04, word.endTime - word.time));
                const enter = smoother(progress / 0.28);
                const sweep = smoother((progress - 0.04) / 0.52);

                ctx.save();
                ctx.globalAlpha = 0.22;
                ctx.fillStyle = style.textColor || '#FFFFFF';
                ctx.shadowBlur = 0;
                ctx.fillText(word.text, x, y);

                const chars = Array.from(word.text);
                let charX = x;
                for (let i = 0; i < chars.length; i++) {
                    const charWidth = ctx.measureText(chars[i]).width;
                    const local = clamp((sweep * (chars.length + 1) - i + 0.35) / 1.8);
                    if (local > 0.001) {
                        ctx.globalAlpha = enter * (0.10 + 0.90 * smoother(local));
                        ctx.fillStyle = style.accentColor || '#FFFFFF';
                        ctx.shadowColor = style.accentColor || '#FFFFFF';
                        ctx.shadowBlur = size * 0.012 * local;
                        ctx.fillText(chars[i], charX, y);
                    }
                    charX += charWidth;
                }
                ctx.restore();
                x += word.width + gap;
            }
            y += rowHeight;
        }
        ctx.restore();
    }

    /* Brat: Arial is the source family; the characteristic narrowness is a
       render-time horizontal transformation rather than a substitute font. */
    function drawBrat(ctx, w, h, style, lines, time) {
        const a = activeLine(lines, time);
        if (!a) return;
        const words = wordsFor(a.line, a.next);
        if (!words.length) return;

        const side = w * (Number(style.bratSideMargin) || 4.5) / 100;
        const top = h * (Number(style.bratTopMargin) || 4.5) / 100;
        const bottom = h * 0.05;
        const rowPitch = (h - top - bottom) / 5;
        const baseSize = Number(style.fontSize) || 76;
        const transformX = 0.78;
        const maxWidth = w - side * 2;
        const patterns = [3, 3, 2, 2, 3];
        const scales = [1.16, 0.91, 1.10, 0.96, 1.20];

        let wordIndex = -1;
        for (let i = 0; i < words.length; i++) {
            if (time >= words[i].time) wordIndex = i;
            else break;
        }
        if (wordIndex < 0) return;

        const rows = [];
        let cursor = 0;
        let rowNumber = 0;
        while (cursor < words.length) {
            const count = patterns[rowNumber % patterns.length];
            const rowWords = words.slice(cursor, cursor + count);
            cursor += rowWords.length;
            const size = Math.max(34, Math.min(rowPitch * 0.72, baseSize * 1.75 * scales[rowNumber % scales.length]));
            setFont(ctx, 'Arial', size, 400);
            const measured = rowWords.reduce((sum, word) => sum + ctx.measureText(word.text).width * transformX, 0);
            const gap = rowWords.length > 1 ? Math.max(0, (maxWidth - measured) / (rowWords.length - 1)) : 0;
            rows.push({ words: rowWords, size, gap, rowNumber });
            rowNumber++;
        }

        const activeRow = rows.findIndex(row => row.words.some(word => words.indexOf(word) === wordIndex));
        if (activeRow < 0) return;
        const page = Math.floor(activeRow / 5);
        const startRow = page * 5;

        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = style.bratTextColor || style.textColor || '#FFFFFF';
        ctx.globalAlpha = 1;

        for (let ri = startRow; ri < Math.min(rows.length, startRow + 5); ri++) {
            const row = rows[ri];
            setFont(ctx, 'Arial', row.size, 400);
            const baseline = top + rowPitch * (ri - startRow) + rowPitch * 0.70;
            let x = side;

            for (const word of row.words) {
                const globalIndex = words.indexOf(word);
                if (globalIndex > wordIndex) break;
                const rawWidth = ctx.measureText(word.text).width;
                const visibleProgress = globalIndex < wordIndex ? 1 : clamp((time - word.time) / Math.max(0.001, word.endTime - word.time));
                const typing = smoother(visibleProgress / Math.max(0.01, 0.88 / (Number(style.bratTypingSpeed) || 1)));
                const chars = Array.from(word.text);
                const count = globalIndex < wordIndex ? chars.length : Math.min(chars.length, Math.ceil(chars.length * typing));

                ctx.save();
                ctx.translate(x, baseline);
                ctx.scale(transformX, 1);
                ctx.fillText(chars.slice(0, count).join(''), 0, 0);
                ctx.restore();
                x += rawWidth * transformX + row.gap;
            }
        }
        ctx.restore();
    }

    /* Aurora keeps its existing animation but changes only its typography. */
    function drawAurora(ctx, w, h, style, lines, time) {
        const a = activeLine(lines, time);
        if (!a) return;
        const text = String(a.line.text || '').trim();
        if (!text) return;

        const size = fitText(ctx, 'Permanent Marker', text, Number(style.fontSize) || 76, w * 0.84, 400);
        const speed = Number(style.auroraSpeed) || 1.2;
        const intensity = Number(style.auroraIntensity) || 0.7;
        const saturation = clamp(Number(style.auroraSaturation) || 1, 0.2, 1.8);
        const hueBase = (time * speed * 28 + 180) % 360;
        const y = h * 0.46;

        ctx.save();
        setFont(ctx, 'Permanent Marker', size, 400);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
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

    /* Starfield: compact perspective conveyor/crawl, deliberately below the
       centre line so the main visual subject remains unobstructed. */
    function drawStarfield(ctx, w, h, style, lines, time) {
        const a = activeLine(lines, time);
        if (!a) return;
        const words = wordsFor(a.line, a.next);
        if (!words.length) return;

        const base = Number(style.fontSize) || 76;
        const colour = style.accentColor || '#FFFFFF';
        const laneY = h * 0.61;
        const spacing = Math.max(base * 0.52, Math.min(h * 0.07, base * 0.78));
        const local = clamp((time - a.line.time) / Math.max(0.16, a.line.endTime - a.line.time));
        const visible = Math.min(10, Math.max(6, words.length + 3));

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let n = -2; n < visible; n++) {
            const position = n + local * 1.75;
            if (position < -0.9 || position > visible - 0.8) continue;
            const depth = clamp(1 - position / (visible - 1));
            const perspective = smoother(depth);
            const scale = 0.28 + 0.72 * perspective;
            const y = laneY + (position - (visible - 2)) * spacing * (0.52 + 0.48 * perspective);
            const word = words[((n % words.length) + words.length) % words.length];
            const size = fitText(ctx, 'TikTok Sans', word.text, base * scale, w * 0.76, 800);
            const fade = clamp(Math.min((position + 0.55) / 0.8, (visible - 0.35 - position) / 0.8));
            ctx.globalAlpha = fade * (0.14 + 0.86 * perspective);
            ctx.fillStyle = colour;
            ctx.shadowColor = colour;
            ctx.shadowBlur = size * 0.018 * perspective;
            ctx.fillText(word.text, w / 2, y);
        }
        ctx.restore();
    }

    /* Subject Stroke: the text itself is transparent/fill-light and the outline
       is crisp enough to survive 1080p export. The effect remains centred below
       the subject rather than becoming a generic glow. */
    function drawSubjectStroke(ctx, w, h, style, lines, time) {
        const a = activeLine(lines, time);
        if (!a) return;
        const words = wordsFor(a.line, a.next);
        if (!words.length) return;
        const text = words.map(word => word.text).join(' ');
        const size = fitText(ctx, 'Montserrat', text, Number(style.fontSize) || 76, w * 0.82, 800);
        const progress = smoother(clamp((time - a.line.time) / Math.max(0.16, a.line.endTime - a.line.time) / 0.20));

        ctx.save();
        setFont(ctx, 'Montserrat', size, 800);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = progress;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(2, Math.round(size * 0.028));
        ctx.strokeStyle = style.accentColor || '#FFFFFF';
        ctx.strokeText(text, w / 2, h * 0.57);
        ctx.globalAlpha = 0.10 * progress;
        ctx.fillStyle = style.textColor || '#FFFFFF';
        ctx.fillText(text, w / 2, h * 0.57);
        ctx.restore();
    }

    /* Story Fade: intentionally word-by-word and fast, with a short upward
       travel so it reads like a polished story lyric treatment rather than a
       generic opacity fade. */
    function drawStoryFade(ctx, w, h, style, lines, time) {
        const a = activeLine(lines, time);
        if (!a) return;
        const words = wordsFor(a.line, a.next);
        if (!words.length) return;

        const base = Number(style.fontSize) || 76;
        const margin = Math.max(44, w * 0.07);
        const gap = base * 0.20;
        setFont(ctx, 'DM Sans', base, 700);
        let widths = words.map(word => ctx.measureText(word.text).width);
        let total = widths.reduce((sum, width) => sum + width, 0) + gap * (words.length - 1);
        let size = base;
        if (total > w - margin * 2) {
            size = base * (w - margin * 2) / total;
            setFont(ctx, 'DM Sans', size, 700);
            widths = words.map(word => ctx.measureText(word.text).width);
            total = widths.reduce((sum, width) => sum + width, 0) + gap * (words.length - 1);
        }

        let x = (w - total) / 2;
        const y = h * 0.46;
        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const progress = clamp((time - word.time) / Math.max(0.08, word.endTime - word.time));
            const enter = smoother(progress / 0.20);
            ctx.save();
            ctx.globalAlpha = enter;
            ctx.fillStyle = style.textColor || '#FFFFFF';
            ctx.fillText(word.text, x, y + (1 - enter) * size * 0.48);
            ctx.restore();
            x += widths[i] + gap;
        }
        ctx.restore();
    }

    window.renderLyricsEffect = function(ctx, w, h, style, lines, time) {
        switch (style.effect) {
            case 'apple':
                return drawApple(ctx, w, h, style, lines, time);
            case 'brat':
                return drawBrat(ctx, w, h, style, lines, time);
            case 'eternal':
                return originalRenderLyricsEffect(ctx, w, h, style, lines, time);
            case 'aurora':
                return drawAurora(ctx, w, h, style, lines, time);
            case 'pulse':
            case 'starfield':
                return drawStarfield(ctx, w, h, style, lines, time);
            case 'stroke':
            case 'subjectstroke':
                return drawSubjectStroke(ctx, w, h, style, lines, time);
            case 'fadeup':
            case 'storyfade':
                return drawStoryFade(ctx, w, h, style, lines, time);
            default:
                return originalRenderLyricsEffect(ctx, w, h, style, lines, time);
        }
    };

    const labels = {
        apple: 'Apple Music-style focus line with smooth word highlighting',
        brat: 'Brat-style compressed Arial with abrupt word-by-word typing',
        eternal: 'Three-line handwritten cycle with fast, smooth ink writing',
        aurora: 'Flowing colour-gradient marker lyrics with a soft aurora glow',
        pulse: 'Starfield — compact perspective lyric conveyor below centre',
        stroke: 'Subject Stroke — crisp outlined typography designed to sit behind the subject',
        fadeup: 'Story Fade — fast word-by-word rise and fade lyric animation'
    };

    if (typeof qsa === 'function') {
        qsa('[data-effect]').forEach(button => {
            button.addEventListener('click', () => {
                const label = document.getElementById('effectLabel');
                if (label && labels[button.dataset.effect]) label.textContent = labels[button.dataset.effect];
            });
        });
    }
})();
