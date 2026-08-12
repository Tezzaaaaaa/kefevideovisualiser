'use strict';
(()=>{
  const $=s=>document.querySelector(s);
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const PROJECT_KEY='lina.project.v2';
  const MEDIA_DB='lina-project-media';
  const RESET_MARK='lina.full-reset.pending';
  let resetting=false;

  function removeTrackArtwork(){
    const track=$('.consolidated-track');
    if(!track)return;
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

  function clearArtworkVisuals(){
    const intro=$('#introArt');
    if(intro){intro.removeAttribute('src');intro.classList.remove('on')}
    const preview=$('#userArtworkPreview');
    if(preview){preview.removeAttribute('src');preview.classList.remove('on')}
    try{if(typeof artworkObjectURL!=='undefined'&&artworkObjectURL?.startsWith?.('blob:'))URL.revokeObjectURL(artworkObjectURL)}catch{}
    try{if(typeof artworkObjectURL!=='undefined')artworkObjectURL=null}catch{}
  }

  function clearLinaStorage(){
    try{
      for(let i=localStorage.length-1;i>=0;i--){
        const key=localStorage.key(i);
        if(key&&(key===PROJECT_KEY||key.startsWith('lina.')))localStorage.removeItem(key);
      }
      localStorage.removeItem(PROJECT_KEY);
    }catch{}
  }

  function clearProjectMemoryAndUI(){
    try{clearTimeout(autosaveTimer);autosaveTimer=null}catch{}
    try{restoring=true}catch{}
    const autosave=$('#autosaveToggle');if(autosave)autosave.checked=false;

    try{sourceBase=[];sourceLines=[];reviewLines=[];lines=[];selected=0;offset=0;manualIndex=0;selectedSong=null}catch{}
    try{audioFile=null;manualBgFile=null}catch{}

    for(const id of ['songSearch','titleInput','artistInput','albumInput','lyricsText','manualLyricsText']){const el=$('#'+id);if(el)el.value=''}
    for(const id of ['pickedTitle','pickedArtist','pickedAlbum','titleName','titleArtist','titleAlbum']){const el=$('#'+id);if(el)el.textContent=''}
    $('#pickedSong')?.classList.add('hidden');
    $('#songUses')?.classList.add('hidden');
    if($('#song'))$('#song').textContent='Original audio';
    clearArtworkVisuals();

    try{if(audio){audio.pause();audio.removeAttribute('src');audio.load()}}catch{}
    try{setBgSource(null)}catch{}
  }

  function deleteMediaDatabase(){
    return new Promise(resolve=>{
      if(!('indexedDB' in window)){resolve();return}
      let done=false;
      const finish=()=>{if(done)return;done=true;resolve()};
      try{
        const req=indexedDB.deleteDatabase(MEDIA_DB);
        req.onsuccess=finish;req.onerror=finish;req.onblocked=finish;
        setTimeout(finish,800);
      }catch{finish()}
    });
  }

  async function hardResetProject(){
    if(resetting)return;
    resetting=true;
    const visible=$('#resetProjectVisible');
    if(visible){visible.disabled=true;visible.textContent='Resetting…'}

    try{sessionStorage.setItem(RESET_MARK,'1')}catch{}
    clearProjectMemoryAndUI();
    clearLinaStorage();
    await Promise.race([deleteMediaDatabase(),wait(900)]);
    clearLinaStorage();

    const clean=`${location.pathname}?reset=1&nonce=${Date.now()}`;
    location.replace(clean);
  }

  const pending=(()=>{try{return sessionStorage.getItem(RESET_MARK)==='1'}catch{return false}})();
  if(pending){
    clearLinaStorage();
    window.linaResetCleanupPromise=deleteMediaDatabase().finally(()=>{try{sessionStorage.removeItem(RESET_MARK)}catch{}});
  }else{
    window.linaResetCleanupPromise=Promise.resolve();
  }

  removeTrackArtwork();

  if(typeof restoreSavedProject==='function'){
    const baseRestore=restoreSavedProject;
    restoreSavedProject=async function(){
      await window.linaResetCleanupPromise;
      if(window.LINA_FRESH_RESET){
        clearProjectMemoryAndUI();
        clearLinaStorage();
        await deleteMediaDatabase();
        try{restoring=false}catch{}
        removeTrackArtwork();
        clearArtworkVisuals();
        return false;
      }
      const result=await baseRestore();
      removeTrackArtwork();
      clearArtworkVisuals();
      try{await saveMedia('artwork',null)}catch{}
      return result;
    };
  }

  window.linaResetProject=hardResetProject;
  document.addEventListener('click',event=>{
    const reset=event.target.closest?.('#resetProjectVisible');
    if(!reset)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    hardResetProject();
  },true);
  document.documentElement.dataset.projectResetOwner='hard-v2';
})();
