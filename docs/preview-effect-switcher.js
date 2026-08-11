'use strict';
(()=>{
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];

  function effectName(value){
    return value==='charli'?'Charli xcx · Apple':value==='eternal'?'Eternal Sunshine':'Apple Music';
  }

  function currentEffect(){
    return $('#lyricEffect')?.value||$('.effect-option.active')?.dataset.effect||'apple';
  }

  function setEffect(value){
    const hidden=$('#lyricEffect');
    if(hidden)hidden.value=value;
    const target=$(`.effect-option[data-effect="${value}"]`);
    if(target)target.click();
    else {
      $('#story')?.setAttribute('data-lyric-effect',value);
      try{window.invalidateLinaMotion?.(true)}catch{}
      try{window.render?.((Number($('#audio')?.currentTime)||0)*1000)}catch{}
    }
    const select=$('#previewEffectSelect');
    if(select&&select.value!==value)select.value=value;
    const label=$('#previewEffectCurrent');
    if(label)label.textContent=effectName(value);
  }

  function buildSwitcher(){
    const wrap=$('.stage-wrap');
    if(!wrap||$('#previewEffectSwitcher'))return false;
    const box=document.createElement('div');
    box.id='previewEffectSwitcher';
    box.className='preview-effect-switcher';
    box.innerHTML='<div class="preview-effect-copy"><b>Lyric effect</b><span id="previewEffectCurrent">Apple Music</span></div><label class="preview-effect-field"><span>Choose effect</span><select id="previewEffectSelect"><option value="apple">Apple Music</option><option value="charli">Charli xcx · Apple</option><option value="eternal">Eternal Sunshine</option></select></label>';
    wrap.after(box);
    const select=$('#previewEffectSelect');
    select.value=currentEffect();
    $('#previewEffectCurrent').textContent=effectName(select.value);
    select.addEventListener('change',()=>setEffect(select.value));
    return true;
  }

  function hideMultiEffectPicker(){
    const section=$('.consolidated-effects');
    if(section)section.classList.add('effect-picker-retired');
  }

  function protectPageScroll(){
    const story=$('#story');
    if(!story||story.dataset.wheelProtected==='true')return false;
    story.dataset.wheelProtected='true';
    // Capture wheel events before the old lyric wheel handler sees them.
    // Do not preventDefault: the browser should continue normal page scrolling.
    story.addEventListener('wheel',e=>{
      e.stopPropagation();
      e.stopImmediatePropagation();
    },{capture:true,passive:true});
    return true;
  }

  function syncFromExistingPicker(){
    document.addEventListener('click',e=>{
      const option=e.target.closest?.('.effect-option[data-effect]');
      if(!option)return;
      const select=$('#previewEffectSelect');
      if(select)select.value=option.dataset.effect;
      const label=$('#previewEffectCurrent');
      if(label)label.textContent=effectName(option.dataset.effect);
    },true);
  }

  function init(){
    let tries=0;
    const run=()=>{
      tries++;
      const a=buildSwitcher(),b=protectPageScroll();
      hideMultiEffectPicker();
      if((!$('#previewEffectSwitcher')||!$('#story'))&&tries<50)setTimeout(run,60);
      else document.documentElement.dataset.previewEffectSwitcher='ready';
    };
    syncFromExistingPicker();
    run();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
