'use strict';
(()=>{
  const $=s=>document.querySelector(s);

  function moveLookup(){
    const setup=$('[data-panel="setup"] .body');
    const searchBox=$('#searchLyricsBox');
    const sync=$('#syncMethod');
    if(!setup||!searchBox||!sync)return false;

    let section=$('#setupLyricsLookup');
    if(!section){
      section=document.createElement('div');
      section.id='setupLyricsLookup';
      section.className='subsection setup-shell-section setup-lyrics-lookup';
      section.innerHTML='<div class="subhead"><b>3. Find synced lyrics</b><span>Recommended</span></div>';
      const flow=setup.querySelector(':scope > .flow-controls');
      if(flow)setup.insertBefore(section,flow);else setup.append(section);
    }

    if(searchBox.parentElement!==section)section.append(searchBox);
    searchBox.classList.remove('hidden');
    searchBox.hidden=false;
    searchBox.setAttribute('aria-hidden','false');

    const button=$('#findLyricsBtn');
    if(button)button.textContent='Find my synced lyrics';

    const guide=$('[data-panel="setup"] .step-guide');
    if(guide){
      const title=guide.querySelector('b');
      const text=guide.querySelector('span');
      if(title)title.textContent='Start with the song';
      if(text)text.textContent='1. Add the audio. 2. Check the song details beside it. 3. Find the synced lyrics below.';
    }

    const sections=[...setup.querySelectorAll('.setup-shell-section')];
    const setHead=(el,title,meta)=>{
      const head=el?.querySelector(':scope > .subhead');
      if(head?.querySelector('b'))head.querySelector('b').textContent=title;
      if(head?.querySelector('span'))head.querySelector('span').textContent=meta;
    };
    setHead(sections.find(x=>x!==section&&/audio/i.test(x.textContent||'')),'1. Add audio','Required');
    const detail=sections.find(x=>x!==section&&(/track details/i.test(x.textContent||'')||/song details/i.test(x.textContent||'')));
    setHead(detail,'2. Check song details','Used for lyrics search');

    const searchOption=sync.querySelector('option[value="search"]');
    if(searchOption){searchOption.hidden=true;searchOption.disabled=true;}
    if(sync.value==='search'||!['importTimed','manual'].includes(sync.value)){
      sync.value='importTimed';
      sync.dispatchEvent(new Event('change',{bubbles:true}));
    }

    const lyricsPanel=$('[data-panel="lyrics"]');
    const lyricsGuide=lyricsPanel?.querySelector('.step-guide');
    if(lyricsGuide){
      const title=lyricsGuide.querySelector('b');
      const text=lyricsGuide.querySelector('span');
      if(title)title.textContent='Other ways to add lyrics';
      if(text)text.textContent='Use this section only when automatic synced-lyric search in Setup does not give you what you need.';
    }
    const other=$('.other-lyrics-methods');
    const summary=other?.querySelector(':scope > summary');
    if(summary)summary.textContent='Import synced lyrics or time them manually';
    const source=sync.closest('.subsection');
    if(source){
      const head=source.querySelector(':scope > .subhead');
      if(head?.querySelector('b'))head.querySelector('b').textContent='Add lyrics another way';
      if(head?.querySelector('span'))head.querySelector('span').textContent='Optional';
    }

    document.documentElement.dataset.setupLyricsBridge='ready';
    return true;
  }

  function init(){
    let tries=0;
    const run=()=>{tries++;if(!moveLookup()&&tries<50)setTimeout(run,60)};
    run();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
