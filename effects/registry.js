/* KEFE Visualiser — production lyric-effect registry */
(() => {
'use strict';
const originalRenderLyricsEffect=window.renderLyricsEffect;
if(typeof originalRenderLyricsEffect!=='function')throw new Error('KEFE effect registry loaded before the base lyric renderer.');
window.kefeEffects=window.kefeEffects||{};
const required=['brat','typewriter','stroke','fadeup','aurora','eternal'];
window.kefeEffectStatus=Object.freeze(Object.fromEntries(required.map(name=>[name,typeof window.kefeEffects[name]==='function'])));
window.renderLyricsEffect=function(ctx,w,h,style,lines,time){
  ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';ctx.shadowBlur=0;
  try{
    const effect=style?.effect;
    const modular={brat:window.kefeEffects.brat,typewriter:window.kefeEffects.typewriter,stroke:window.kefeEffects.stroke,fadeup:window.kefeEffects.fadeup,aurora:window.kefeEffects.aurora,eternal:window.kefeEffects.eternal};
    if(Object.prototype.hasOwnProperty.call(modular,effect)){
      const renderer=modular[effect];
      if(typeof renderer!=='function')throw new Error(`KEFE effect renderer unavailable: ${effect}`);
      return renderer(ctx,w,h,style,lines,time);
    }
    return originalRenderLyricsEffect(ctx,w,h,style,lines,time);
  }finally{ctx.restore();}
};
const labels={
  apple:'Apple Music — smooth focus line with continuous lyric movement',
  brat:'Brat — abrupt word-by-word switching',
  eternal:'Eternal Sunshine — fast per-letter handwritten ink reveal',
  aurora:'Aurora — atmospheric curtains, colour flow and luminous depth',
  typewriter:'Typewriter — precise character-by-character reveal with a restrained cursor',
  stroke:'Stroke — sharp double-edge outline with a moving highlight',
  fadeup:'Fade Up — kinetic word-by-word rise, pop and settle'
};
if(typeof qsa==='function')qsa('[data-effect]').forEach(button=>button.addEventListener('click',()=>{const label=document.getElementById('effectLabel');if(label&&labels[button.dataset.effect])label.textContent=labels[button.dataset.effect];}));
})();
