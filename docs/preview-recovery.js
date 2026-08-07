'use strict';
(()=>{
  const baseBgStyle=window.bgStyle;
  const titleCard=document.getElementById('titleCard');

  function ensureBackground(){
    const wantsArtwork=!!document.getElementById('useArtworkBg')?.checked||!!document.getElementById('useArtworkBg2')?.checked;
    const attached=!!(bgMedia&&bg?.contains(bgMedia));
    if(!attached){
      if(manualBgFile){
        if(bgURL?.startsWith('blob:'))try{URL.revokeObjectURL(bgURL)}catch{}
        bgURL=URL.createObjectURL(manualBgFile);
        setBgSource(bgURL,manualBgFile.name||'Background',manualBgFile.type?.startsWith('video')?'video':'image');
      }else if(wantsArtwork&&artworkObjectURL){
        setBgSource(artworkObjectURL,'Selected artwork','image');
      }
    }
    if(bg){bg.style.visibility='visible';bg.style.opacity='1';bg.style.display='block'}
    if(bgMedia){
      bgMedia.style.visibility='visible';bgMedia.style.opacity='1';bgMedia.style.display='block';
    }
  }

  window.bgStyle=function(){
    ensureBackground();
    if(typeof baseBgStyle==='function')baseBgStyle();
    ensureBackground();
  };

  function handoff(ms){
    if(!Array.isArray(lines)||!lines.length)return;
    const active=ms>=entranceMs();
    if(active){
      if(titleCard){titleCard.classList.remove('on');titleCard.hidden=true;titleCard.style.setProperty('display','none','important')}
      lyricsEl.classList.add('visible');lyricsEl.classList.remove('preenter');
      lyricsEl.style.setProperty('opacity','1','important');
      lyricsEl.style.setProperty('visibility','visible','important');
      lyricsEl.style.setProperty('height','82%');
      const flow=lyricsEl.querySelector('.apple-flow');
      if(flow){flow.style.setProperty('visibility','visible','important');if((parseFloat(flow.style.opacity)||0)<.02)flow.style.opacity='1'}
    }else if(titleCard){
      titleCard.hidden=false;titleCard.style.removeProperty('display');
    }
  }

  const baseRender=window.render;
  if(typeof baseRender==='function')window.render=function(ms){
    let out;
    try{out=baseRender(ms)}finally{handoff(ms);ensureBackground()}
    return out;
  };

  ['dim','blur','cropX','cropY','cropZoom','bgFit'].forEach(id=>document.getElementById(id)?.addEventListener('input',()=>requestAnimationFrame(()=>{ensureBackground();if(typeof baseBgStyle==='function')baseBgStyle()})));
  window.linaPreviewRecovery={ensureBackground,handoff};
})();
