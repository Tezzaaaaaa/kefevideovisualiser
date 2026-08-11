'use strict';
(()=>{
  const $=s=>document.querySelector(s);
  const profiles={
    apple:{font:'apple-system',stack:'-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Helvetica Neue",Arial,sans-serif',weight:'700',align:'left',lineHeight:'1.02',spacing:'-0.02',view:'5'},
    charli:{font:'charli-condensed',stack:'"Arial Narrow","Helvetica Neue Condensed","Helvetica Neue",Arial,sans-serif',weight:'900',align:'center',lineHeight:'0.84',spacing:'-0.055',view:'current'},
    eternal:{font:'eternal-reenie',stack:'"Reenie Beanie","Waiting for the Sunrise","Segoe Print","Bradley Hand",cursive',weight:'400',align:'left',lineHeight:'1.02',spacing:'0.005',view:'5'}
  };

  function currentEffect(){
    const value=window.linaRuntime?.getEffect?.()||$('#quickEffect')?.value||$('#lyricEffect')?.value||$('#story')?.dataset.lyricEffect||'apple';
    return profiles[value]?value:'apple';
  }

  function resetSize(key){
    const aspect=$('#quickFrame')?.value||$('#aspect')?.value||'16:9';
    if(aspect==='9:16')return key==='charli'?'48':key==='eternal'?'42':'44';
    if(aspect==='4:5')return key==='charli'?'42':key==='eternal'?'36':'38';
    if(aspect==='1:1')return key==='charli'?'38':key==='eternal'?'34':'36';
    return key==='charli'?'34':key==='eternal'?'30':'32';
  }

  function raw(id,value){const el=$('#'+id);if(el)el.value=String(value)}
  function label(id,value){const el=$('#'+id);if(el)el.textContent=String(value)}

  function resetLyrics(){
    const key=currentEffect(),p=profiles[key],size=resetSize(key),lyrics=$('#lyrics'),story=$('#story'),root=document.documentElement;

    raw('size',size);raw('quickSize',size);
    raw('yPos','50');raw('quickY','50');
    raw('contextMode',p.view);raw('quickLyricsView',p.view);
    raw('fontChoice',p.font);raw('quickFont',p.font);
    raw('fontWeight',p.weight);raw('quickWeight',p.weight);
    raw('textAlign',p.align);raw('quickAlign',p.align);
    raw('lineHeight',p.lineHeight);raw('quickLineHeight',p.lineHeight);
    raw('letterSpacing',p.spacing);raw('quickLetterSpacing',p.spacing);
    raw('textColor','#ffffff');raw('quickTextColor','#ffffff');
    raw('letterCase','original');raw('quickCase','original');
    raw('glow','100');raw('quickGlow','100');
    raw('studioScale','100');raw('studioRotation','0');

    const typography=window.linaTypographyState?.[key];
    if(typography){typography.font=p.font;typography.weight=p.weight;typography.align=p.align;typography.lineHeight=p.lineHeight;typography.spacing=p.spacing}
    const studio=window.linaConsolidatedState;
    if(studio){studio.effect=key;studio.x=0;studio.y=0;studio.scale=1;studio.rot=0}

    root.style.setProperty('--lyric-weight',p.weight);
    root.style.setProperty('--lyric-lh',p.lineHeight);
    root.style.setProperty('--accent','#ffffff');
    if(story){
      story.style.setProperty('--lina-effect-font',p.stack);
      story.style.setProperty('--lina-effect-weight',p.weight);
      story.style.setProperty('--lina-effect-align',p.align);
      story.style.setProperty('--lina-effect-lh',p.lineHeight);
      story.style.setProperty('--lina-effect-spacing',`${p.spacing}em`);
    }
    if(lyrics){
      lyrics.style.fontFamily=p.stack;
      lyrics.style.fontSize=`${size}px`;
      lyrics.style.top='50%';
      lyrics.style.textAlign=p.align;
      lyrics.style.fontWeight=p.weight;
      lyrics.style.lineHeight=p.lineHeight;
      lyrics.style.letterSpacing=`${p.spacing}em`;
      lyrics.style.color='#ffffff';
      lyrics.style.textTransform='none';
      lyrics.style.removeProperty('transform');
      lyrics.style.setProperty('--lina-drag-x','0px');
      lyrics.style.setProperty('--lina-drag-y','0px');
      lyrics.style.setProperty('--lina-scale','1');
      lyrics.style.setProperty('--lina-rotation','0deg');
      lyrics.classList.remove('lyric-backdrop-soft','lyric-backdrop-solid');
    }

    label('sizeVal',size);label('quickYVal','50%');label('glowVal','100%');label('quickGlowVal','100%');
    label('lineHeightVal',Number(p.lineHeight).toFixed(2));label('quickLineHeightVal',Number(p.lineHeight).toFixed(2));
    const spacing=`${Number(p.spacing).toFixed(3).replace(/0+$/,'').replace(/\.$/,'')}em`;
    label('letterSpacingVal',spacing);label('quickLetterSpacingVal',spacing);
    label('studioScaleVal','100%');label('studioRotationVal','0°');

    try{window.invalidateLinaMotion?.(true)}catch{}
    try{window.render?.((Number($('#audio')?.currentTime)||0)*1000)}catch{}
    try{markDirty?.()}catch{}
    root.dataset.lastDirectLyricReset=String(Date.now());

    const button=$('#resetLyricsBtn');
    if(button){button.textContent='Reset done';button.disabled=true;setTimeout(()=>{button.textContent='Reset lyrics';button.disabled=false},700)}
  }

  function install(){
    if($('#resetLyricsBtn'))return true;
    const old=$('#quickResetLayout')||$('#linaFreshReset');
    if(!old)return false;
    const button=document.createElement('button');
    button.id='resetLyricsBtn';
    button.className=old.className||'btn subtle';
    button.type='button';
    button.textContent='Reset lyrics';
    button.dataset.linaOwner='direct-v2';
    button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();resetLyrics()},true);
    old.replaceWith(button);
    return true;
  }

  if(!install())requestAnimationFrame(()=>{if(!install())setTimeout(install,100)});
  window.linaDirectResetV2=resetLyrics;
})();