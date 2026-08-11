'use strict';
(()=>{
  function init(){
    const track=document.querySelector('.consolidated-track');
    const grid=track?.querySelector('.track-grid');
    if(!track||!grid||grid.querySelector('.track-intro-settings'))return;

    const intro=document.createElement('div');
    intro.className='track-intro-settings';

    const showTitle=document.querySelector('#showTitle')?.closest('.toggle');
    const duration=document.querySelector('#titleDuration')?.closest('.field');

    if(showTitle){
      const label=showTitle.querySelector('span');
      if(label)label.textContent='Show title + artist at start';
      intro.append(showTitle);
    }
    if(duration)intro.append(duration);

    if(intro.children.length)grid.append(intro);

    /* The old song-search container is retired; no empty layout space should remain. */
    const retired=document.querySelector('#songSearch')?.closest('.subsection');
    retired?.classList.add('legacy-lookup-retired');

    document.documentElement.dataset.setupStructure='v2';
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
