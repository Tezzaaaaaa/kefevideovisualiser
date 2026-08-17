/* KEFE Visualiser — production effect registry */
(() => {
'use strict';
const originalRenderLyricsEffect=window.renderLyricsEffect;
if(typeof originalRenderLyricsEffect!=='function') return;
window.kefeEffects=window.kefeEffects||{};
window.renderLyricsEffect=function(ctx,w,h,style,lines,time){
 ctx.save();
 ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';ctx.shadowBlur=0;
 try{
  const effect=style?.effect;
  if(effect==='eternal') return originalRenderLyricsEffect(ctx,w,h,style,lines,time);
  const renderer=window.kefeEffects[effect] || window.kefeEffects[effect==='fadeup'?'storyfade':effect==='subjectstroke'?'stroke':effect];
  if(typeof renderer==='function') return renderer(ctx,w,h,style,lines,time);
  return originalRenderLyricsEffect(ctx,w,h,style,lines,time);
 } finally { ctx.restore(); }
};
const labels={
 apple:'Apple Music-style focus line with smooth, clean word highlighting',
 brat:'Brat-style compressed Arial with abrupt word-by-word switching',
 eternal:'Three-line handwritten cycle with Homemade Apple ink writing',
 aurora:'Flowing colour-gradient marker lyrics with a soft aurora glow',
 pulse:'Starfield — compact perspective lyric conveyor below centre',
 stroke:'Subject Stroke — crisp outlined typography designed to sit behind the subject',
 fadeup:'Story Fade — fast word-by-word rise and fade lyric animation'
};
if(typeof qsa==='function')qsa('[data-effect]').forEach(button=>button.addEventListener('click',()=>{const label=document.getElementById('effectLabel');if(label&&labels[button.dataset.effect])label.textContent=labels[button.dataset.effect];}));
})();
