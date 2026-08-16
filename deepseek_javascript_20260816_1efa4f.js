import { linaClamp, linaSmoother, linaSmooth, linaFindActiveLine, linaNormaliseLine, hasFiniteNumber } from '../core/utils.js';
import { state } from '../state.js';

export function appleWordsForLine(line, nextLine) {
    if (Array.isArray(line?.words) && line.words.length) {
        return line.words.map(w => ({ ...w, estimated: false }));
    }
    const tokens = String(line?.text || "").trim().split(/\s+/).filter(Boolean);
    if (!tokens.length || !hasFiniteNumber(line?.time)) return [];
    const start = Number(line.time);
    const vocalEnd = estimateLineVocalEnd(line, nextLine);
    const duration = Math.max(0.15, vocalEnd - start);
    const weights = tokens.map(token => {
        const letters = Array.from(token.replace(/[^\p{L}\p{N}]/gu, "")).length || 1;
        const punctuation = /[,.!?;:]$/.test(token) ? 0.20 : 0;
        return Math.max(0.75, Math.pow(letters, 0.72)) + punctuation;
    });
    const total = weights.reduce((s, v) => s + v, 0) || tokens.length;
    let cursor = 0;
    return tokens.map((text, i) => {
        const ws = start + duration * (cursor / total);
        cursor += weights[i];
        const we = start + duration * (cursor / total);
        return { text, time: ws, endTime: Math.max(ws + 0.05, we), estimated: true };
    });
}

function estimateLineVocalEnd(line, nextLine) {
    const start = Number(line.time);
    if (!Number.isFinite(start)) return null;
    const tokens = String(line.text || "").trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) return start;
    const nextStart = Number(nextLine?.time);
    const estimated = tokens.reduce((total, token) => {
        const letters = Array.from(token.replace(/[^\p{L}\p{N}]/gu, "")).length || 1;
        return total + linaClamp(0.16 + letters * 0.045, 0.24, 0.78);
    }, 0) + Math.max(0, tokens.length - 1) * 0.055;
    let duration = linaClamp(estimated, 0.65, 5.0);
    if (Number.isFinite(nextStart)) {
        const available = Math.max(0.20, nextStart - start - 0.10);
        duration = Math.min(duration, available);
    }
    return start + duration;
}

export function buildAppleRows(ctx, line, nextLine, maxWidth) {
    const words = appleWordsForLine(line, nextLine);
    const spaceWidth = ctx.measureText(" ").width;
    const rows = [];
    let current = [], currentWidth = 0;
    for (const word of words) {
        const width = ctx.measureText(word.text).width;
        const proposed = current.length ? currentWidth + spaceWidth + width : width;
        if (current.length && proposed > maxWidth) {
            rows.push({ words: current, width: currentWidth });
            current = []; currentWidth = 0;
        }
        current.push({ ...word, width });
        currentWidth = current.length === 1 ? width : currentWidth + spaceWidth + width;
    }
    if (current.length) rows.push({ words: current, width: currentWidth });
    return rows;
}

export function measureAppleLineBlock(ctx, w, line, settings, nextLine = null) {
    if (!line || !line.text) return { rows: [], rowHeight: 0, totalHeight: 0 };
    const fontSize = settings.fontSize;
    ctx.save();
    ctx.font = `650 ${fontSize}px system-ui,-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif`;
    const margin = Math.max(40, w * 0.075);
    const rows = buildAppleRows(ctx, line, nextLine, w - margin * 2);
    const rowHeight = fontSize * 1.25;
    const totalHeight = rows.length * rowHeight;
    ctx.restore();
    return { rows, rowHeight, totalHeight };
}

