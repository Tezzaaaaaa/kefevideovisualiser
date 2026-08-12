// sync.js — the sync engine.
//
// Rule #1, and the thing the original app violated repeatedly by mixing
// CSS animations/timers with playback state: sync state is ALWAYS derived
// fresh from audio.currentTime. Never from a running timer, never from
// "time since the line started". A timer drifts. currentTime does not.
// This also makes seeking and pausing free — there's no state to
// resync, because there was never separate state to begin with.

export function getSyncState(lines, currentTime) {
  if (!lines || lines.length === 0) {
    return { lineIndex: -1, line: null, lineProgress: 0, wordIndex: -1, wordProgress: 0 };
  }

  let lineIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.time == null) continue;
    if (currentTime >= l.time) lineIndex = i;
    else break;
  }

  if (lineIndex === -1) {
    return { lineIndex: -1, line: null, lineProgress: 0, wordIndex: -1, wordProgress: 0 };
  }

  const line = lines[lineIndex];
  const lineSpan = Math.max(0.001, line.endTime - line.time);
  const lineProgress = Math.min(1, Math.max(0, (currentTime - line.time) / lineSpan));

  let wordIndex = -1;
  let wordProgress = 0;
  if (line.words && line.words.length) {
    for (let i = 0; i < line.words.length; i++) {
      const w = line.words[i];
      if (currentTime >= w.time) {
        wordIndex = i;
        const span = Math.max(0.001, w.endTime - w.time);
        wordProgress = Math.min(1, Math.max(0, (currentTime - w.time) / span));
      } else break;
    }
  }

  return { lineIndex, line, lineProgress, wordIndex, wordProgress };
}

// For effects that show neighbouring lines (Stack/Classic), a small
// context window is useful — always recomputed, never cached.
export function getContext(lines, lineIndex, before = 1, after = 1) {
  if (lineIndex < 0) return { prev: [], next: [] };
  const prev = lines.slice(Math.max(0, lineIndex - before), lineIndex);
  const next = lines.slice(lineIndex + 1, lineIndex + 1 + after);
  return { prev, next };
}
