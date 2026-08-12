// parser.js — turns raw lyric text into a normalized line/word timeline.
//
// Output shape (always, regardless of input format):
//   [{ time, endTime, text, words: [{ time, endTime, text }] }]
//
// This is the ONLY parser. The original project had lrc_import_fix.js,
// timing_gap_fix.js and adaptive_karaoke.js all independently touching
// lyric timing. Here, timing is computed once, in one place.

const LRC_TAG = /^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/;
const META_TAG = /^\[(ar|ti|al|by|offset):(.*)\]$/i;
const WORD_TAG = /<(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?>/g;

function toSeconds(min, sec, frac) {
  const f = frac ? Number(("0." + frac)) : 0;
  return Number(min) * 60 + Number(sec) + f;
}

function detectFormat(raw) {
  WORD_TAG.lastIndex = 0;
  if (WORD_TAG.test(raw)) return "enhanced";
  WORD_TAG.lastIndex = 0;
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  const timed = lines.filter((l) => LRC_TAG.test(l.trim()));
  if (timed.length >= Math.max(1, lines.length * 0.5)) return "lrc";
  return "txt";
}

function splitWordsEven(text, startTime, endTime) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const span = Math.max(0.15, endTime - startTime);
  const step = span / words.length;
  return words.map((w, i) => ({
    text: w,
    time: startTime + i * step,
    endTime: startTime + (i + 1) * step,
  }));
}

function parseEnhanced(raw) {
  const lines = raw.split(/\r?\n/);
  const out = [];
  let meta = {};
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = META_TAG.exec(line);
    if (m) {
      meta[m[1].toLowerCase()] = m[2].trim();
      continue;
    }
    const lineMatch = LRC_TAG.exec(line);
    if (!lineMatch) continue;
    const lineTime = toSeconds(lineMatch[1], lineMatch[2], lineMatch[3]);
    const rest = line.slice(lineMatch[0].length);

    const words = [];
    let cursor = 0;
    let match;
    WORD_TAG.lastIndex = 0;
    const tags = [...rest.matchAll(WORD_TAG)];
    if (tags.length === 0) {
      // enhanced file but this particular line has no word tags -> treat as plain
      const text = rest.replace(WORD_TAG, "").trim();
      if (text) out.push({ time: lineTime, endTime: lineTime + 3, text, words: null });
      continue;
    }
    for (let i = 0; i < tags.length; i++) {
      const t = tags[i];
      const wordTime = toSeconds(t[1], t[2], t[3]);
      const segStart = t.index + t[0].length;
      const segEnd = i + 1 < tags.length ? tags[i + 1].index : rest.length;
      const text = rest.slice(segStart, segEnd).trim();
      if (!text) continue;
      words.push({ text, time: wordTime, endTime: null });
    }
    for (let i = 0; i < words.length; i++) {
      words[i].endTime = i + 1 < words.length ? words[i + 1].time : words[i].time + 0.6;
    }
    const text = words.map((w) => w.text).join(" ");
    const endTime = words.length ? words[words.length - 1].endTime : lineTime + 3;
    out.push({ time: lineTime, endTime, text, words });
  }
  return { lines: out, meta };
}

function parseLrc(raw) {
  const rawLines = raw.split(/\r?\n/);
  const parsed = [];
  let meta = {};
  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = META_TAG.exec(line);
    if (m) {
      meta[m[1].toLowerCase()] = m[2].trim();
      continue;
    }
    // a line may carry multiple timestamps, e.g. [00:12.00][00:45.00]same lyric
    const tags = [...line.matchAll(new RegExp(LRC_TAG.source, "g"))];
    if (tags.length === 0) continue;
    const text = line.replace(new RegExp(LRC_TAG.source, "g"), "").trim();
    if (!text) continue;
    for (const t of tags) {
      parsed.push({ time: toSeconds(t[1], t[2], t[3]), text });
    }
  }
  parsed.sort((a, b) => a.time - b.time);
  const out = parsed.map((p, i) => {
    const endTime = i + 1 < parsed.length ? parsed[i + 1].time : p.time + 4;
    return {
      time: p.time,
      endTime,
      text: p.text,
      words: splitWordsEven(p.text, p.time, endTime),
    };
  });
  return { lines: out, meta };
}

function parseTxt(raw) {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  // No timestamps available yet — lines are staged with time=null until
  // the user runs Tap Sync. This is intentional: guessing even spacing
  // across an unknown-length song produces confidently wrong sync,
  // which is worse than clearly asking for sync input.
  return {
    lines: lines.map((text) => ({ time: null, endTime: null, text, words: null })),
    meta: {},
  };
}

export function parseLyrics(raw, formatHint = "auto") {
  const format = formatHint === "auto" ? detectFormat(raw) : formatHint;
  if (format === "enhanced") return { format, ...parseEnhanced(raw) };
  if (format === "lrc") return { format, ...parseLrc(raw) };
  return { format: "txt", ...parseTxt(raw) };
}