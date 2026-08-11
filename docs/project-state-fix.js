'use strict';
(()=>{
  const $=s=>document.querySelector(s);

  function removeArtworkUI(){
    const track=$('.consolidated-track');
    if(track){
      track.querySelector('.track-art')?.remove();
      track.querySelector('label[for="userArtworkFile"]')?.remove();
      track.querySelector('#userArtworkFile')?.remove();
      const intro=$('#userArtworkIntro');
      intro?.closest('label')?.remove();
      track.querySelector('#artworkEmpty')?.remove();
      const fields=track.querySelector('.track-fields');
      if(fields){
        fields.classList.add('track-fields-no-artwork');
        const helper=fields.querySelector('.helper');
        if(helper)helper.textContent='Audio and lyrics stay user supplied.';
      }
    }
    $('#useArtworkBg2')?.closest('.subsection')?.remove();
  }

  function clearArtworkVisuals(){
    const intro=$('#introArt');
    if(intro){
      intro.removeAttribute('src');
      intro.classList.remove('on');
    }
    const preview=$('#userArtworkPreview');
    if(preview){
      preview.removeAttribute('src');
      preview.classList.remove('on');
    }
    if(typeof artworkObjectURL!=='undefined'&&artworkObjectURL?.startsWith?.('blob:')){
      try{URL.revokeObjectURL(artworkObjectURL)}catch{}
    }
    if(typeof artworkObjectURL!=='undefined')artworkObjectURL=null;
  }

  function clearProjectMemoryAndUI(){
    try{clearTimeout(autosaveTimer)}catch{}
    try{autosaveTimer=null}catch{}
    try{restoring=true}catch{}
    const autosave=$('#autosaveToggle');
    if(autosave)autosave.checked=false;

    try{sourceBase=[];sourceLines=[];reviewLines=[];lines=[];selected=0;offset=0;manualIndex=0;selectedSong=null}catch{}
    try{audioFile=null;manualBgFile=null}catch{}

    for(const id of ['songSearch','titleInput','artistInput','albumInput','lyricsText','manualLyricsText']){
      const el=$('#'+id);if(el)el.value='';
    }
    for(const id of ['pickedTitle','pickedArtist','pickedAlbum','titleName','titleArtist','titleAlbum']){
      const el=$('#'+id);if(el)el.textContent='';
    }
    $('#pickedSong')?.classList.add('hidden');
    $('#songUses')?.classList.add('hidden');
    if($('#song'))$('#song').textContent='Original audio';
    clearArtworkVisuals();

    try{
      if(audio){audio.pause();audio.removeAttribute('src');audio.load()}
    }catch{}
    try{setBgSource(null)}catch{}
  }

  removeArtworkUI();

  if(typeof restoreSavedProject==='function'){
    const baseRestore=restoreSavedProject;
    restoreSavedProject=async function(){
      const result=await baseRestore();
      removeArtworkUI();
      clearArtworkVisuals();
      try{await saveMedia('artwork',null)}catch{}
      return result;
    };
  }

  const reset=$('#resetBtn');
  reset?.addEventListener('click',async e=>{
    e.preventDefault();
    e.stopImmediatePropagation();
    clearProjectMemoryAndUI();
    try{localStorage.removeItem(SAVE_KEY)}catch{}
    try{await clearSavedMedia()}catch{}
    try{localStorage.removeItem(SAVE_KEY)}catch{}
    location.reload();
  },true);
})();
