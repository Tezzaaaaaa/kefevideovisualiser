// LINA preview-audio guard. Keeps the song audible while background video remains muted.
(function(){
  const audio=document.querySelector('#audio');
  const play=document.querySelector('#play');
  if(!audio||!play)return;

  function ensureAudible(){
    audio.defaultMuted=false;
    audio.muted=false;
    if(!Number.isFinite(audio.volume)||audio.volume<=0)audio.volume=1;
  }

  ensureAudible();

  audio.addEventListener('loadedmetadata',ensureAudible);
  audio.addEventListener('loadeddata',ensureAudible);
  audio.addEventListener('canplay',ensureAudible);
  audio.addEventListener('play',ensureAudible);
  audio.addEventListener('volumechange',()=>{
    if(audio.muted||audio.volume===0){
      audio.muted=false;
      audio.volume=1;
    }
  });

  // Run before the existing play handler so browser playback always starts unmuted.
  play.addEventListener('pointerdown',ensureAudible,{capture:true});
  play.addEventListener('click',ensureAudible,{capture:true});

  // File restores/uploads can replace the media source; re-assert audibility afterwards.
  const srcObserver=new MutationObserver(ensureAudible);
  srcObserver.observe(audio,{attributes:true,attributeFilter:['src','muted']});
})();
