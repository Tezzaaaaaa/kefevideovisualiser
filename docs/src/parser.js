// parser.js — turns raw lyric text into a normalized line/word timeline.
//
// Output shape (always, regardless of input format):
//   [{ time, endTime, text, words: [{ time, endTime, text }] | null }]
//
// Word timing is preserved only when the source actually provides it.
// Line-only LRC stays line-only; the renderer must never pretend guessed
// per-word timing is singer-accurate.

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

function parseEnhanced(raw) {
  const lines = raw.split(/\r?\n/);
  const out = [];
  const meta = {};
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

    WORD_TAG.lastIndex = 0;
    const tags = [...rest.matchAll(WORD_TAG)];
    if (tags.length === 0) {
      const text = rest.replace(WORD_TAG, "").trim();
      if (text) out.push({ time: lineTime, endTime: lineTime + 3, text, words: null });
      continue;
    }

    const words = [];
    for (let i = 0; i < tags.length; i++) {
      const t = tags[i];
      const wordTime = toSeconds(t[1], t[2], t[3]);
      const segStart = t.index + t[0].length;
      const segEnd = i + 1 < tags.length ? tags[i + 1].index : rest.length;
      const text = rest.slice(segStart, segEnd).trim();
      if (text) words.push({ text, time: wordTime, endTime: null });
    }
    for (let i = 0; i < words.length; i++) {
      words[i].endTime = i + 1 < words.length ? words[i + 1].time : words[i].time + 0.6;
    }
    const text = words.map((w) => w.text).join(" ");
    const endTime = words.length ? words[words.length - 1].endTime : lineTime + 3;
    out.push({ time: lineTime, endTime, text, words });
  }

  // Where possible, let the next line define the current line's true end.
  for (let i = 0; i < out.length - 1; i++) {
    if (out[i + 1].time > out[i].time) out[i].endTime = out[i + 1].time;
    if (out[i].words?.length) {
      const last = out[i].words[out[i].words.length - 1];
      last.endTime = Math.max(last.time + 0.05, out[i].endTime);
    }
  }
  return { lines: out, meta };
}

function parseLrc(raw) {
  const rawLines = raw.split(/\r?\n/);
  const parsed = [];
  const meta = {};
  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = META_TAG.exec(line);
    if (m) {
      meta[m[1].toLowerCase()] = m[2].trim();
      continue;
    }
    const tags = [...line.matchAll(new RegExp(LRC_TAG.source, "g"))];
    if (tags.length === 0) continue;
    const text = line.replace(new RegExp(LRC_TAG.source, "g"), "").trim();
    if (!text) continue;
    for (const t of tags) parsed.push({ time: toSeconds(t[1], t[2], t[3]), text });
  }
  parsed.sort((a, b) => a.time - b.time);
  const out = parsed.map((p, i) => ({
    time: p.time,
    endTime: i + 1 < parsed.length ? parsed[i + 1].time : p.time + 4,
    text: p.text,
    words: null,
  }));
  return { lines: out, meta };
}

function parseTxt(raw) {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
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