export function drawAppleActiveWord(ctx, word, x, y, time, fontSize, settings, overallAlpha = 1) {
    const duration = Math.max(0.001, word.endTime - word.time);
    const progress = linaClamp((time - word.time) / duration);
    const enter = linaSmoother(progress / 0.28);
    const exit = linaSmoother((progress - 0.72) / 0.28);
    const foreground = enter * (1 - exit * 0.84);
    const scale = 1 + foreground * settings.depth;
    const lift = fontSize * foreground * settings.lift;
    const wordWidth = ctx.measureText(word.text).width;
    const centreX = x + wordWidth / 2;
    
    ctx.save();
    ctx.translate(centreX, y - lift);
    ctx.scale(scale, scale);
    ctx.translate(-centreX, -y);
    
    ctx.save();
    ctx.globalAlpha = settings.inactiveOpacity * overallAlpha;
    ctx.fillStyle = settings.inactiveColor;
    ctx.shadowBlur = 0;
    ctx.fillText(word.text, x, y);
    ctx.restore();
    
    const chars = Array.from(word.text);
    const hp = linaSmoother(linaClamp(progress / settings.highlightSpan));
    const sweep = hp * (chars.length + 1.8);
    for (let i = 0; i < chars.length; i++) {
        const local = linaSmoother(linaClamp((sweep - i + 0.4) / 1.8));
        if (local <= 0.001) continue;
        const charX = x + ctx.measureText(word.text.slice(0, i)).width;
        ctx.save();
        ctx.globalAlpha = (0.25 + local * 0.75) * overallAlpha;
        ctx.fillStyle = settings.activeColor;
        ctx.shadowColor = settings.activeColor;
        ctx.shadowBlur = fontSize * settings.glow * local;
        ctx.fillText(chars[i], charX, y);
        ctx.restore();
    }
    ctx.restore();
}

export function drawAppleLineBlock(ctx, w, centreY, line, time, settings, options = {}) {
    if (!line || !line.text) return;
    const active = options.active === true;
    const alpha = Number.isFinite(options.alpha) ? options.alpha : 1;
    const scale = Number.isFinite(options.scale) ? options.scale : 1;
    const fontSize = settings.fontSize;
    const nextLine = options.nextLine || null;
    const measurement = options.measurement || measureAppleLineBlock(ctx, w, line, settings, nextLine);
    
    ctx.save();
    ctx.filter = Number(options.blur) > 0 ? `blur(${Number(options.blur)}px)` : "none";
    ctx.font = `650 ${fontSize}px system-ui,-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    
    const margin = Math.max(40, w * 0.075);
    const rows = measurement.rows;
    const rowHeight = measurement.rowHeight;
    const totalHeight = measurement.totalHeight;
    let y = centreY - totalHeight / 2 + rowHeight / 2;
    
    ctx.translate(w / 2, centreY);
    ctx.scale(scale, scale);
    ctx.translate(-w / 2, -centreY);
    
    const spaceWidth = ctx.measureText(" ").width;
    for (const row of rows) {
        let x = settings.align === "center" ? (w - row.width) / 2 : settings.align === "right" ? w - margin - row.width : margin;
        for (let i = 0; i < row.words.length; i++) {
            const word = row.words[i];
            if (!active) {
                ctx.save(); 
                ctx.globalAlpha = alpha; 
                ctx.fillStyle = settings.backgroundColor; 
                ctx.shadowBlur = 0; 
                ctx.fillText(word.text, x, y); 
                ctx.restore();
            } else if (time < word.time) {
                ctx.save(); 
                ctx.globalAlpha = settings.inactiveOpacity * alpha; 
                ctx.fillStyle = settings.inactiveColor; 
                ctx.shadowBlur = 0; 
                ctx.fillText(word.text, x, y); 
                ctx.restore();
            } else if (time >= word.endTime) {
                ctx.save(); 
                ctx.globalAlpha = 0.96 * alpha; 
                ctx.fillStyle = settings.activeColor; 
                ctx.shadowColor = settings.activeColor; 
                ctx.shadowBlur = fontSize * 0.014; 
                ctx.fillText(word.text, x, y); 
                ctx.restore();
            } else {
                drawAppleActiveWord(ctx, word, x, y, time, fontSize, settings, alpha);
            }
            x += word.width;
            if (i < row.words.length - 1) x += spaceWidth;
        }
        y += rowHeight;
    }
    ctx.restore();
}

export function appleTransitionTiming(fromLine, toLine) {
    const fromTime = Number(fromLine?.time) || 0;
    const toTime = Number(toLine?.time) || fromTime + 1;
    const gap = Math.max(0.35, toTime - fromTime);
    const duration = Math.min(0.46, Math.max(0.38, gap * 0.18));
    return { duration, start: toTime - duration, end: toTime };
}

export function getAppleFocalMotion(lines, time) {
    const activeIndex = linaFindActiveLine(lines, time);
    if (activeIndex < 0) return null;

    const active = linaNormaliseLine(lines, activeIndex);
    if (!active) return null;

    if (activeIndex > 0) {
        const previous = linaNormaliseLine(lines, activeIndex - 1);
        const incoming = appleTransitionTiming(previous, active);
        if (time < incoming.end) {
            return {
                fromIndex: activeIndex - 1,
                toIndex: activeIndex,
                progress: linaSmoother((time - incoming.start) / incoming.duration),
                transitionStart: incoming.start,
                transitionEnd: incoming.end
            };
        }
    }

    const next = linaNormaliseLine(lines, activeIndex + 1);
    if (next) {
        const outgoing = appleTransitionTiming(active, next);
        if (time >= outgoing.start) {
            return {
                fromIndex: activeIndex,
                toIndex: activeIndex + 1,
                progress: linaSmoother((time - outgoing.start) / outgoing.duration),
                transitionStart: outgoing.start,
                transitionEnd: outgoing.end
            };
        }
    }

    return { fromIndex: activeIndex, toIndex: activeIndex, progress: 1, transitionStart: active.time, transitionEnd: active.time };
}

export function drawAppleMusicHeader(ctx, w, h) {
    const audio = document.getElementById('audio');
    const resolved = resolveAudioLabels(state.state.audio);
    const title = resolved.title;
    const artist = resolved.artist;
    if (!title && !artist) return;
    
    const margin = Math.max(40, w * 0.075);
    const artSize = Math.max(58, Math.min(w, h) * 0.067);
    const y = Math.max(34, h * 0.052);
    const source = state.albumArtworkImage;
    
    ctx.save();
    if (source) {
        ctx.beginPath(); 
        ctx.roundRect(margin, y, artSize, artSize, artSize * 0.12); 
        ctx.clip();
        const sw = source.videoWidth || source.naturalWidth || source.width;
        const sh = source.videoHeight || source.naturalHeight || source.height;
        if (sw && sh) { 
            const side = Math.min(sw, sh); 
            ctx.drawImage(source, (sw-side)/2, (sh-side)/2, side, side, margin, y, artSize, artSize); 
        }
        ctx.restore(); 
        ctx.save();
    }
    
    const tx = source ? margin + artSize + Math.max(16, w * 0.018) : margin;
    const maxText = w - tx - margin * 1.8;
    const titleSize = Math.max(18, Math.min(w, h) * 0.025);
    
    ctx.textAlign = 'left'; 
    ctx.textBaseline = 'middle'; 
    ctx.font = `700 ${titleSize}px "Open Sans",Arial,sans-serif`;
    
    let shownTitle = title || 'Untitled';
    while (shownTitle.length > 1 && ctx.measureText(shownTitle).width > maxText) {
        shownTitle = shownTitle.slice(0,-2).trim() + '…';
    }
    ctx.fillStyle = '#fff'; 
    ctx.globalAlpha = 0.96; 
    ctx.fillText(shownTitle, tx, y + artSize * 0.38);
    
    ctx.font = `500 ${Math.max(14, titleSize * 0.72)}px "Open Sans",Arial,sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.62)'; 
    ctx.fillText(artist, tx, y + artSize * 0.68);
    ctx.fillStyle = 'rgba(255,255,255,0.82)'; 
    ctx.beginPath();
    const dotY = y + artSize * 0.5, dotX = w - margin;
    for (let i=-1;i<=1;i++) ctx.arc(dotX + i * 10, dotY, 2.3, 0, Math.PI*2);
    ctx.fill(); 
    ctx.restore();
}

