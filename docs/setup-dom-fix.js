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

    if(!track||!grid||!fields||!showTitleInput||!durationSelect){
      if(attempts<30)setTimeout(init,50);
      return;
    }

    track.querySelector('.track-art')?.remove();
    track.querySelector('label[for="userArtworkFile"]')?.remove();
    track.querySelector('#userArtworkFile')?.remove();
    const artworkIntroInput=document.querySelector('#userArtworkIntro');
    artworkIntroInput?.closest('label')?.remove();
    fields.classList.add('track-fields-no-artwork');

    let intro=grid.querySelector('.track-intro-settings');
    if(!intro){
      intro=document.createElement('div');
      intro.className='track-intro-settings';
      grid.append(intro);
    }

    const showTitle=showTitleInput.closest('label')||showTitleInput.parentElement;
    const duration=durationSelect.closest('label')||durationSelect.parentElement;
    const helper=fields.querySelector('.helper');

    if(showTitle&&showTitle.parentElement!==intro){
      const label=showTitle.querySelector('span');
      if(label)label.textContent='Show title + artist at start';
      intro.append(showTitle);
    }
    if(duration&&duration.parentElement!==intro)intro.append(duration);
    if(helper){
      helper.textContent='Audio and lyrics stay user supplied.';
      if(helper.parentElement!==intro)intro.append(helper);
    }

    const retired=document.querySelector('#songSearch')?.closest('.subsection');
    retired?.classList.add('legacy-lookup-retired');

    const repaired=
      !!intro.querySelector('#showTitle')&&
      !!intro.querySelector('#titleDuration')&&
      !track.querySelector('#userArtworkFile')&&
      !track.querySelector('#userArtworkIntro');

    if(repaired){
      document.documentElement.dataset.setupStructure='v5';
      return;
    }
    if(attempts<30)setTimeout(init,50);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(init),{once:true});
  else requestAnimationFrame(init);
})();
