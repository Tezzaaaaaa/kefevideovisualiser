import { linaClamp, median, hasFiniteNumber, formatTime } from '../core/utils.js';
import { state } from '../state.js';

export function estimateFinalVocalWordEnd(words, nextLineTime = Infinity) {
    if (!Array.isArray(words) || !words.length) return null;
    const last = words[words.length-1];
    const start = Number(last.time);
    if (!Number.isFinite(start)) return null;
    const gaps = [];
    for (let i = 0; i < words.length-1; i++) {
        const a = Number(words[i].time), b = Number(words[i+1].time);
        const gap = b - a;
        if (Number.isFinite(gap) && gap >= 0.08 && gap <= 1.8) gaps.push(gap);
    }
    const cadence = median(gaps) ?? 0.48;
    const letters = Array.from(String(last.text || "").replace(/[^\p{L}\p{N}]/gu, "")).length;
    const textDuration = linaClamp(0.24 + letters * 0.055, 0.28, 1.15);
    const cadenceDuration = linaClamp(cadence * 1.10, 0.28, 1.25);
    let duration = Math.max(textDuration, cadenceDuration);
    duration = linaClamp(duration, 0.28, 1.35);
    let end = start + duration;
    if (Number.isFinite(nextLineTime)) end = Math.min(end, Math.max(start + 0.12, nextLineTime - 0.08));
    return end;
}

export function normaliseEnhancedWordEnds(lines) {
    for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        if (!Array.isArray(line.words) || !line.words.length) continue;
        const nextLineTime = Number(lines[li+1]?.time) || null;
        for (let wi = 0; wi < line.words.length; wi++) {
            const word = line.words[wi];
            const nextWord = line.words[wi+1];
            if (word.explicitEndTime === true && hasFiniteNumber(word.endTime)) continue;
            if (nextWord && hasFiniteNumber(nextWord.time)) {
                word.endTime = Math.max(Number(word.time) + 0.04, Number(nextWord.time));
            } else {
                word.endTime = estimateFinalVocalWordEnd(line.words, nextLineTime);
            }
        }
        const finalWord = line.words[line.words.length-1];
        line.vocalEndTime = hasFiniteNumber(finalWord.endTime) ? Number(finalWord.endTime) : Number(line.time) + 0.8;
    }
    return lines;
}

export function parseLyrics(raw) {
    if (typeof raw !== 'string') throw new Error('Lyrics must be text');
    const TIME_TAG = /\[(\d{1,3}):([0-5]?\d)(?:[.:](\d{1,3}))?\]/g;
    const METADATA_TAG = /^\[(ar|ti|al|au|length|by|offset|re|tool|ve|cover|coverart|artwork|image):/i;
    const lines = raw.split(/\r?\n/);
    const parsed = [];
    const skipped = [];
    const metadata = { title: '', artist: '', album: '', artwork: '' };
    const declaredOffset = /^\[offset:([+-]?\d+)\]$/im.exec(raw);
    let offsetSeconds = declaredOffset ? Number(declaredOffset[1]) / 1000 : 0;
    
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        TIME_TAG.lastIndex = 0;
        const timeMatches = [];
        let expectedTimeIndex = 0;
        let timeMatch;
        while ((timeMatch = TIME_TAG.exec(line)) !== null) {
            if (timeMatch.index !== expectedTimeIndex) break;
            timeMatches.push({ 
                match: timeMatch, 
                time: Number(timeMatch[1]) * 60 + Number(timeMatch[2]) + (timeMatch[3] ? Number('0.' + timeMatch[3]) : 0) 
            });
            expectedTimeIndex = timeMatch.index + timeMatch[0].length;
        }
        if (!timeMatches.length) {
            const metaMatch = /^\[(ar|ti|al|offset|cover|coverart|artwork|image):(.+)\]$/i.exec(line);
            if (metaMatch) {
                const key = metaMatch[1].toLowerCase();
                const value = metaMatch[2].trim();
                if (key === 'ar') metadata.artist = value;
                else if (key === 'ti') metadata.title = value;
                else if (key === 'al') metadata.album = value;
                else if (key === 'offset') offsetSeconds = (Number(value) || 0) / 1000;
                else metadata.artwork = value;
            } else if (!METADATA_TAG.test(line)) skipped.push(line);
            continue;
        }
        const contentStart = Math.max(...timeMatches.map(item => item.match.index + item.match[0].length));
        const content = line.slice(contentStart);
        const wordMatches = [];
        const WORD_TAG = /<(\d{1,3}):([0-5]?\d)(?:[.:](\d{1,3}))?>/g;
        const hasWordTimings = content.includes('<') && content.includes('>');
        if (hasWordTimings) {
            const temp = content;
            WORD_TAG.lastIndex = 0;
            let wm;
            while ((wm = WORD_TAG.exec(temp)) !== null) {
                const wt = Math.max(0, Number(wm[1]) * 60 + Number(wm[2]) + (wm[3] ? Number('0.' + wm[3]) : 0) + offsetSeconds);
                const si = wm.index + wm[0].length;
                const ni = temp.indexOf('<', si);
                const ei = ni !== -1 ? ni : temp.length;
                const wtxt = temp.slice(si, ei).trim();
                if (wtxt) wordMatches.push({ text: wtxt, time: wt, explicitEndTime: false, endTime: null });
            }
        }
        const text = content.replace(/<[^>]*>/g, '').trim();
        if (text) {
            for (const item of timeMatches) {
                const time = Math.max(0, item.time + offsetSeconds);
                const entry = { time, endTime: time + 3, text, words: null };
                if (wordMatches.length > 0 && timeMatches.length === 1) entry.words = wordMatches;
                parsed.push(entry);
            }
        } else {
            skipped.push(line);
        }
    }
    
    parsed.sort((a, b) => a.time - b.time);
    const unique = parsed.filter((entry, index) => index === 0 || entry.time !== parsed[index-1].time || entry.text !== parsed[index-1].text);
    for (let i = 0; i < unique.length; i++) {
        if (i < unique.length - 1) { 
            unique[i].endTime = unique[i+1].time; 
            unique[i].nextLineTime = unique[i+1].time; 
        } else {
            unique[i].endTime = unique[i].time + 5;
        }
    }
    return { lines: normaliseEnhancedWordEnds(unique), skippedCount: skipped.length, skippedLines: skipped, metadata };
}

export function buildExportFilename(extension) {
    const resolved = resolveAudioLabels(state.state.audio);
    const title = sanitiseExportFilenamePart(resolved.title) || 'Lyric Video';
    const artist = sanitiseExportFilenamePart(resolved.artist);
    const parts = [title];
    if (artist && artist.toLocaleLowerCase() !== title.toLocaleLowerCase()) parts.push(artist);
    parts.push('KEFE Visualiser');
    const ext = String(extension || 'mp4').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'mp4';
    return parts.join(' - ') + '.' + ext;
}

import { resolveAudioLabels } from './metadata.js';
import { sanitiseExportFilenamePart } from '../core/utils.js';