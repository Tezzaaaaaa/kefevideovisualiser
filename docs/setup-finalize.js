'use strict';
(()=>{
  const setup=document.querySelector('[data-panel="setup"] .body');
  const track=document.querySelector('.consolidated-track');
  const grid=track?.querySelector('.track-grid');
  if(!setup||!track||!grid)return;

  /* Audio is the first thing a user does in Setup. */
  const audioSection=document.querySelector('#audioFile')?.closest('.subsection');
  if(audioSection)setup.prepend(audioSection);

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

  /* Artwork is retired everywhere in the active product. */
  const removeNode=(selector,wrapperSelector)=>{
    document.querySelectorAll(selector).forEach(el=>{
      const wrapper=wrapperSelector?el.closest(wrapperSelector):null;
      (wrapper||el).remove();
    });
  };
  removeNode('.track-art');
  removeNode('label[for="userArtworkFile"]');
  removeNode('#userArtworkFile');
  removeNode('#userArtworkPreview');
  removeNode('#artworkEmpty');
  removeNode('#userArtworkIntro','label');
  removeNode('#showArtworkIntro','label');
  removeNode('#useArtworkBg','label');
  removeNode('#useArtworkBg2','label');
  removeNode('#pickedArt');
  removeNode('#introArt');

  document.querySelectorAll('[data-panel="background"] .subsection').forEach(section=>{
    const text=(section.textContent||'').toLowerCase();
    if(text.includes('selected artwork')||text.includes('album/single artwork'))section.remove();
  });

  const fields=track.querySelector('.track-fields');
  if(fields){
    fields.classList.add('track-fields-no-artwork');
    const helper=fields.querySelector('.helper');
    if(helper){
      helper.textContent='Audio and lyrics stay user supplied.';
      if(helper.parentElement!==intro)intro.append(helper);
    }
  }

  try{
    if(typeof artworkObjectURL!=='undefined'&&artworkObjectURL?.startsWith?.('blob:'))URL.revokeObjectURL(artworkObjectURL);
    if(typeof artworkObjectURL!=='undefined')artworkObjectURL=null;
  }catch{}
  try{if(typeof saveMedia==='function')saveMedia('artwork',null)}catch{}

  const noArtwork=!document.querySelector('#userArtworkFile,#userArtworkIntro,#showArtworkIntro,#useArtworkBg,#useArtworkBg2,#pickedArt,#introArt');
  if(intro.querySelector('#showTitle')&&intro.querySelector('#titleDuration')&&noArtwork){
    document.documentElement.dataset.setupStructure='v6';
    document.documentElement.dataset.artworkRetired='true';
  }
  document.documentElement.dataset.setupAudioFirst=audioSection&&setup.firstElementChild===audioSection?'true':'false';
})();
