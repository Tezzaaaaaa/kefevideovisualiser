/* KEFE Visualiser — production effect registry */
(() => {
'use strict';
const originalRenderLyricsEffect = window.renderLyricsEffect;
if (typeof originalRenderLyricsEffect !== 'function') return;
window.kefeEffects = window.kefeEffects || {};
window.renderLyricsEffect = function(ctx,w,h,style,lines,time){
    ctx.save();
    ctx.globalAlpha=1;
    ctx.globalCompositeOperation='source-over';
    ctx.filter='none';
    ctx.shadowBlur=0;
    try {
        const effect=style?.effect;
        const modular={starwars:window.kefeEffects.starwars,stroke:window.kefeEffects.stroke,fadeup:window.kefeEffects.fadeup};
        const renderer=modular[effect];
        if(typeof renderer==='function') return renderer(ctx,w,h,style,lines,time);
        return originalRenderLyricsEffect(ctx,w,h,style,lines,time);
    } finally { ctx.restore(); }
};
const labels={
    apple:'Apple Music — smooth focus line with continuous lyric movement',
    brat:'Brat — abrupt word-by-word switching',
    eternal:'Eternal Sunshine — handwritten lyric flow',
    aurora:'Aurora — flowing colour and soft light',
    starwars:'Star Wars — iconic yellow perspective crawl toward the horizon',
    stroke:'Stroke — sharp double-edge outline with a moving highlight',
    fadeup:'Fade Up — kinetic word-by-word rise, pop and settle'
};
if(typeof qsa==='function') qsa('[data-effect]').forEach(button=>button.addEventListener('click',()=>{
    const label=document.getElementById('effectLabel');
    if(label&&labels[button.dataset.effect]) label.textContent=labels[button.dataset.effect];
}));
})();