export function buildAppleMusicLayout(ctx, w, h, settings, lines, focusIndex, visibleCount) {
    const output = [];
    const focusY = h * settings.topOffset;
    const gap = Math.max(settings.fontSize * settings.lineSpacing, h * 0.018);
    
    const add = (index, centreY, relation, measurement = null) => {
        const line = linaNormaliseLine(lines, index); 
        if (!line) return null;
        const nextLine = linaNormaliseLine(lines, index + 1);
        measurement ||= measureAppleLineBlock(ctx, w, line, settings, nextLine);
        const item = { lineIndex:index, line, nextLine, measurement, centreY, relation };
        output.push(item); 
        return item;
    };
    
    const focus = add(focusIndex, focusY, 0); 
    if (!focus) return output;
    
    const previous = linaNormaliseLine(lines, focusIndex - 1);
    if (previous) {
        const pm = measureAppleLineBlock(ctx, w, previous, settings, focus.line);
        add(focusIndex - 1, focusY - focus.measurement.totalHeight/2 - gap - pm.totalHeight/2, -1, pm);
    }
    
    let cursorY = focusY + focus.measurement.totalHeight/2 + gap;
    for (let distance=1; distance<=visibleCount; distance++) {
        const line = linaNormaliseLine(lines, focusIndex + distance); 
        if (!line) break;
        const next = linaNormaliseLine(lines, focusIndex + distance + 1);
        const measurement = measureAppleLineBlock(ctx, w, line, settings, next);
        add(focusIndex + distance, cursorY + measurement.totalHeight/2, distance, measurement);
        cursorY += measurement.totalHeight + gap;
    }
    return output;
}

