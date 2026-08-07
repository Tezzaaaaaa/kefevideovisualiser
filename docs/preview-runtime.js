'use strict';
(()=>{
  const advancedRender=window.render;
  if(typeof advancedRender!=='function')return;
  const titleCard=document.getElementById('titleCard');
  const safeRange=(ms)=>{
    if(!Array.isArray(lines)||!lines.length)return;
    const ent=entranceMs(),last=lines.at(-1),lastEnd=(last?.start||0)+offset+Math.max(280,last?.duration||0),lyricsActive=ms>=ent;
    if(lyricsActive){
      if(titleCard){titleCard.classList.remove('on');titleCard.hidden=true;titleCard.style.display='none';titleCard.setAttribute('aria-hidden','true')}
      lyricsEl.classList.add('visible');lyricsEl.classList.remove('preenter');lyricsEl.style.opacity='1';lyricsEl.style.visibility='visible';lyricsEl.style.zIndex='4';
      const flow=lyricsEl.querySelector('.apple-flow');
      if(flow){
        flow.style.visibility='visible';
        const alpha=Number.parseFloat(flow.style.opacity||'1');
        if(ms>=ent+240&&ms<=lastEnd+250&&(!Number.isFinite(alpha)||alpha<.02))flow.style.opacity='1';
      }
      const state=typeof lyricMotionAnchor==='function'?lyricMotionAnchor(ms):null,anchor=state?.anchor??ci(ms),lo=Math.max(0,Math.floor(anchor)-6),hi=Math.min(lines.length-1,Math.ceil(anchor)+6);
      lyricsEl.querySelectorAll('.apple-line').forEach((el,i)=>{el.style.visibility=i>=lo&&i<=hi?'visible':'hidden'});
    }else{
      if(titleCard){titleCard.hidden=false;titleCard.removeAttribute('aria-hidden');titleCard.style.removeProperty('display')}
      lyricsEl.style.removeProperty('visibility');lyricsEl.style.removeProperty('opacity');lyricsEl.style.removeProperty('z-index');
    }
  };
  const fallback=(ms,err)=>{
    console.error('LINA advanced preview failed; using safe lyric preview',err);
    if(!Array.isArray(lines)||!lines.length){lyricsEl.textContent='Add lyrics to begin';return}
    const ent=entranceMs();if(ms<ent){lyricsEl.textContent='';return}
    const i=ci(ms),cw=contextWindow(),parts=[];
    for(let n=Math.max(0,i-cw.before);n<=Math.min(lines.length-1,i+cw.after);n++){const cls=n===i?'apple-current':'apple-neighbour';parts.push(`<div class="apple-line ${cls}" style="visibility:visible;opacity:${n===i?1:.45}">${esc(lines[n].text)}</div>`)}
    lyricsEl.innerHTML=`<div class="apple-flow" style="position:relative;top:auto;transform:none;opacity:1;visibility:visible">${parts.join('')}</div>`;
    lyricsEl.classList.add('visible');lyricsEl.classList.remove('preenter');lyricsEl.style.opacity='1';lyricsEl.style.visibility='visible';lyricsEl.style.zIndex='4';
    if(titleCard){titleCard.classList.remove('on');titleCard.hidden=true;titleCard.style.display='none';titleCard.setAttribute('aria-hidden','true')}
    const meta=document.getElementById('activeMeta');if(meta)meta.textContent=`Lyric ${i+1} of ${lines.length}`;
  };
  window.render=function(ms){
    try{const result=advancedRender(ms);safeRange(ms);return result}catch(err){fallback(ms,err)}
  };
  window.linaPreviewRuntime={safeRange,fallback};
})();
