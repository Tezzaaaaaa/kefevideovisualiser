/* KEFE Visualiser — production lyric-effect registry */
(() => {
'use strict';
const originalRenderLyricsEffect=window.renderLyricsEffect;
if(typeof originalRenderLyricsEffect!=='function')throw new Error('KEFE effect registry loaded before the base lyric renderer.');
window.kefeEffects=window.kefeEffects||{};
const required=['brat','typewriter','instagram','fadeup','aurora','eternal'];
window.kefeEffectStatus=Object.freeze(Object.fromEntries(required.map(name=>[name,typeof window.kefeEffects[name]==='function'])));
window.renderLyricsEffect=function(ctx,w,h,style,lines,time){
  ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';ctx.shadowBlur=0;
  try{
    const effect=style?.effect;
    const modular={brat:window.kefeEffects.brat,typewriter:window.kefeEffects.typewriter,instagram:window.kefeEffects.instagram,fadeup:window.kefeEffects.fadeup,aurora:window.kefeEffects.aurora,eternal:window.kefeEffects.eternal};
    if(Object.prototype.hasOwnProperty.call(modular,effect)){
      const renderer=modular[effect];
      if(typeof renderer!=='function')throw new Error(`KEFE effect renderer unavailable: ${effect}`);
      return renderer(ctx,w,h,style,lines,time);
    }
    return originalRenderLyricsEffect(ctx,w,h,style,lines,time);
  }finally{ctx.restore();}
};
const labels={apple:'Apple Music — smooth focus line with continuous lyric movement',brat:'Brat — abrupt word-by-word switching',eternal:'Eternal Sunshine — fast per-letter handwritten ink reveal',aurora:'Aurora — atmospheric curtains, colour flow and luminous depth',typewriter:'Typewriter — precise character-by-character reveal with a restrained cursor',instagram:'Instagram Lyrics — bold stacked Story lyrics with an oversized active line',fadeup:'Fade Up — kinetic word-by-word rise, pop and settle'};
if(typeof qsa==='function')qsa('[data-effect]').forEach(button=>button.addEventListener('click',()=>{const label=document.getElementById('effectLabel');if(label&&labels[button.dataset.effect])label.textContent=labels[button.dataset.effect];}));

function instagramControl(key,label,min,max,step,unit){
  const row=document.createElement('div');row.className='control-row';
  const l=document.createElement('label');l.textContent=label;const value=document.createElement('span');value.style.marginLeft='6px';l.appendChild(value);row.appendChild(l);
  const input=document.createElement('input');input.type='range';input.min=min;input.max=max;input.step=step;input.value=window.state.style[key];
  const display=()=>{const v=Number(input.value);value.textContent=`${v}${unit||''}`;};display();
  input.addEventListener('input',()=>{if(window.isExporting)return;window.state.style[key]=Number(input.value);display();window.redrawCurrentPreviewFrame?.();});
  row.appendChild(input);return row;
}
function renderInstagramControls(){
  if(!window.state||window.state.style.effect!=='instagram')return;
  const container=document.getElementById('effectControls');if(!container)return;
  const old=document.getElementById('instagramLyricControls');if(old)old.remove();
  const wrap=document.createElement('div');wrap.id='instagramLyricControls';
  wrap.appendChild(instagramControl('instagramFontSize','Base size',56,130,1,'px'));
  wrap.appendChild(instagramControl('instagramActiveScale','Active scale',1.05,1.55,.01,'x'));
  wrap.appendChild(instagramControl('instagramInactiveScale','Inactive scale',.55,.95,.01,'x'));
  wrap.appendChild(instagramControl('instagramInactiveOpacity','Inactive opacity',.12,.75,.01,''));
  wrap.appendChild(instagramControl('instagramLineSpacing','Line spacing',.58,1.08,.01,'x'));
  wrap.appendChild(instagramControl('instagramY','Vertical position',.28,.72,.01,''));
  wrap.appendChild(instagramControl('instagramTransition','Transition',.08,.45,.01,'s'));
  const colourRow=document.createElement('div');colourRow.className='control-row';const label=document.createElement('label');label.textContent='Lyric colour';colourRow.appendChild(label);const colour=document.createElement('input');colour.type='color';colour.value=window.state.style.instagramTextColor||'#FFFFFF';colour.addEventListener('input',()=>{if(window.isExporting)return;window.state.style.instagramTextColor=colour.value;window.redrawCurrentPreviewFrame?.();});colourRow.appendChild(colour);wrap.appendChild(colourRow);
  container.appendChild(wrap);
}

const instagramButton=document.querySelector('[data-effect="instagram"]')||document.querySelector('[data-effect="stroke"]');
if(instagramButton){
  instagramButton.dataset.effect='instagram';
  instagramButton.textContent='Instagram Lyrics';
  instagramButton.title='Instagram Stories Music lyrics style';
  instagramButton.addEventListener('click',()=>{
    if(window.state?.style){
      Object.assign(window.state.style,{instagramFontSize:window.state.style.instagramFontSize??92,instagramActiveScale:window.state.style.instagramActiveScale??1.28,instagramInactiveScale:window.state.style.instagramInactiveScale??.78,instagramInactiveOpacity:window.state.style.instagramInactiveOpacity??.42,instagramLineSpacing:window.state.style.instagramLineSpacing??.82,instagramY:window.state.style.instagramY??.51,instagramTransition:window.state.style.instagramTransition??.18,instagramTextColor:window.state.style.instagramTextColor??'#FFFFFF'});
    }
    const label=document.getElementById('effectLabel');if(label)label.textContent=labels.instagram;
    renderInstagramControls();
  });
}

Promise.resolve().then(()=>{
  if(window.state?.style?.effect==='instagram')renderInstagramControls();
});
})();