export function drawAppleMusicTransition(ctx, w, h, settings, lines, time, visibleCount, motion) {
    const fromLayout = buildAppleMusicLayout(ctx,w,h,settings,lines,motion.fromIndex,visibleCount);
    const toLayout = buildAppleMusicLayout(ctx,w,h,settings,lines,motion.toIndex,visibleCount);
    const fromMap = new Map(fromLayout.map(e=>[e.lineIndex,e]));
    const toMap = new Map(toLayout.map(e=>[e.lineIndex,e]));
    const transitioning = motion.fromIndex !== motion.toIndex;
    const p = transitioning ? linaClamp(motion.progress) : 1;
    const focusTransfer = transitioning ? 0.5 - 0.5 * Math.cos(Math.PI * p) : 1;
    const relationOpacity = relation => relation === 0 ? 1 : relation < 0 ? 0.22 : Math.max(0.07,settings.inactiveOpacity*Math.pow(0.72,relation-1));
    
    for (const index of [...new Set([...fromMap.keys(),...toMap.keys()])]) {
        const from=fromMap.get(index), to=toMap.get(index), entry=to||from; 
        if(!entry) continue;
        const relation=to?to.relation:-2;
        const y=from&&to ? from.centreY+(to.centreY-from.centreY)*p : (to ? to.centreY+h*0.035*(1-p) : from.centreY-h*0.055*p);
        let backgroundAlpha=from&&to ? relationOpacity(from.relation)+(relationOpacity(to.relation)-relationOpacity(from.relation))*p : relationOpacity(relation);
        if(!from) backgroundAlpha*=p;
        if(!to) backgroundAlpha*=1-p;

        let focus=0;
        if (!transitioning && index===motion.toIndex) focus=1;
        else if (transitioning && index===motion.fromIndex) focus=1-focusTransfer;
        else if (transitioning && index===motion.toIndex) focus=focusTransfer;

        const backgroundWeight=1-focus;
        const depth=Math.max(0,relation);
        const maxBlur=settings.fontSize*(relation<0?0.070:0.058+Math.max(0,depth-1)*0.012);
        const blur=maxBlur*backgroundWeight;
        const scale=0.98+focus*0.02;

        if (backgroundWeight>0.001 && backgroundAlpha>0.001) {
            drawAppleLineBlock(ctx,w,y,entry.line,time,settings,{active:false,alpha:backgroundAlpha*backgroundWeight,scale,blur,nextLine:entry.nextLine,measurement:entry.measurement});
        }
        if (focus>0.001) {
            drawAppleLineBlock(ctx,w,y,entry.line,time,settings,{active:true,alpha:focus,scale,blur,nextLine:entry.nextLine,measurement:entry.measurement});
        }
    }
}

export function drawAppleEffect(ctx, w, h, style, lines, time) {
    if (!Array.isArray(lines) || !lines.length) return;
    
    const wash=ctx.createLinearGradient(0,0,0,h); 
    wash.addColorStop(0,'rgba(18,18,20,0.20)'); 
    wash.addColorStop(0.55,'rgba(8,8,10,0.08)'); 
    wash.addColorStop(1,'rgba(0,0,0,0.34)');
    ctx.save(); 
    ctx.fillStyle=wash; 
    ctx.fillRect(0,0,w,h); 
    ctx.restore();
    
    drawAppleMusicHeader(ctx,w,h);
    
    const settings={
        fontSize:Number(style.fontSize)||76,
        align:style.align||'left',
        activeColor:'#FFFFFF',
        inactiveColor:'rgba(255,255,255,0.46)',
        backgroundColor:'#FFFFFF',
        inactiveOpacity:Number.isFinite(Number(style.appleInactiveOpacity))?Number(style.appleInactiveOpacity):0.25,
        glow:0.012,
        depth:0.008,
        lift:0,
        highlightSpan:0.96,
        topOffset:Number(style.appleTopOffset)||0.245,
        lineSpacing:Number(style.appleLineSpacing)||0.72
    };
    
    const visibleCount=Math.max(2,Math.min(6,Math.round(Number(style.appleVisibleLines)||4)));
    const first=linaNormaliseLine(lines,0); 
    if(!first||time<Math.max(0,first.time-1.2)) return;
    
    const motion=getAppleFocalMotion(lines,time)||{fromIndex:0,toIndex:0,progress:1};
    drawAppleMusicTransition(ctx,w,h,settings,lines,time,visibleCount,motion);
}