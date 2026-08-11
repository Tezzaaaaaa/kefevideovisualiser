'use strict';
(()=>{
  const $=s=>document.querySelector(s);
  const defaults={
    apple:{font:'apple-system',weight:'700',align:'left',lineHeight:'1.02',spacing:'-0.02',view:'5'},
    charli:{font:'charli-condensed',weight:'900',align:'center',lineHeight:'0.84',spacing:'-0.055',view:'current'},
    eternal:{font:'eternal-reenie',weight:'400',align:'left',lineHeight:'1.02',spacing:'0.005',view:'5'}
  };

  function effect(){
    const v=window.linaRuntime?.getEffect?.()||$('#quickEffect')?.value||$('#lyricEffect')?.value||'apple';
    return defaults[v]?v:'apple';
  }

  function sizeFor(key){
    const aspect=$('#aspect')?.value||$('#quickFrame')?.value||'16:9';
    if(aspect==='9:16')return key==='charli'?'48':key==='eternal'?'42':'44';
    if(aspect==='4:5')return key==='charli'?'42':key==='eternal'?'36':'38';
    if(aspect==='1:1')return key==='charli'?'38':key==='eternal'?'34':'36';
    return key==='charli'?'34':key==='eternal'?'30':'32';
  }

  function value(id,v){
    const el=$('#'+id);if(!el)return;
    el.value=String(v);
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function text(id,v){const el=$('#'+id);if(el)el.textContent=String(v)}

  function resetNow(){
    const key=effect(),d=defaults[key],size=sizeFor(key),lyrics=$('#lyrics');

    value('size',size);value('quickSize',size);
    value('yPos','50');value('quickY','50');
    value('contextMode',d.view);value('quickLyricsView',d.view);
    value('fontChoice',d.font);value('quickFont',d.font);
    value('fontWeight',d.weight);value('quickWeight',d.weight);
    value('textAlign',d.align);value('quickAlign',d.align);
    value('lineHeight',d.lineHeight);value('quickLineHeight',d.lineHeight);
    value('letterSpacing',d.spacing);value('quickLetterSpacing',d.spacing);
    value('textColor','#ffffff');value('quickTextColor','#ffffff');
    value('letterCase','original');value('quickCase','original');
    value('glow','100');value('quickGlow','100');

    const studio=window.linaConsolidatedState;
    if(studio){studio.x=0;studio.y=0;studio.scale=1;studio.rot=0;studio.effect=key}
    value('studioScale','100');value('studioRotation','0');

    if(lyrics){
      lyrics.style.fontSize=`${size}px`;
      lyrics.style.top='50%';
      lyrics.style.textAlign=d.align;
      lyrics.style.fontWeight=d.weight;
      lyrics.style.lineHeight=d.lineHeight;
      lyrics.style.letterSpacing=`${d.spacing}em`;
      lyrics.style.color='#ffffff';
      lyrics.style.textTransform='none';
      lyrics.style.removeProperty('transform');
      lyrics.style.setProperty('--lina-drag-x','0px');
      lyrics.style.setProperty('--lina-drag-y','0px');
      lyrics.style.setProperty('--lina-scale','1');
      lyrics.style.setProperty('--lina-rotation','0deg');
      lyrics.classList.remove('lyric-backdrop-soft','lyric-backdrop-solid');
    }

    document.documentElement.style.setProperty('--lyric-weight',d.weight);
    document.documentElement.style.setProperty('--lyric-lh',d.lineHeight);
    document.documentElement.style.setProperty('--accent','#ffffff');

    text('sizeVal',size);text('quickYVal','50%');text('lineHeightVal',Number(d.lineHeight).toFixed(2));
    text('quickLineHeightVal',Number(d.lineHeight).toFixed(2));
    text('letterSpacingVal',`${Number(d.spacing).toFixed(3).replace(/0+$/,'').replace(/\.$/,'')}em`);
    text('quickLetterSpacingVal',`${Number(d.spacing).toFixed(3).replace(/0+$/,'').replace(/\.$/,'')}em`);
    text('glowVal','100%');text('quickGlowVal','100%');

    try{window.linaSyncTypography?.()}catch{}
    try{window.invalidateLinaMotion?.(true)}catch{}
    try{window.render?.((Number($('#audio')?.currentTime)||0)*1000)}catch{}
    try{markDirty?.()}catch{}
    try{status?.('Lyric styling reset.')}catch{}

    document.documentElement.dataset.lastFreshReset=String(Date.now());
  }

  function install(){
    const actions=$('#previewQuickControls .quick-actions');
    if(!actions)return false;

    $('#quickResetLayout')?.remove();
    if($('#linaFreshReset'))return true;

    const button=document.createElement('button');
    button.id='linaFreshReset';
    button.className='btn subtle';
    button.type='button';
    button.textContent='Reset lyrics';
    button.dataset.linaOwner='fresh-direct';
    button.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      resetNow();
    },true);
    actions.prepend(button);
    return true;
  }

  if(!install()){
    const observer=new MutationObserver(()=>{if(install())observer.disconnect()});
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>{install();observer.disconnect()},5000);
  }

  window.linaFreshReset=resetNow;
})();