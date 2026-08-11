'use strict';
(()=>{
  let attempts=0;

  function init(){
    attempts++;
    const track=document.querySelector('.consolidated-track');
    const grid=track?.querySelector('.track-grid');
    const showTitleInput=document.querySelector('#showTitle');
    const durationSelect=document.querySelector('#titleDuration');

    if(!track||!grid||!showTitleInput||!durationSelect){
      if(attempts<20)setTimeout(init,50);
      return;
    }

    let intro=grid.querySelector('.track-intro-settings');
    if(!intro){
      intro=document.createElement('div');
      intro.className='track-intro-settings';
      grid.append(intro);
    }

    const showTitle=showTitleInput.closest('label')||showTitleInput.parentElement;
    const duration=durationSelect.closest('label')||durationSelect.parentElement;

    if(showTitle&&showTitle.parentElement!==intro){
      const label=showTitle.querySelector('span');
      if(label)label.textContent='Show title + artist at start';
      intro.append(showTitle);
    }
    if(duration&&duration.parentElement!==intro)intro.append(duration);

    const retired=document.querySelector('#songSearch')?.closest('.subsection');
    retired?.classList.add('legacy-lookup-retired');

    const repaired=!!intro.querySelector('#showTitle')&&!!intro.querySelector('#titleDuration');
    if(repaired){
      document.documentElement.dataset.setupStructure='v3';
      return;
    }
    if(attempts<20)setTimeout(init,50);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(init),{once:true});
  else requestAnimationFrame(init);
})();
