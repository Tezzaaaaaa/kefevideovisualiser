// state.js — the ONLY place app state lives.
// Every module reads/writes through this. No other file may declare
// its own copy of "current line", "is playing", etc. That duplication
// is what caused the original project's race conditions.

export const state = {
  project: {
    title: "",
    artist: "",
  },
  audio: {
    file: null,
    url: null,
    duration: 0,
  },
  lyrics: {
    raw: "",
    format: "auto",
    lines: [], // [{ time, endTime, text, words: [{time,text}] }]
  },
  style: {
    effect: "apple",
    fontSize: 64,
    align: "center", // left | center | right
    textCase: "original", // original | upper | lower | title
    letterSpacing: 0,
    lineSpacing: 1.2,
    textColor: "#FFFFFF",
    accentColor: "#FFC53D",
    dimColor: "rgba(255,255,255,0.38)",
  },
  background: {
    type: "solid", // solid | gradient | image | video
    solid: "#0A0A0A",
    gradientFrom: "#0A0A0A",
    gradientTo: "#1C1C1E",
    gradientAngle: 135,
    imageUrl: null,
    videoUrl: null,
    videoEl: null,
    dim: 0.35,
    blur: 0,
  },
  canvas: {
    aspect: "9:16", // 9:16 | 16:9 | 1:1
  },
  playback: {
    isPlaying: false,
    currentTime: 0,
  },
};

export const ASPECTS = {
  "9:16": { w: 1080, h: 1920 },
  "16:9": { w: 1920, h: 1080 },
  "1:1": { w: 1080, h: 1080 },
};