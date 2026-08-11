'use strict';
(()=>{
  const $=s=>document.querySelector(s);

  const fire=(el,type)=>el?.dispatchEvent(new Event(type,{bubbles:true}));
  const copyOptions=(source,target)=>{
    if(!source||!target)return;
    target.replaceChildren(...[...source.options].map(o=>{
      const n=document.createElement('option');
      n.value=o.value;n.textContent=o.textContent;n.disabled=o.disabled;
      return n;
    }));
    target.value=source.value;
  };

  function safeSize(){
    const aspect=$('#aspect')?.value||'16:9';
    const effect=$('#previewEffectSelect')?.value||$('#lyricEffect')?.value||'apple';
    if(aspect==='9:16')return effect==='charli'?'48':effect==='eternal'?'42':'44';
    if(aspect==='4:5')return effect==='charli'?'42':effect==='eternal'?'36':'38';
    if(aspect==='1:1')return effect==='charli'?'38':effect==='eternal'?'34':'36';
    return effect==='charli'?'34':effect==='eternal'?'30':'32';
  }

  function resetLayout(){
    $('#resetLyricsTransform')?.click();
    const size=$('#size');
    if(size){size.value=String(safeSize());fire(size,'input');fire(size,'change')}
    const y=$('#yPos');
    if(y){y.value='50';fire(y,'input');fire(y,'change')}
    try{window.invalidateLinaMotion?.(true)}catch{}
    try{window.render?.((Number($('#audio')?.currentTime)||0)*1000)}catch{}
  }

  function build(){
    const stageWrap=$('.stage-wrap');
    if(!stageWrap||$('#previewQuickControls'))return false;

    $('#previewEffectSwitcher')?.remove();
    $('#simpleControlSummary')?.remove();

    const box=document.createElement('section');
    box.id='previewQuickControls';
    box.className='preview-quick-controls';
    box.innerHTML=`
      <div class="quick-control-head"><b>Quick settings</b><span>Change the essentials here. Everything stays reversible.</span></div>
      <div class="quick-control-grid">
        <label><span>Effect</span><select id="quickEffect"><option value="apple">Apple Music</option><option value="charli">Charli xcx · Apple</option><option value="eternal">Eternal Sunshine</option></select></label>
        <label><span>Text size</span><select id="quickSize"><option value="26">Small</option><option value="32">Medium</option><option value="38">Large</option><option value="44">Extra large</option></select></label>
        <label><span>Lyrics view</span><select id="quickLyricsView"></select></label>
        <label><span>Frame</span><select id="quickFrame"></select></label>
      </div>
      <button id="quickResetLayout" class="btn subtle" type="button">Reset lyric layout</button>`;

    // Playback belongs immediately under the preview. Quick settings follow playback.
    const transport=$('.transport');
    const transportTools=$('.transport-tools');
    if(transportTools)transportTools.after(box);
    else if(transport)transport.after(box);
    else stageWrap.after(box);

    const effect=$('#previewEffectSelect');
    const size=$('#size');
    const context=$('#contextMode');
    const aspect=$('#aspect');
    const qe=$('#quickEffect'),qs=$('#quickSize'),ql=$('#quickLyricsView'),qf=$('#quickFrame');

    qe.value=effect?.value||$('#lyricEffect')?.value||'apple';
    copyOptions(context,ql);copyOptions(aspect,qf);

    const sizeNum=Number(size?.value)||safeSize();
    const sizeValues=[...qs.options].map(o=>Number(o.value));
    qs.value=String(sizeValues.reduce((a,b)=>Math.abs(b-sizeNum)<Math.abs(a-sizeNum)?b:a,sizeValues[0]));

    qe.addEventListener('change',()=>{
      if(effect){effect.value=qe.value;fire(effect,'change')}
      else{
        const hidden=$('#lyricEffect');if(hidden)hidden.value=qe.value;
        $(`.effect-option[data-effect="${qe.value}"]`)?.click();
      }
      setTimeout(resetLayout,0);
    });
    qs.addEventListener('change',()=>{if(size){size.value=qs.value;fire(size,'input');fire(size,'change')}});
    ql.addEventListener('change',()=>{if(context){context.value=ql.value;fire(context,'change')}});
    qf.addEventListener('change',()=>{if(aspect){aspect.value=qf.value;fire(aspect,'change');setTimeout(resetLayout,0)}});
    $('#quickResetLayout').addEventListener('click',resetLayout);

    const sync=()=>{
      if(effect&&qe.value!==effect.value)qe.value=effect.value;
      if(context&&ql.value!==context.value)ql.value=context.value;
      if(aspect&&qf.value!==aspect.value)qf.value=aspect.value;
    };
    document.addEventListener('change',e=>{
      if(e.target===effect||e.target===context||e.target===aspect)setTimeout(sync,0);
    });

    // Free page scrolling should never alter lyric geometry.
    const story=$('#story');
    if(story&&story.dataset.geometryLocked!=='true'){
      story.dataset.geometryLocked='true';
      for(const type of ['wheel','pointerdown','pointermove']){
        story.addEventListener(type,e=>{e.stopPropagation();e.stopImmediatePropagation()},{capture:true,passive:true});
      }
    }

    // Start from a sane, centred preset instead of restoring accidental geometry.
    setTimeout(resetLayout,20);
    return true;
  }

  function init(){
    let tries=0;
    const run=()=>{tries++;if(!build()&&tries<50)setTimeout(run,60)};
    run();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();