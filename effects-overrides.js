/*
 * KEFE Effect Engine
 * Canonical lyric-effect renderer. Preview and export both reach this renderer
 * through app.js -> render() -> renderLyricsEffect().
 *
 * Typography
 *   Website/UI       -> Open Sans (styles.css / app.js)
 *   Apple Music      -> Inter
 *   Brat             -> Arial + render-time horizontal compression
 *   Eternal Sunshine -> Homemade Apple (legacy renderer in app.js, untouched)
 *   Aurora           -> Permanent Marker
 *   Starfield        -> TikTok Sans
 *   Subject Stroke   -> Montserrat
 *   Story Fade       -> DM Sans
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

    function setFont(ctx, family, size, weight = 700) {
        ctx.font = `${weight} ${Math.max(18, size)}px "${family}", Arial, sans-serif`;
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

    /* Apple Music: restrained typography, smooth line hand-off and a soft
       left-to-right word highlight. No glow is painted over the glyphs. */
    function drawApple(ctx, w, h, style, lines, time) {
        if (!Array.isArray(lines) || !lines.length) return;
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
                row = []; rowWidth = 0;
            }
            row.push({ ...word, width });
            rowWidth = row.length === 1 ? width : rowWidth + gap + width;
        }
        if (row.length) rows.push({ words: row, width: rowWidth });

        const rowHeight = size * 1.22;
        const totalHeight = rows.length * rowHeight;
        const targetY = h * 0.245;
        const startY = targetY - totalHeight / 2 + rowHeight / 2;
        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        rows.forEach((current, rowIndex) => {
            let x = style.align === 'center'
                ? (w - current.width) / 2
                : style.align === 'right'
                    ? w - margin - current.width
                    : margin;
            const y = startY + rowIndex * rowHeight;

            for (const word of current.words) {
                const progress = clamp((time - word.time) / Math.max(0.04, word.endTime - word.time));
                const enter = smoother(progress / 0.22);
                const complete = progress >= 1;
                const inactive = style.appleInactiveOpacity !== undefined ? clamp(style.appleInactiveOpacity, 0.08, 0.6) : 0.25;

                ctx.save();
                ctx.globalAlpha = inactive;
                ctx.fillStyle = style.textColor || '#FFFFFF';
                ctx.fillText(word.text, x, y);
                ctx.restore();

                if (enter > 0) {
                    const activeWidth = word.width * smooth(progress);
                    if (activeWidth > 0) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.rect(x - 1, y - size, activeWidth + 2, size * 2);
                        ctx.clip();
                        ctx.globalAlpha = 0.96 * enter;
                        ctx.fillStyle = style.accentColor || '#FFFFFF';
                        ctx.fillText(word.text, x, y);
                        ctx.restore();
                    }
                    if (!complete && progress > 0 && progress < 1) {
                        const edge = x + activeWidth;
                        const edgeWidth = Math.max(8, size * 0.14);
                        ctx.save();
                        ctx.beginPath();
                        ctx.rect(edge - edgeWidth, y - size, edgeWidth, size * 2);
                        ctx.clip();
                        const edgeGradient = ctx.createLinearGradient(edge - edgeWidth, 0, edge, 0);
                        edgeGradient.addColorStop(0, 'rgba(255,255,255,0)');
                        edgeGradient.addColorStop(1, 'rgba(255,255,255,0.88)');
                        ctx.globalAlpha = enter;
                        ctx.fillStyle = edgeGradient;
                        ctx.fillText(word.text, x, y);
                        ctx.restore();
                    }
                }
                x += word.width + gap;
            }
        });
        ctx.restore();
    }

    /* Brat: whole-word switching. There is deliberately no character typing.
       Arial is horizontally compressed at render time to reproduce the narrow
       cover treatment without distributing a modified font file. */
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

        let currentIndex = -1;
        for (let i = 0; i < words.length; i++) {
            if (time >= words[i].time) currentIndex = i;
            else break;
        }
        if (currentIndex < 0) return;

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

        const activeRow = rows.findIndex(row => row.words.some(word => words.indexOf(word) === currentIndex));
        if (activeRow < 0) return;
        const page = Math.floor(activeRow / 5);
        const pageStart = page * 5;

        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = style.bratTextColor || style.textColor || '#FFFFFF';

        for (let ri = pageStart; ri < Math.min(rows.length, pageStart + 5); ri++) {
            const row = rows[ri];
            setFont(ctx, 'Arial', row.size, 400);
            const baseline = top + rowPitch * (ri - pageStart) + rowPitch * 0.70;
            let x = side;
            for (const word of row.words) {
                const globalIndex = words.indexOf(word);
                if (globalIndex > currentIndex) break;
                const rawWidth = ctx.measureText(word.text).width;
                ctx.save();
                ctx.translate(x, baseline);
                ctx.scale(transformX, 1);
                ctx.fillText(word.text, 0, 0);
                ctx.restore();
                x += rawWidth * transformX + row.gap;
            }
        }
        ctx.restore();
    }

    /* Eternal Sunshine intentionally delegates to the established renderer in
       app.js. Its Homemade Apple ink treatment is not rewritten here. */

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

    /* Starfield: compact perspective conveyor/crawl below centre. The vanishing
       point stays below the visual midpoint so the primary subject remains clear. */
    function drawStarfield(ctx, w, h, style, lines, time) {
        const a = activeLine(lines, time);
        if (!a) return;
        const words = wordsFor(a.line, a.next);
        if (!words.length) return;
        const base = Number(style.fontSize) || 76;
        const colour = style.accentColor || '#FFFFFF';
        const laneY = h * 0.62;
        const spacing = Math.max(base * 0.52, Math.min(h * 0.065, base * 0.76));
        const local = clamp((time - a.line.time) / Math.max(0.16, a.line.endTime - a.line.time));
        const visible = Math.min(10, Math.max(6, words.length + 3));

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let n = -2; n < visible; n++) {
            const position = n + local * 1.85;
            if (position < -0.9 || position > visible - 0.8) continue;
            const depth = clamp(1 - position / (visible - 1));
            const perspective = smoother(depth);
            const scale = 0.24 + 0.76 * perspective;
            const y = laneY + (position - (visible - 2)) * spacing * (0.50 + 0.50 * perspective);
            const word = words[((n % words.length) + words.length) % words.length];
            const size = fitText(ctx, 'TikTok Sans', word.text, base * scale, w * 0.76, 800);
            const fade = clamp(Math.min((position + 0.55) / 0.8, (visible - 0.35 - position) / 0.8));
            ctx.globalAlpha = fade * (0.12 + 0.88 * perspective);
            ctx.fillStyle = colour;
            ctx.shadowColor = colour;
            ctx.shadowBlur = size * 0.012 * perspective;
            ctx.fillText(word.text, w / 2, y);
        }
        ctx.restore();
    }

    /* Subject Stroke: a crisp outline layer designed to be placed behind a
       foreground subject when the source composition supplies that subject. */
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
        ctx.restore();
    }

    /* Story Fade: fast Instagram-story-inspired word-by-word rise/fade. */
    function drawStoryFade(ctx, w, h, style, lines, time) {
        const a = activeLine(lines, time);
        if (!a) return;
        const words = wordsFor(a.line, a.next);
        if (!words.length) return;
        const base = Number(style.fontSize) || 76;
        const margin = Math.max(44, w * 0.07);
        let size = base;
        let gap = base * 0.20;
        setFont(ctx, 'DM Sans', size, 700);
        let widths = words.map(word => ctx.measureText(word.text).width);
        let total = widths.reduce((sum, width) => sum + width, 0) + gap * (words.length - 1);
        if (total > w - margin * 2) {
            size = base * (w - margin * 2) / total;
            gap = size * 0.20;
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
            case 'apple': return drawApple(ctx, w, h, style, lines, time);
            case 'brat': return drawBrat(ctx, w, h, style, lines, time);
            case 'eternal': return originalRenderLyricsEffect(ctx, w, h, style, lines, time);
            case 'aurora': return drawAurora(ctx, w, h, style, lines, time);
            case 'pulse':
            case 'starfield': return drawStarfield(ctx, w, h, style, lines, time);
            case 'stroke':
            case 'subjectstroke': return drawSubjectStroke(ctx, w, h, style, lines, time);
            case 'fadeup':
            case 'storyfade': return drawStoryFade(ctx, w, h, style, lines, time);
            default: return originalRenderLyricsEffect(ctx, w, h, style, lines, time);
        }
    };

    const labels = {
        apple: 'Apple Music-style focus line with smooth, clean word highlighting',
        brat: 'Brat-style compressed Arial with abrupt word-by-word switching',
        eternal: 'Three-line handwritten cycle with Homemade Apple ink writing',
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
