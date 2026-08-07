'use strict';
(()=>{
  const advancedRender=window.render;
  if(typeof advancedRender!=='function')return;
  const titleCard=document.getElementById('titleCard');
  const safeRange=(ms)=>{
    if(!Array.isArray(lines)||!lines.length)return;
    const ent=entranceMs();
    const lyricsActive=ms>=ent;
    if(lyricsActive){
      titleCard?.classList.remove('on');
      if(titleCard)titleCard.style.display='none';
      lyricsEl.classList.add('visible');
      lyricsEl.classList.remove('preenter');
      lyricsEl.style.opacity='1';
      lyricsEl.style.visibility='visible';
      lyricsEl.style.zIndex='4';
      const state=typeof lyricMotionAnchor==='function'?lyricMotionAnchor(ms):null;
      const anchor=state?.anchor??ci(ms);
      const lo=Math.max(0,Math.floor(anchor)-6),hi=Math.min(lines.length-1,Math.ceil(anchor)+6);
      const lyricEls=lyricsEl.querySelectorAll('.apple-line');
      lyricEls.forEach((el,i)=>{el.style.visibility=i>=lo&&i<=hi?'visible':'hidden'});
    }else{
      if(titleCard)titleCard.style.removeProperty('display');
      lyricsEl.style.removeProperty('visibility');
      lyricsEl.style.removeProperty('opacity');
      lyricsEl.style.removeProperty('z-index');
    }
  };
  const fallback=(ms,err)=>{
    console.error('LINA advanced preview failed; using safe lyric preview',err);
    if(!Array.isArray(lines)||!lines.length){lyricsEl.textContent='Add lyrics to begin';return}
    const ent=entranceMs();
    if(ms<ent){lyricsEl.textContent='';return}
    const i=ci(ms),cw=contextWindow();
    const parts=[];
    for(let n=Math.max(0,i-cw.before);n<=Math.min(lines.length-1,i+cw.after);n++){
      const cls=n===i?'apple-current':'apple-neighbour';
      parts.push(`<div class="apple-line ${cls}" style="visibility:visible">${esc(lines[n].text)}</div>`);
    }
    lyricsEl.innerHTML=`<div class="apple-flow" style="position:relative;top:auto;transform:none;opacity:1">${parts.join('')}</div>`;
    lyricsEl.classList.add('visible');lyricsEl.classList.remove('preenter');lyricsEl.style.opacity='1';lyricsEl.style.visibility='visible';
    titleCard?.classList.remove('on');if(titleCard)titleCard.style.display='none';
    const meta=document.getElementById('activeMeta');if(meta)meta.textContent=`Lyric ${i+1} of ${lines.length}`;
  };
  window.render=function(ms){
    try{
      const result=advancedRender(ms);
      safeRange(ms);
      return result;
    }catch(err){
      fallback(ms,err);
    }
  };
  window.linaPreviewRuntime={safeRange,fallback};
})();
