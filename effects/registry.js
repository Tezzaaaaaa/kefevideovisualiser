/* KEFE Visualiser — production effect registry */
(() => {
'use strict';
const originalRenderLyricsEffect = window.renderLyricsEffect;
if (typeof originalRenderLyricsEffect !== 'function') return;

window.kefeEffects = window.kefeEffects || {};

/*
 * The canonical Apple, Brat and Aurora renderers in app.js contain the
 * carefully tuned timing/layout work. Do not replace them with the compact
 * module implementations. The modules remain responsible for the newer
 * effects that do not exist in the canonical renderer.
 */
window.renderLyricsEffect = function(ctx, w, h, style, lines, time) {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.shadowBlur = 0;
    try {
        const effect = style?.effect;
        const modular = {
            pulse: window.kefeEffects.pulse,
            stroke: window.kefeEffects.stroke,
            fadeup: window.kefeEffects.fadeup,
            subjectstroke: window.kefeEffects.stroke,
            storyfade: window.kefeEffects.fadeup
        };
        const renderer = modular[effect];
        if (typeof renderer === 'function') return renderer(ctx, w, h, style, lines, time);
        return originalRenderLyricsEffect(ctx, w, h, style, lines, time);
    } finally {
        ctx.restore();
    }
};

const labels = {
    apple: 'Apple Music-style focus line with a continuous scrolling lyric stack',
    brat: 'Brat-style compressed Arial with abrupt word-by-word switching',
    eternal: 'Three-line handwritten cycle with Homemade Apple ink writing',
    aurora: 'Flowing colour-gradient marker lyrics with a soft aurora glow',
    pulse: 'Starfield — compact perspective lyric conveyor below centre',
    stroke: 'Subject Stroke — crisp outlined typography designed to sit behind the subject',
    fadeup: 'Story Fade — fast word-by-word rise and fade lyric animation'
};

if (typeof qsa === 'function') {
    qsa('[data-effect]').forEach(button => button.addEventListener('click', () => {
        const label = document.getElementById('effectLabel');
        if (label && labels[button.dataset.effect]) label.textContent = labels[button.dataset.effect];
    }));
}
})();
