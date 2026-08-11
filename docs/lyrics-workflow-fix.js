'use strict';
(()=>{
  const $=s=>document.querySelector(s);
  const sync=$('#syncMethod');
  if(!sync)return;

  sync.querySelectorAll('option').forEach(o=>{
    if(o.value==='pasteTimed'||o.value==='fileTimed')o.remove();
  });
  let search=sync.querySelector('option[value="search"]');
  if(!search){
    search=document.createElement('option');
    search.value='search';
    search.textContent='Find synced lyrics automatically';
    sync.prepend(search);
  }else search.textContent='Find synced lyrics automatically';

  let imported=sync.querySelector('option[value="importTimed"]');
  if(!imported){
    imported=document.createElement('option');
    imported.value='importTimed';
    imported.textContent='Import synced lyrics (paste or LRC / SRT / VTT)';
    search.after(imported);
  }
  const manual=sync.querySelector('option[value="manual"]');
  if(manual)manual.textContent='Paste plain lyrics + timestamp myself';

  const searchBox=$('#searchLyricsBox');
  const pasteBox=$('#pasteTimedBox');
  const fileBox=$('#fileTimedBox');
  const manualBox=$('#manualSyncBox');
  searchBox?.classList.remove('legacy-lookup-retired');

  function setVisible(el,on){
    if(!el)return;
    el.classList.toggle('hidden',!on);
    el.hidden=!on;
    el.setAttribute('aria-hidden',on?'false':'true');
  }
  function syncUI(){
    const v=sync.value;
    const lookupLivesInSetup=!!searchBox?.closest('[data-panel="setup"]');
    setVisible(searchBox,lookupLivesInSetup||v==='search');
    setVisible(pasteBox,v==='importTimed');
    setVisible(fileBox,v==='importTimed');
    setVisible(manualBox,v==='manual');
  }
  sync.addEventListener('change',()=>setTimeout(syncUI,0));

  if(sync.value==='pasteTimed'||sync.value==='fileTimed'||!['search','importTimed','manual'].includes(sync.value))sync.value='search';
  syncUI();

  const button=$('#findLyricsBtn');
  const status=$('#lyricsLookupStatus');
  if(!button)return;
  button.textContent='Find my synced lyrics';
  button.dataset.linaBound='lyrics-lookup-fix';

  const norm=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
  const score=(row,title,artist,album,duration)=>{
    let n=0;
    if(norm(row.trackName)===norm(title))n+=8;
    else if(norm(row.trackName).includes(norm(title))||norm(title).includes(norm(row.trackName)))n+=4;
    if(norm(row.artistName)===norm(artist))n+=6;
    else if(norm(row.artistName).includes(norm(artist))||norm(artist).includes(norm(row.artistName)))n+=3;
    if(album&&norm(row.albumName)===norm(album))n+=2;
    if(duration&&Number.isFinite(+row.duration))n+=Math.max(0,2-Math.abs(+row.duration-duration)/4);
    if(row.syncedLyrics)n+=5;
    return n;
  };

  button.addEventListener('click',async e=>{
    e.preventDefault();
    const title=$('#titleInput')?.value?.trim()||'';
    const artist=$('#artistInput')?.value?.trim()||'';
    const album=$('#albumInput')?.value?.trim()||'';
    const duration=Math.round(Number($('#audio')?.duration)||0);
    if(!title){if(status)status.textContent='Add the song title above first.';return;}

    button.disabled=true;
    if(status)status.textContent='Searching synced lyrics…';
    try{
      const p=new URLSearchParams({track_name:title});
      if(artist)p.set('artist_name',artist);
      if(album)p.set('album_name',album);
      const r=await fetch(`https://lrclib.net/api/search?${p.toString()}`,{cache:'no-store'});
      if(!r.ok)throw new Error(`Lyrics service returned ${r.status}`);
      const rows=await r.json();
      const choices=(Array.isArray(rows)?rows:[]).filter(x=>x?.syncedLyrics);
      if(!choices.length){if(status)status.textContent='No synced lyrics found for this track.';return;}
      choices.sort((a,b)=>score(b,title,artist,album,duration)-score(a,title,artist,album,duration));
      const best=choices[0];
      const text=$('#lyricsText');
      if(!text)throw new Error('Lyrics importer is unavailable.');
      text.value=best.syncedLyrics;
      $('#applyPaste')?.click();
      setTimeout(()=>{
        const confirm=$('#confirmReview');
        const review=$('#reviewBox');
        if(confirm&&review&&!review.classList.contains('hidden'))confirm.click();
      },0);
      if(status)status.textContent=`Synced lyrics loaded${best.artistName?` · ${best.artistName}`:''}.`;
    }catch(err){
      console.error('LINA lyric lookup failed',err);
      if(status)status.textContent='Could not find synced lyrics right now. You can still import an LRC file in Lyrics.';
    }finally{button.disabled=false;}
  });
})();
