'use strict';
(()=>{
  const $=s=>document.querySelector(s);
  const clamp01=x=>Math.max(0,Math.min(1,x));
  const ease=x=>{x=clamp01(x);return x*x*(3-2*x)};
  const hash01=(a,b,c)=>{let x=((a+1)*73856093)^((b+1)*19349663)^((c+1)*83492791);x=(x^(x>>>13))*1274126177;return((x^(x>>>16))>>>0)/4294967295};

  function selectedCount(){
    const value=$('#contextMode')?.value||'5';
    if(value==='current')return 1;
    return Math.max(1,Math.min(9,Number(value)||5));
  }

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
    $('#story')?.removeAttribute('data-eternal-motion');
  }

  function wordWriteWindow(w){
    const d=Math.max(90,Number(w?.duration)||260);
    return Math.max(220,Math.min(900,d*.78));
  }

  function pageFor(i){
    const count=selectedCount();
    const start=Math.floor(Math.max(0,i)/count)*count;
    return{start,end:Math.min(lines.length-1,start+count-1),count};
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

  function handwritingState(ms,w,charIndex,charCount){
    const write=wordWriteWindow(w);
    const spread=charCount<=1?0:(charIndex/(charCount-1))*Math.max(0,write-210);
    const at=(Number(w?.start)||0)+offset+spread;
    return{ink:ease((ms-at)/210),opacity:ease((ms-at)/145)};
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
    if(!Array.isArray(lines)||!lines.length)return;
    const lyrics=$('#lyrics'),story=$('#story');
    if(!lyrics||!story)return;

    story.dataset.eternalMotion='handwriting';
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
          const hand=handwritingState(ms,w,ci2,chars.length);
          const erase=eraseOpacity(ms,page,li,wi,ci2);
          const seed=hash01(li,wi,ci2),entering=1-hand.ink,leaving=1-erase;
          ch.style.setProperty('--es-ink',`${(hand.ink*100).toFixed(2)}%`);
          ch.style.setProperty('--es-o',clamp01(hand.opacity*erase).toFixed(4));
          ch.style.setProperty('--es-blur',`${(entering*.72+leaving*.65).toFixed(2)}px`);
          ch.style.setProperty('--es-y',`${(entering*.55+leaving*(seed-.5)*.8).toFixed(2)}px`);
          ch.style.setProperty('--es-r',`${((seed-.5)*(entering+leaving)*.55).toFixed(2)}deg`);
          ch.style.setProperty('--es-s',(.992+.008*hand.ink-.008*leaving).toFixed(4));
        });
      });
    }
  }

  document.fonts?.load?.('32px "Reenie Beanie"').catch(()=>{});
  window.linaEternalSunshine={apply:applyEternal,restore:restorePlain,selectedCount};
  document.documentElement.dataset.eternalEnhancer='ready';
})();
