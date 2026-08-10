'use strict';
(()=>{
  function text(id,value){const el=document.querySelector(id);if(el)el.textContent=value}
  function init(){
    document.documentElement.dataset.editorShell='v1';
    text('#transportPrevLine','Prev');
    text('#transportEdit','Edit');
    text('#transportSync','Sync');
    text('#transportNextLine','Next');
    document.querySelector('#transportPrevLine')?.setAttribute('aria-label','Previous lyric line');
    document.querySelector('#transportNextLine')?.setAttribute('aria-label','Next lyric line');
    const outputTitle=document.querySelector('.stage-export-head b');if(outputTitle)outputTitle.textContent='Output';
    const timelineTitle=document.querySelector('.right .panel:first-child>h2');if(timelineTitle)timelineTitle.textContent='Lyrics timeline';
    const lineTitle=document.querySelector('.right .panel:nth-child(2)>h2');if(lineTitle)lineTitle.textContent='Line inspector';
    const word=document.querySelector('#wordEditor')?.closest('.subsection');
    if(word&&!word.closest('.inspector-disclosure')){
      const details=document.createElement('details');details.className='inspector-disclosure';
      const summary=document.createElement('summary');summary.innerHTML='<span>Word emphasis</span><small>Optional</small>';
      word.parentNode.insertBefore(details,word);details.append(summary,word);
      const reveal=()=>{details.open=true};
      word.addEventListener('focusin',reveal);
    }
    const activeTool=()=>document.querySelector('.navbtn.active')?.dataset.tool||'setup';
    const sync=()=>document.documentElement.dataset.activeTool=activeTool();
    document.querySelector('#nav')?.addEventListener('click',()=>queueMicrotask(sync));
    sync();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
