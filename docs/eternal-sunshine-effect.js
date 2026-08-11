'use strict';
(()=>{
  const $=s=>document.querySelector(s);
  const baseRender=window.render;
  if(typeof baseRender!=='function')return;

  const PAGE_LINES=5;
  let raf=0;

  const clamp01=x=>Math.max(0,Math.min(1,x));
  const ease=x=>{x=clamp01(x);return x*x*(3-2*x)};
  const active=()=>($('#quickEffect')?.value||$('#styleEffectSelect')?.value||$('#lyricEffect')?.value||$('#story')?.dataset.lyricEffect||'apple')==='eternal';
  const hash01=(a,b,c)=>{let x=((a+1)*73856093)^((b+1)*19349663)^((c+1)*83492791);x=(x^(x>>>13))*1274126177;return((x^(x>>>16))>>>0)/4294967295};

  function splitWord(span,text){
    const raw=String(text||'');
    if(span.dataset.esText===raw&&span.querySelector('.es-char'))return [...span.children];
    span.dataset.esText=raw;
    span.textContent='';
    return [...raw].map((ch,k)=>{
      const el=document.createElement('span');
      el.className='es-char';
      el.dataset.c=String(k);
      el.textContent=ch;
      span.append(el);
      return el;
    });
  }

  function restorePlain(){
    document.querySelectorAll('.apple-word[data-es-text]').forEach(span=>{
      span.textContent=span.dataset.esText||span.textContent;
      delete span.dataset.esText;
    });
    $('#lyrics')?.classList.remove('eternal-running');
  }

  function wordWriteWindow(w){
    const d=Math.max(90,Number(w?.duration)||260);
    return Math.max(160,Math.min(720,d*.62));
  }

  function pageFor(i){
    const start=Math.floor(Math.max(0,i)/PAGE_LINES)*PAGE_LINES;
    return{start,end:Math.min(lines.length-1,start+PAGE_LINES-1)};
  }

  function pageEraseWindow(page){
    const next=lines[page.end+1];
    if(!next)return null;
    const nextStart=(Number(next.start)||0)+offset;
    const last=lines[page.end];
    const lastStart=(Number(last?.start)||0)+offset;
    const lastDur=Math.max(300,Number(last?.duration)||1200);
    const start=Math.max(lastStart+lastDur*.48,nextStart-2600);
    const end=Math.max(start+650,nextStart-260);
    return{start,end};
  }

  function revealOpacity(ms,w,charIndex,charCount){
    const write=wordWriteWindow(w);
    const spread=charCount<=1?0:(charIndex/(charCount-1))*Math.max(0,write-145);
    const at=(Number(w?.start)||0)+offset+spread;
    return ease((ms-at)/155);
  }

  function eraseOpacity(ms,page,lineIndex,wordIndex,charIndex){
    const win=pageEraseWindow(page);
    if(!win||ms<=win.start)return 1;
    if(ms>=win.end)return 0;
    const span=Math.max(1,win.end-win.start);
    const scatter=hash01(lineIndex,wordIndex,charIndex);
    const at=win.start+scatter*span*.58;
    const dur=Math.max(180,span*.38);
    return 1-ease((ms-at)/dur);
  }

  function applyEternal(ms){
    if(!active())return restorePlain();
    if(!Array.isArray(lines)||!lines.length)return;
    const lyrics=$('#lyrics');
    const story=$('#story');
    if(!lyrics||!story)return;

    story.dataset.eternalMotion='true';
    lyrics.classList.add('eternal-running');

    const i=typeof ci==='function'?ci(ms):0;
    const page=pageFor(i);
    const lineEls=[...lyrics.querySelectorAll('.apple-line[data-line]')];
    if(!lineEls.length)return;

    for(const lineEl of lineEls){
      const li=Number(lineEl.dataset.line);
      const inPage=li>=page.start&&li<=page.end;
      lineEl.style.setProperty('visibility',inPage?'visible':'hidden','important');
      if(!inPage)continue;

      const line=lines[li];
      const us=typeof units==='function'?units(line):[];
      const words=[...lineEl.querySelectorAll('.apple-word')];
      words.forEach((span,wi)=>{
        const w=us[wi]||{text:span.textContent,start:line.start,duration:line.duration};
        const chars=splitWord(span,w.text);
        chars.forEach((ch,ci2)=>{
          const reveal=revealOpacity(ms,w,ci2,chars.length);
          const erase=eraseOpacity(ms,page,li,wi,ci2);
          const o=clamp01(reveal*erase);
          const seed=hash01(li,wi,ci2);
          const entering=1-reveal;
          const leaving=1-erase;
          ch.style.setProperty('--es-o',o.toFixed(4));
          ch.style.setProperty('--es-blur',`${(entering*1.35+leaving*.85).toFixed(2)}px`);
          ch.style.setProperty('--es-y',`${(entering*1.8+leaving*(seed-.5)*1.1).toFixed(2)}px`);
          ch.style.setProperty('--es-r',`${((seed-.5)*(entering+leaving)*1.1).toFixed(2)}deg`);
          ch.style.setProperty('--es-s',(.985+.015*reveal-.012*leaving).toFixed(4));
        });
      });
    }
  }

  window.render=function(ms){
    const result=baseRender(ms);
    try{applyEternal(ms)}catch(err){console.warn('Eternal Sunshine effect fallback',err)}
    return result;
  };

  function tick(){
    raf=0;
    const a=$('#audio');
    if(!a||a.paused||!active())return;
    try{applyEternal(a.currentTime*1000)}catch{}
    raf=requestAnimationFrame(tick);
  }
  function ensureTick(){if(!raf&&active())raf=requestAnimationFrame(tick)}

  $('#audio')?.addEventListener('play',ensureTick);
  $('#audio')?.addEventListener('seeked',()=>{try{window.render?.($('#audio').currentTime*1000)}catch{}});
  document.addEventListener('change',e=>{
    if(['quickEffect','styleEffectSelect','lyricEffect'].includes(e.target?.id)){
      if(active()){
        document.fonts?.load?.('32px "Reenie Beanie"').catch(()=>{});
        setTimeout(()=>{try{window.invalidateLinaMotion?.(true);window.render?.((Number($('#audio')?.currentTime)||0)*1000);ensureTick()}catch{}},0);
      }else restorePlain();
    }
  });

  document.fonts?.load?.('32px "Reenie Beanie"').catch(()=>{});
  try{window.render?.((Number($('#audio')?.currentTime)||0)*1000)}catch{}
})();