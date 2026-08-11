'use strict';
(()=>{
  const track=document.querySelector('.consolidated-track');
  const grid=track?.querySelector('.track-grid');
  if(!track||!grid)return;

  let intro=grid.querySelector('.track-intro-settings');
  if(!intro){
    intro=document.createElement('div');
    intro.className='track-intro-settings';
    grid.append(intro);
  }

  const showTitle=document.querySelector('#showTitle')?.closest('label');
  const titleDuration=document.querySelector('#titleDuration')?.closest('label');
  if(showTitle&&showTitle.parentElement!==intro)intro.append(showTitle);
  if(titleDuration&&titleDuration.parentElement!==intro)intro.append(titleDuration);

  track.querySelector('.track-art')?.remove();
  track.querySelector('label[for="userArtworkFile"]')?.remove();
  track.querySelector('#userArtworkFile')?.remove();
  document.querySelector('#userArtworkIntro')?.closest('label')?.remove();

  const fields=track.querySelector('.track-fields');
  if(fields){
    fields.classList.add('track-fields-no-artwork');
    const helper=fields.querySelector('.helper');
    if(helper){
      helper.textContent='Audio and lyrics stay user supplied.';
      if(helper.parentElement!==intro)intro.append(helper);
    }
  }

  if(
    intro.querySelector('#showTitle')&&
    intro.querySelector('#titleDuration')&&
    !track.querySelector('#userArtworkFile')&&
    !track.querySelector('#userArtworkIntro')
  )document.documentElement.dataset.setupStructure='v5';
})();
