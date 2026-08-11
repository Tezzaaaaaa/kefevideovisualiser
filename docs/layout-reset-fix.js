'use strict';
(()=>{
  const $=s=>document.querySelector(s);
  const fire=(el,type)=>el?.dispatchEvent(new Event(type,{bubbles:true}));

  const profileDefaults={
    apple:{align:'left',lineHeight:'1.02',spacing:'-0.02',view:'5'},
    charli:{align:'center',lineHeight:'0.84',spacing:'-0.055',view:'current'},
    eternal:{align:'left',lineHeight:'1.02',spacing:'0.005',view:'5'}
  };

  function effect(){
    const value=$('#lyricEffect')?.value||$('#quickEffect')?.value||$('#story')?.dataset.lyricEffect||'apple';
    return profileDefaults[value]?value:'apple';
  }

  function safeSize(){
    const aspect=$('#aspect')?.value||'16:9',key=effect();
    if(aspect==='9:16')return key==='charli'?'48':key==='eternal'?'42':'44';
    if(aspect==='4:5')return key==='charli'?'42':key==='eternal'?'36':'38';
    if(aspect==='1:1')return key==='charli'?'38':key==='eternal'?'34':'36';
    return key==='charli'?'34':key==='eternal'?'30':'32';
  }

  function setValue(id,value,events=['input','change']){
    const el=$('#'+id);if(!el)return;
    el.value=String(value);
    for(const type of events)fire(el,type);
  }

  function resetLegacyTransform(){
    const legacy=$('#resetLyricsTransform');
    if(legacy)legacy.click();
    setValue('studioScale','100',['input']);
    setValue('studioRotation','0',['input']);
    const lyrics=$('#lyrics');
    if(lyrics){
      lyrics.style.setProperty('--lina-drag-x','0px');
      lyrics.style.setProperty('--lina-drag-y','0px');
      lyrics.style.setProperty('--lina-scale','1');
      lyrics.style.setProperty('--lina-rotation','0deg');
    }
  }

  function resetLayout(){
    const key=effect(),defaults=profileDefaults[key];

    resetLegacyTransform();
    setValue('size',safeSize());
    setValue('yPos','50');
    setValue('contextMode',defaults.view,['change']);
    setValue('textAlign',defaults.align,['change','input']);
    setValue('lineHeight',defaults.lineHeight,['input','change']);
    setValue('letterSpacing',defaults.spacing,['input','change']);

    const lyrics=$('#lyrics');
    if(lyrics){
      lyrics.style.top='50%';
      lyrics.style.textAlign=defaults.align;
      lyrics.style.lineHeight=defaults.lineHeight;
      lyrics.style.letterSpacing=`${defaults.spacing}em`;
    }

    try{window.invalidateLinaMotion?.(true)}catch{}
    try{window.linaSyncTypography?.()}catch{}
    try{window.linaQuickSettingsSync?.()}catch{}

    const redraw=()=>{
      try{window.invalidateLinaMotion?.(true)}catch{}
      try{window.render?.((Number($('#audio')?.currentTime)||0)*1000)}catch{}
      try{window.linaQuickSettingsSync?.()}catch{}
    };
    requestAnimationFrame(()=>requestAnimationFrame(redraw));
    setTimeout(redraw,80);
    try{if(typeof markDirty==='function')markDirty()}catch{}
    try{if(typeof status==='function')status('Lyric layout reset.')}catch{}
  }

  function bind(){
    const old=$('#quickResetLayout');
    if(!old)return false;
    const button=old.cloneNode(true);
    button.dataset.linaReset='canonical';
    old.replaceWith(button);
    button.addEventListener('click',resetLayout);
    window.linaResetLyricLayout=resetLayout;
    document.documentElement.dataset.layoutReset='ready';
    return true;
  }

  function init(){let tries=0;const run=()=>{tries++;if(!bind()&&tries<50)setTimeout(run,60)};run()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
