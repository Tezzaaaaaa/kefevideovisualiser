'use strict';
(()=>{
  let attempts=0;

  function init(){
    attempts++;
    const track=document.querySelector('.consolidated-track');
    const grid=track?.querySelector('.track-grid');
    const fields=track?.querySelector('.track-fields');
    const showTitleInput=document.querySelector('#showTitle');
    const durationSelect=document.querySelector('#titleDuration');
    const artworkIntroInput=document.querySelector('#userArtworkIntro');

    if(!track||!grid||!fields||!showTitleInput||!durationSelect||!artworkIntroInput){
      if(attempts<30)setTimeout(init,50);
      return;
    }

    let intro=grid.querySelector('.track-intro-settings');
    if(!intro){
      intro=document.createElement('div');
      intro.className='track-intro-settings';
      grid.append(intro);
    }

    const artworkIntro=artworkIntroInput.closest('label')||artworkIntroInput.parentElement;
    const showTitle=showTitleInput.closest('label')||showTitleInput.parentElement;
    const duration=durationSelect.closest('label')||durationSelect.parentElement;
    const helper=fields.querySelector('.helper');

    if(artworkIntro&&artworkIntro.parentElement!==intro)intro.append(artworkIntro);
    if(showTitle&&showTitle.parentElement!==intro){
      const label=showTitle.querySelector('span');
      if(label)label.textContent='Show title + artist at start';
      intro.append(showTitle);
    }
    if(duration&&duration.parentElement!==intro)intro.append(duration);
    if(helper&&helper.parentElement!==intro)intro.append(helper);

    const retired=document.querySelector('#songSearch')?.closest('.subsection');
    retired?.classList.add('legacy-lookup-retired');

    const repaired=
      !!intro.querySelector('#userArtworkIntro')&&
      !!intro.querySelector('#showTitle')&&
      !!intro.querySelector('#titleDuration');

    if(repaired){
      document.documentElement.dataset.setupStructure='v4';
      return;
    }
    if(attempts<30)setTimeout(init,50);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(init),{once:true});
  else requestAnimationFrame(init);
})();
