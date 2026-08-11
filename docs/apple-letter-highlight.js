'use strict';
(()=>{
  const $=s=>document.querySelector(s);
  const clamp01=x=>Math.max(0,Math.min(1,Number(x)||0));
  const ease=x=>{x=clamp01(x);return x*x*(3-2*x)};

  const active=()=>{
    const effect=$('#quickEffect')?.value||$('#styleEffectSelect')?.value||$('#lyricEffect')?.value||$('#story')?.dataset.lyricEffect||'apple';
    return effect==='apple';
  };

  function splitLetters(span,text){
    const raw=String(text??'');
    if(span.dataset.appleLetterText===raw&&span.querySelector('.apple-char'))return [...span.querySelectorAll(':scope > .apple-char')];
    span.dataset.appleLetterText=raw;
    span.textContent='';
    return [...raw].map((ch,i)=>{
      const el=document.createElement('span');
      el.className='apple-char';
      el.dataset.char=String(i);
      el.textContent=ch;
      span.append(el);
      return el;
    });
  }

  function restorePlain(){
    document.querySelectorAll('.apple-word[data-apple-letter-text]').forEach(span=>{
      if(span.querySelector(':scope > .apple-char'))span.textContent=span.dataset.appleLetterText||'';
      delete span.dataset.appleLetterText;
      span.classList.remove('apple-word-active');
      span.style.removeProperty('--apple-word-presence');
    });
  }

  function applyLetters(ms){
    if(!active())return restorePlain();
    const story=$('#story');
    if(story)story.dataset.lyricEffect='apple';
    const allLines=window.lines||lines;
    if(!Array.isArray(allLines)||!allLines.length)return;
    const glowSetting=Math.max(0,Math.min(1,(Number($('#glow')?.value)||0)/100));

    document.querySelectorAll('.apple-line[data-line]').forEach(lineEl=>{
      const li=Number(lineEl.dataset.line);
      const line=allLines[li];
      if(!line)return;
      const timed=typeof units==='function'?units(line):(line.words||[]);
      const words=[...lineEl.querySelectorAll(':scope > .apple-word')];

      words.forEach((span,wi)=>{
        const w=timed[wi]||{text:span.dataset.appleLetterText||span.textContent,start:line.start,duration:line.duration};
        const chars=splitLetters(span,w.text);
        const m=typeof wordMotion==='function'?wordMotion(line,w,ms):{raw:0,progress:0,presence:0};
        const sweep=clamp01(m.progress);
        const count=Math.max(1,chars.length);
        const cell=1/count;
        const presence=clamp01(m.presence??m.pulse??0);
        span.classList.toggle('apple-word-active',presence>.035&&Number(m.raw)>0&&Number(m.raw)<1);
        span.style.setProperty('--apple-word-presence',presence.toFixed(4));

        chars.forEach((ch,ci)=>{
          const start=ci/count;
          const local=ease((sweep-start)/Math.max(.001,cell*.92));
          const centre=(ci+.5)/count;
          const distance=Math.abs(sweep-centre)/Math.max(.001,cell);
          const focus=ease(1-clamp01(distance));
          const pulse=focus*presence;
          const scale=1+.032*pulse;
          const rise=-.78*pulse;
          const bright=1+.18*pulse;
          const halo=(.35+2.2*pulse)*glowSetting;
          const haloAlpha=(.02+.14*pulse)*glowSetting;
          ch.style.setProperty('--apple-char-ink',`${(local*100).toFixed(2)}%`);
          ch.style.setProperty('--apple-char-scale',scale.toFixed(4));
          ch.style.setProperty('--apple-char-rise',`${rise.toFixed(3)}px`);
          ch.style.setProperty('--apple-char-bright',bright.toFixed(3));
          ch.style.setProperty('--apple-char-halo',`${halo.toFixed(2)}px`);
          ch.style.setProperty('--apple-char-halo-alpha',haloAlpha.toFixed(3));
        });
      });
    });
  }

  const baseRender=window.render;
  if(typeof baseRender==='function'){
    window.render=function(ms){
      const result=baseRender(ms);
      try{applyLetters(ms)}catch(err){console.warn('LINA Apple letter highlight fallback',err)}
      return result;
    };
  }

  let raf=0;
  function tick(){
    raf=0;
    const audio=$('#audio');
    if(!audio||audio.paused||!active())return;
    try{applyLetters(audio.currentTime*1000)}catch{}
    raf=requestAnimationFrame(tick);
  }
  function ensureTick(){if(!raf&&active())raf=requestAnimationFrame(tick)}

  $('#audio')?.addEventListener('play',ensureTick);
  $('#audio')?.addEventListener('seeked',()=>{try{applyLetters((Number($('#audio')?.currentTime)||0)*1000)}catch{}});
  document.addEventListener('change',e=>{
    if(['quickEffect','styleEffectSelect','lyricEffect'].includes(e.target?.id)){
      if(active())setTimeout(()=>{try{window.invalidateLinaMotion?.(true);window.render?.((Number($('#audio')?.currentTime)||0)*1000);ensureTick()}catch{}},0);
      else restorePlain();
    }
  });

  try{applyLetters((Number($('#audio')?.currentTime)||0)*1000)}catch{}
  window.linaAppleLetterHighlight={apply:applyLetters,restore:restorePlain};
})();
