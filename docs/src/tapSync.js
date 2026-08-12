// tapSync.js — lets the user assign line timestamps by tapping along with
// playback. This replaces the original app's dependency on an external
// lyric-lookup service for getting a synced timeline: it works for any
// song, entirely offline, and the result is exactly as accurate as the
// user's tap — which is usually far more reliable than a fetched LRC
// that doesn't match this particular recording/edit.

import { finalizeManualTimes } from "./parser.js";

export function createTapSync({ getLines, setLines, getAudioTime, getDuration }) {
  let index = 0;

  function reset() {
    index = 0;
  }

  function currentLine() {
    const lines = getLines();
    return index < lines.length ? lines[index] : null;
  }

  function tap() {
    const lines = getLines();
    if (index >= lines.length) return { done: true };
    const t = getAudioTime();
    lines[index] = { ...lines[index], time: t };
    index += 1;
    const finalized = finalizeManualTimes(lines, getDuration());
    setLines(finalized);
    return { done: index >= lines.length, index, time: t };
  }

  function undo() {
    if (index === 0) return;
    index -= 1;
    const lines = getLines();
    lines[index] = { ...lines[index], time: null, endTime: null, words: null };
    setLines(lines);
  }

  return { tap, undo, reset, currentLine, get index() { return index; } };
}
