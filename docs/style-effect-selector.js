'use strict';
(()=>{
  const $=s=>document.querySelector(s);
  const EFFECTS={apple:'Apple Music',charli:'Charli xcx · Apple',eternal:'Eternal Sunshine'};

  function currentEffect(){
    return window.linaRuntime?.getEffect?.()||$('#quickEffect')?.value||$('#lyricEffect')?.value||$('#story')?.dataset.lyricEffect||'apple';
  }

  function syncCopy(value=currentEffect()){
    const name=EFFECTS[value]||EFFECTS.apple;
    const select=$('#styleEffectSelect');
    if(select&&select.value!==value)select.value=value;

    const guide=$('[data-panel="style"] .step-guide');
    if(guide){
      const title=guide.querySelector('b');
      const text=guide.querySelector('span');
      if(title)title.textContent='Choose how the lyrics look';
      if(text)text.textContent='1. Choose the lyric effect here. 2. Adjust its typography if you want. 3. Check the Preview below. Then press Next.';
    }

    const font=$('#fontChoice');
    const section=font?.closest('.subsection');
    const head=section?.querySelector('.subhead b');
    const meta=section?.querySelector('.subhead span');
    const helper=section?.querySelector('.helper');
    if(head)head.textContent=`2. Typography · ${name}`;
    if(meta)meta.textContent='Optional';
    if(helper)helper.textContent=`These font choices belong to ${name}. You can leave the default or choose another font here.`;
  }

  function applyEffect(value){
    if(window.linaRuntime?.setEffect){
      window.linaRuntime.setEffect(value);
      setTimeout(()=>syncCopy(value),0);
      return;
    }
    const quick=$('#quickEffect');
    if(quick){
      quick.value=value;
      quick.dispatchEvent(new Event('change',{bubbles:true}));
    }else{
      const hidden=$('#lyricEffect');
      if(hidden)hidden.value=value;
      const option=$(`.effect-option[data-effect="${value}"]`);
      if(option)option.click();
      else{
        $('#story')?.setAttribute('data-lyric-effect',value);
        try{window.invalidateLinaMotion?.(true)}catch{}
        try{window.render?.((Number($('#audio')?.currentTime)||0)*1000)}catch{}
      }
    }
    setTimeout(()=>syncCopy(value),0);
  }

  function build(){
    const panel=$('[data-panel="style"]');
    const body=panel?.querySelector('.body');
    if(!body)return false;

    let section=$('#styleEffectChoice');
    if(!section){
      section=document.createElement('div');
      section.id='styleEffectChoice';
      section.className='subsection style-effect-choice';
      section.innerHTML=`<div class="subhead"><b>1. Choose lyric effect</b><span>Required</span></div><label class="field"><span>Lyric effect</span><select id="styleEffectSelect"><option value="apple">Apple Music</option><option value="charli">Charli xcx · Apple</option><option value="eternal">Eternal Sunshine</option></select></label><div class="helper">Pick the effect here. The Preview below updates immediately.</div>`;
      const guide=body.querySelector(':scope > .step-guide');
      if(guide)guide.insertAdjacentElement('afterend',section);
      else body.prepend(section);
    }

    const select=$('#styleEffectSelect');
    if(select&&select.dataset.bound!=='true'){
      select.dataset.bound='true';
      select.addEventListener('change',()=>applyEffect(select.value));
    }

    syncCopy();
    return true;
  }

  function bindSync(){
    if(document.documentElement.dataset.styleEffectSync==='true')return;
    document.documentElement.dataset.styleEffectSync='true';
    document.addEventListener('change',e=>{
      if(e.target?.id==='quickEffect'||e.target?.id==='lyricEffect')setTimeout(()=>syncCopy(),0);
    });
    document.addEventListener('click',e=>{
      if(e.target.closest?.('.effect-option[data-effect]'))setTimeout(()=>syncCopy(),0);
    },true);
  }

  function init(){
    bindSync();
    let tries=0;
    const run=()=>{tries++;if(!build()&&tries<50)setTimeout(run,60)};
    run();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();