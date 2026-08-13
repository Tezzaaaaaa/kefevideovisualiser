// state.js — the only place app state lives.

export const state = {
  project: { title: "", artist: "" },
  audio: { file: null, url: null, duration: 0 },
  lyrics: { raw: "", format: "auto", lines: [] },
  style: {
    effect: "apple",
    textCase: "original",
    letterSpacing: 0,
    lineSpacing: 1.2,
    textColor: "#FFFFFF",
    accentColor: "#FFFFFF",
    dimColor: "rgba(255,255,255,0.32)",
    effects: {
      apple: { fontSize: 76, align: "left" },
      brat: { fontSize: 106, align: "center" },
      eternal: { fontSize: 82, align: "center" },
    },
  },
  background: {
    type: "solid",
    solid: "#0A0A0A",
    gradientFrom: "#0A0A0A",
    gradientTo: "#1C1C1E",
    gradientAngle: 135,
    imageUrl: null,
    videoUrl: null,
    videoEl: null,
    dim: 0.35,
    blur: 0,
    hazeEnabled: false,
    hazeColor: "#FFFFFF",
    hazeOpacity: 0.24,
  },
  canvas: { aspect: "9:16" },
  playback: { isPlaying: false, currentTime: 0 },
};

export const ASPECTS = {
  "9:16": { w: 1080, h: 1920 },
  "16:9": { w: 1920, h: 1080 },
  "1:1": { w: 1080, h: 1080 },
};
