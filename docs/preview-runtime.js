'use strict';
(()=>{
  const advancedRender=window.render;
  if(typeof advancedRender!=='function')return;
  const titleCard=document.getElementById('titleCard');

  const selectedContext=()=>{
    try{
      if(typeof contextWindow==='function')return contextWindow();
    }catch{}
    const value=document.getElementById('contextMode')?.value||'3';
    if(value==='current')return{before:0,after:0,total:1};
    const total=Math.max(1,Math.min(9,Number(value)||3));
    const before=Math.floor((total-1)/2);
    return{before,after:total-1-before,total};
  };

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

      // This is the final visibility authority. Never override the user's Lyrics view
      // with a fixed safety radius: Current / 3 / 5 / 7 / 9 must mean exactly that.
      const cw=selectedContext();
      const active=Math.max(0,Math.min(lines.length-1,typeof ci==='function'?ci(ms):0));
      const lo=Math.max(0,active-cw.before),hi=Math.min(lines.length-1,active+cw.after);
      lyricsEl.querySelectorAll('.apple-line').forEach((el,domIndex)=>{
        const lineIndex=Number.isFinite(Number(el.dataset.line))?Number(el.dataset.line):domIndex;
        el.style.visibility=lineIndex>=lo&&lineIndex<=hi?'visible':'hidden';
      });
    }else{
      if(titleCard){titleCard.hidden=false;titleCard.removeAttribute('aria-hidden');titleCard.style.removeProperty('display')}
      lyricsEl.style.removeProperty('visibility');lyricsEl.style.removeProperty('opacity');lyricsEl.style.removeProperty('z-index');
    }
  };

  const fallback=(ms,err)=>{
    console.error('LINA advanced preview failed; using safe lyric preview',err);
    if(!Array.isArray(lines)||!lines.length){lyricsEl.textContent='Add lyrics to begin';return}
    const ent=entranceMs();if(ms<ent){lyricsEl.textContent='';return}
    const i=ci(ms),cw=selectedContext(),parts=[];
    for(let n=Math.max(0,i-cw.before);n<=Math.min(lines.length-1,i+cw.after);n++){
      const cls=n===i?'apple-current':'apple-neighbour';
      parts.push(`<div class="apple-line ${cls}" data-line="${n}" style="visibility:visible;opacity:${n===i?1:.45}">${esc(lines[n].text)}</div>`);
    }
    lyricsEl.innerHTML=`<div class="apple-flow" style="position:relative;top:auto;transform:none;opacity:1;visibility:visible">${parts.join('')}</div>`;
    lyricsEl.classList.add('visible');lyricsEl.classList.remove('preenter');lyricsEl.style.opacity='1';lyricsEl.style.visibility='visible';lyricsEl.style.zIndex='4';
    if(titleCard){titleCard.classList.remove('on');titleCard.hidden=true;titleCard.style.display='none';titleCard.setAttribute('aria-hidden','true')}
    const meta=document.getElementById('activeMeta');if(meta)meta.textContent=`Lyric ${i+1} of ${lines.length} · ${cw.total===1?'current only':`${cw.total} on screen`}`;
  };

  window.render=function(ms){
    try{const result=advancedRender(ms);safeRange(ms);return result}catch(err){fallback(ms,err)}
  };

  document.getElementById('contextMode')?.addEventListener('change',()=>{
    try{window.invalidateLinaMotion?.(true)}catch{}
    try{window.render?.((Number(document.getElementById('audio')?.currentTime)||0)*1000)}catch{}
  });

  window.linaPreviewRuntime={safeRange,fallback,selectedContext};
})();
