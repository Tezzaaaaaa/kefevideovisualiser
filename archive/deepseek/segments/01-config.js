export const ASPECTS = {
    '9:16': { w: 1080, h: 1920, label: '1080 × 1920 (Vertical)' },
    '1:1': { w: 1080, h: 1080, label: '1080 × 1080 (Square)' },
    '16:9': { w: 1920, h: 1080, label: '1920 × 1080 (Horizontal)' }
};

export const EFFECT_LABELS = {
    apple: "Apple Music-style focus line with a continuous scrolling lyric stack",
    brat: "5-line album-cover typewriter (edge-to-edge justified)",
    eternal: "Three-line handwritten cycle (Homemade Apple only)",
    aurora: "Flowing colour-gradient lyrics with a soft aurora glow",
    pulse: "Bold lyrics with a rhythmic scale and glow pulse"
};

export const MAX_AUDIO_BYTES = 200 * 1024 * 1024;
export const MAX_BACKGROUND_BYTES = 500 * 1024 * 1024;
export const MAX_LRC_BYTES = 5 * 1024 * 1024;
export const MAX_INK_CACHE_SIZE = 50;

export const DEFAULT_STATE = {
    audio: { 
        file: null, 
        url: null, 
        duration: 0, 
        ready: false, 
        metadata: { title: '', artist: '', album: '' }, 
        metadataSource: 'none', 
        hasArtwork: false 
    },
    lyrics: { lines: [] },
    style: {
        effect: 'apple',
        fontSize: 76,
        align: 'left',
        accentColor: '#FFFFFF',
        textColor: '#FFFFFF',
        bratTextColor: '#FFFFFF',
        appleInactiveOpacity: 0.25,
        appleGlow: 0.012,
        appleDepth: 0.008,
        appleLift: 0,
        appleHighlightSpan: 0.92,
        appleVisibleLines: 4,
        appleTopOffset: 0.245,
        appleLineSpacing: 0.72,
        bratSideMargin: 4.5,
        bratTopMargin: 4.5,
        bratTypingSpeed: 1,
        eternalInkColor: '#FFFFFF',
        eternalPenWidth: 21,
        eternalWriteSpan: 0.90,
        eternalGlow: 3,
        eternalPresence: 0.65,
        auroraSpeed: 1.2,
        auroraIntensity: 0.7,
        auroraSaturation: 1.0,
        pulseAmplitude: 0.4,
        pulseFrequency: 1.2,
        pulseGlowSize: 1.0,
        titleCardEnabled: true,
        titleCardDuration: 3
    },
    background: { type: 'solid', image: null, video: null, dim: 0.35, solid: '#0A0A0A', blur: 0 },
    playback: { isPlaying: false, currentTime: 0, isSeeking: false },
    aspect: '9:16'
};

export const EXPORT_PRESETS = {
    '1080p': { fps: 60, bitrate: 14000000 },
    '720p': { fps: 30, bitrate: 5000000 },
    '480p': { fps: 24, bitrate: 2000000 },
    'instagram': { fps: 30, bitrate: 8000000 },
    'tiktok': { fps: 30, bitrate: 6000000 }
};